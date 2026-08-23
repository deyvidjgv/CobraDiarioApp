import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, deleteUser, signOut } from "firebase/auth";
import { firebaseConfig } from "./config";

const SECONDARY_APP_NAME = "cobradiario-creator";

/**
 * Instancia de Firebase completamente aparte de la principal, usada solo
 * para dar de alta cuentas de Auth de cobradiarios sin cerrar la sesión
 * del Admin (createUserWithEmailAndPassword inicia sesión automáticamente
 * en la instancia donde se llama).
 */
function getSecondaryAuth() {
  const existing = getApps().find((app) => app.name === SECONDARY_APP_NAME);
  const app = existing || initializeApp(firebaseConfig, SECONDARY_APP_NAME);
  return getAuth(app);
}

/** Crea la cuenta de Firebase Auth de un cobradiario y devuelve su uid. */
export async function crearCuentaCobradiario(email, password, nombre) {
  const secondaryAuth = getSecondaryAuth();
  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    if (nombre) {
      await updateProfile(credential.user, { displayName: nombre });
    }
    return credential.user.uid;
  } finally {
    // La sesión secundaria no se usa para nada más; se descarta de inmediato.
    await signOut(secondaryAuth).catch(() => {});
  }
}

export async function eliminarCuentaCobradiario(email, password) {
  const secondaryAuth = getSecondaryAuth();
  try {
    const credential = await signInWithEmailAndPassword(secondaryAuth, email, password);
    await deleteUser(credential.user);
  } finally {
    await signOut(secondaryAuth).catch(() => {});
  }
}
