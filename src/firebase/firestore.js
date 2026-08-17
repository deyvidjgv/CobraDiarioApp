import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  runTransaction,
} from "firebase/firestore";
import { db } from "./config";

// ─── Referencias ───────────────────────────────────────────────

export function orgRef(orgId) {
  return doc(db, "organizations", orgId);
}

export function subCollection(orgId, sub) {
  return collection(db, "organizations", orgId, sub);
}

export function documentRef(orgId, sub, docId) {
  return doc(db, "organizations", orgId, sub, docId);
}

export function getBatch() {
  return writeBatch(db);
}

/** Referencia a un documento nuevo (ID autogenerado) sin escribirlo todavía — para usar dentro de un batch/transacción */
export function newDocRef(orgId, sub) {
  return doc(subCollection(orgId, sub));
}

/**
 * Lee-y-escribe atómico: evita la condición de carrera de leer un
 * documento con getDocument y escribirlo después con updateDocument por
 * separado (dos cobros casi simultáneos podrían pisarse el saldo).
 */
export async function runInTransaction(updater) {
  return runTransaction(db, updater);
}

export async function txGet(transaction, ref) {
  const snap = await transaction.get(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** set/update sanitizados, válidos tanto dentro de un WriteBatch como de una Transaction (misma API) */
export function wSet(writer, ref, data) {
  writer.set(ref, { ...sanitizeFirestoreData(data), createdAt: serverTimestamp() });
}
export function wUpdate(writer, ref, data) {
  writer.update(ref, { ...sanitizeFirestoreData(data), updatedAt: serverTimestamp() });
}

// ─── CRUD genérico ─────────────────────────────────────────────

function sanitizeFirestoreData(value) {
  if (value === undefined) {
    return null;
  }
  if (value === null) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeFirestoreData);
  }
  if (typeof value === "object" && !(value instanceof Date) && !(value instanceof Timestamp)) {
    return Object.entries(value).reduce((acc, [key, fieldValue]) => {
      const sanitized = sanitizeFirestoreData(fieldValue);
      if (sanitized !== undefined) {
        acc[key] = sanitized;
      }
      return acc;
    }, {});
  }
  return value;
}

export async function addDocument(orgId, sub, data) {
  const ref = subCollection(orgId, sub);
  const sanitizedData = sanitizeFirestoreData(data);
  return addDoc(ref, { ...sanitizedData, createdAt: serverTimestamp() });
}

export async function setDocument(orgId, sub, docId, data) {
  const ref = doc(db, "organizations", orgId, sub, docId);
  const sanitizedData = sanitizeFirestoreData(data);
  return setDoc(ref, { ...sanitizedData, updatedAt: serverTimestamp() }, { merge: true });
}

export async function updateDocument(orgId, sub, docId, data) {
  const ref = doc(db, "organizations", orgId, sub, docId);
  const sanitizedData = sanitizeFirestoreData(data);
  return updateDoc(ref, { ...sanitizedData, updatedAt: serverTimestamp() });
}

export async function removeDocument(orgId, sub, docId) {
  const ref = doc(db, "organizations", orgId, sub, docId);
  return deleteDoc(ref);
}

// Alias semántico (igual que removeDocument)
export const deleteDocument = removeDocument;


export async function getDocument(orgId, sub, docId) {
  const ref = doc(db, "organizations", orgId, sub, docId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ─── Listeners en tiempo real ──────────────────────────────────

export function subscribeToCollection(orgId, sub, constraints, callback) {
  const ref = subCollection(orgId, sub);
  const q = constraints.length ? query(ref, ...constraints) : ref;
  return onSnapshot(
    q,
    (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(docs);
    },
    // Un listener negado por reglas no debe quedar como error no capturado
    // sin contexto: se registra con la colección para poder diagnosticarlo.
    (err) => console.warn(`[listener:${sub}]`, err.code, err.message)
  );
}

// ─── Roles: userIndex + miembros de la organización ────────────

export function userIndexRef(uid) {
  return doc(db, "userIndex", uid);
}

export async function getUserIndex(uid) {
  const snap = await getDoc(userIndexRef(uid));
  return snap.exists() ? snap.data() : null;
}

export async function getOrgUser(orgId, uid) {
  return getDocument(orgId, "users", uid);
}

/**
 * Crea userIndex/{uid} y organizations/{uid}/users/{uid} con role "admin".
 * Reproduce el comportamiento actual (1 usuario = dueño total de su org)
 * expresado con el modelo de roles, para usuarios que ya existían antes
 * de introducir userIndex.
 */
export async function bootstrapAdminUser(uid, { email, nombre }) {
  const batch = getBatch();
  batch.set(userIndexRef(uid), {
    organizationId: uid,
    role: "admin",
  });
  batch.set(documentRef(uid, "users", uid), {
    uid,
    email: email ?? null,
    nombre: nombre ?? "",
    role: "admin",
    estado: "activo",
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
  return { organizationId: uid, role: "admin" };
}

/**
 * Registra en Firestore a un cobradiario ya creado en Firebase Auth
 * (ver secondaryAuth.js): userIndex/{uid} + organizations/{orgId}/users/{uid}
 * con role "cobradiario". Lo ejecuta el Admin (sesión principal), quien
 * es el único autorizado por las reglas a escribir estos documentos para
 * un uid que no es el suyo.
 */
export async function registerCobradiarioMember(orgId, uid, { email, nombre, cedula, celular, createdBy }) {
  const batch = getBatch();
  batch.set(userIndexRef(uid), {
    organizationId: orgId,
    role: "cobradiario",
  });
  batch.set(documentRef(orgId, "users", uid), {
    uid,
    email: email ?? null,
    nombre: nombre ?? "",
    cedula: cedula ?? "",
    celular: celular ?? "",
    role: "cobradiario",
    estado: "activo",
    createdBy,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

// ─── Settings (documento único por org) ────────────────────────

export async function getSettings(orgId) {
  return getDocument(orgId, "settings", "default");
}

export async function saveSettings(orgId, data) {
  return setDocument(orgId, "settings", "default", data);
}

// ─── Helpers de fecha ──────────────────────────────────────────

// toDate vive en logic/dateUtils (única implementación, maneja strings
// "YYYY-MM-DD" sin desfases UTC); se re-exporta aquí por comodidad.
export { toDate } from "../logic/dateUtils";

/** Rango de Timestamps de un día completo (para queries) */
export function dayRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: Timestamp.fromDate(start), end: Timestamp.fromDate(end) };
}
