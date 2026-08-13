import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  getDoc,
  terminate,
} from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";

// Pruebas de integracion de las Cloud Functions de Fase 3 contra el
// emulador real (Auth + Firestore + Functions), no mocks.

const PROJECT_ID = "demo-cobro-diario";
let app;
let auth;
let db;
let functions;

beforeAll(() => {
  app = initializeApp({ projectId: PROJECT_ID, apiKey: "demo-key" });
  auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  db = getFirestore(app);
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  functions = getFunctions(app);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
});

afterAll(async () => {
  await terminate(db);
  await deleteApp(app);
});

async function signUpAdmin(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  // Reproduce el bootstrap que hace AuthContext en la app real.
  await setDoc(doc(db, "userIndex", uid), { organizationId: uid, role: "admin" });
  await setDoc(doc(db, "organizations", uid, "users", uid), {
    uid,
    role: "admin",
    estado: "activo",
  });
  return uid;
}

beforeEach(async () => {
  await signOut(auth).catch(() => {});
});

describe("createCobradiario", () => {
  test("un admin puede crear un cobradiario en su organización", async () => {
    const adminEmail = `admin-${Date.now()}@test.com`;
    const orgId = await signUpAdmin(adminEmail, "password123");

    const createCobradiario = httpsCallable(functions, "createCobradiario");
    const cobradiarioEmail = `cobrador-${Date.now()}@test.com`;
    const result = await createCobradiario({
      email: cobradiarioEmail,
      password: "password123",
      nombre: "Juan Pérez",
      cedula: "123456",
      celular: "3000000000",
    });

    const newUid = result.data.uid;
    expect(newUid).toBeTruthy();

    // El Admin lee la ficha del miembro desde organizations/{orgId}/users
    // (lo que usará el panel de "Cobradiarios" para listarlos).
    const memberSnap = await getDoc(doc(db, "organizations", orgId, "users", newUid));
    expect(memberSnap.data().estado).toBe("activo");
    expect(memberSnap.data().nombre).toBe("Juan Pérez");
    expect(memberSnap.data().role).toBe("cobradiario");

    // El cobradiario recien creado ya puede iniciar sesion con Firebase Auth
    // y leer su propio userIndex (nadie más puede leerlo, solo él mismo).
    await signOut(auth);
    const loginResult = await signInWithEmailAndPassword(auth, cobradiarioEmail, "password123");
    expect(loginResult.user.uid).toBe(newUid);

    const indexSnap = await getDoc(doc(db, "userIndex", newUid));
    expect(indexSnap.exists()).toBe(true);
    expect(indexSnap.data().organizationId).toBe(orgId);
    expect(indexSnap.data().role).toBe("cobradiario");
  });

  test("un cobradiario NO puede crear otro cobradiario (permission-denied)", async () => {
    const adminEmail = `admin-${Date.now()}@test.com`;
    const orgId = await signUpAdmin(adminEmail, "password123");

    const createCobradiario = httpsCallable(functions, "createCobradiario");
    const cobradiarioEmail = `cobrador-${Date.now()}@test.com`;
    await createCobradiario({
      email: cobradiarioEmail,
      password: "password123",
      nombre: "Cobrador Uno",
    });

    await signOut(auth);
    await signInWithEmailAndPassword(auth, cobradiarioEmail, "password123");

    await expect(
      createCobradiario({ email: `otro-${Date.now()}@test.com`, password: "password123", nombre: "Otro" })
    ).rejects.toMatchObject({ code: "functions/permission-denied" });
  });

  test("rechaza crear un cobradiario con email ya existente", async () => {
    const adminEmail = `admin-${Date.now()}@test.com`;
    await signUpAdmin(adminEmail, "password123");

    const createCobradiario = httpsCallable(functions, "createCobradiario");
    const dupEmail = `dup-${Date.now()}@test.com`;
    await createCobradiario({ email: dupEmail, password: "password123", nombre: "Uno" });

    await expect(
      createCobradiario({ email: dupEmail, password: "password123", nombre: "Dos" })
    ).rejects.toMatchObject({ code: "functions/already-exists" });
  });
});

describe("setCobradiarioEstado", () => {
  test("el admin puede desactivar a un cobradiario y bloquea su login", async () => {
    const adminEmail = `admin-${Date.now()}@test.com`;
    const orgId = await signUpAdmin(adminEmail, "password123");

    const createCobradiario = httpsCallable(functions, "createCobradiario");
    const cobradiarioEmail = `cobrador-${Date.now()}@test.com`;
    const created = await createCobradiario({
      email: cobradiarioEmail,
      password: "password123",
      nombre: "Cobrador Desactivable",
    });
    const uid = created.data.uid;

    const setEstado = httpsCallable(functions, "setCobradiarioEstado");
    await setEstado({ uid, estado: "inactivo" });

    const memberSnap = await getDoc(doc(db, "organizations", orgId, "users", uid));
    expect(memberSnap.data().estado).toBe("inactivo");

    await signOut(auth);
    await expect(
      signInWithEmailAndPassword(auth, cobradiarioEmail, "password123")
    ).rejects.toMatchObject({ code: "auth/user-disabled" });
  });
});
