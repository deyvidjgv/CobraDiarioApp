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
  return onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(docs);
  });
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

// ─── Settings (documento único por org) ────────────────────────

export async function getSettings(orgId) {
  return getDocument(orgId, "settings", "default");
}

export async function saveSettings(orgId, data) {
  return setDocument(orgId, "settings", "default", data);
}

// ─── Helpers de fecha ──────────────────────────────────────────

/** Convierte cualquier valor (Timestamp, Date, string) a Date JS */
export function toDate(val) {
  if (!val) return new Date();
  if (val.toDate) return val.toDate(); // Firestore Timestamp
  if (val instanceof Date) return val;
  return new Date(val);
}

/** Rango de Timestamps de un día completo (para queries) */
export function dayRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: Timestamp.fromDate(start), end: Timestamp.fromDate(end) };
}
