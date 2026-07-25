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
} from "firebase/firestore";
import { db } from "./config";

// ─── Referencias ───────────────────────────────────────────────

export function orgRef(orgId) {
  return doc(db, "organizations", orgId);
}

export function subCollection(orgId, sub) {
  return collection(db, "organizations", orgId, sub);
}

// ─── CRUD genérico ─────────────────────────────────────────────

export async function addDocument(orgId, sub, data) {
  const ref = subCollection(orgId, sub);
  return addDoc(ref, { ...data, createdAt: serverTimestamp() });
}

export async function setDocument(orgId, sub, docId, data) {
  const ref = doc(db, "organizations", orgId, sub, docId);
  return setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export async function updateDocument(orgId, sub, docId, data) {
  const ref = doc(db, "organizations", orgId, sub, docId);
  return updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function removeDocument(orgId, sub, docId) {
  const ref = doc(db, "organizations", orgId, sub, docId);
  return deleteDoc(ref);
}

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
