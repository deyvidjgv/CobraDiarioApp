import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile,
  updatePassword,
} from "firebase/auth";
import { auth } from "./config";

// El uid que Firebase asigna al crear la cuenta ES el orgId de esa
// organizacion (ver firestore.rules) - no hace falta generar otro id.

export async function registrarCobrador(email, password, displayName = "") {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(userCredential.user, { displayName });
  }
  return userCredential;
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

/**
 * Cambia la contraseña del usuario en sesión. Firebase exige
 * reautenticación reciente: se pide la contraseña actual, se verifica
 * y luego se actualiza (Panel de Seguridad, Configuración).
 */
export async function cambiarPassword(actual, nueva) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("No hay usuario autenticado");
  await verificarPassword(actual);
  if (!nueva || nueva.length < 6) {
    throw new Error("La nueva contraseña debe tener al menos 6 caracteres.");
  }
  return updatePassword(user, nueva);
}

