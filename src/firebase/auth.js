import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { auth } from "./config";

// El uid que Firebase asigna al crear la cuenta ES el orgId de esa
// organizacion (ver firestore.rules) - no hace falta generar otro id.

export function registrarCobrador(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function iniciarSesion(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function cerrarSesion() {
  return signOut(auth);
}

export function escucharSesion(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function verificarPassword(password) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("No hay usuario autenticado");
  const credential = EmailAuthProvider.credential(user.email, password);
  return reauthenticateWithCredential(user, credential);
}

