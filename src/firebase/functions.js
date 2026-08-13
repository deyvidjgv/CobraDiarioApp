import { httpsCallable } from "firebase/functions";
import { functions } from "./config";

/**
 * Crea la cuenta de un cobradiario (Firebase Auth + userIndex + ficha en
 * organizations/{orgId}/users) dentro de la organización del Admin que
 * invoca esta función. Ver functions/index.js.
 */
export async function crearCobradiario({ nombre, cedula, celular, email, password }) {
  const call = httpsCallable(functions, "createCobradiario");
  const { data } = await call({ nombre, cedula, celular, email, password });
  return data;
}

/** Activa o desactiva a un cobradiario (Firestore + bloqueo de su Auth). */
export async function cambiarEstadoCobradiario(uid, estado) {
  const call = httpsCallable(functions, "setCobradiarioEstado");
  const { data } = await call({ uid, estado });
  return data;
}
