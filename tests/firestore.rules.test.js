import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import { setDoc, doc, getDoc, updateDoc, deleteDoc, addDoc, collection } from "firebase/firestore";

let testEnv;

const ORG_ID = "org-admin-uid";
const ADMIN_UID = "org-admin-uid"; // el admin es dueño de su propia org
const COBRADIARIO_UID = "cobrador-1-uid";
const OTHER_COBRADIARIO_UID = "cobrador-2-uid";
const OUTSIDER_UID = "intruso-uid";

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-cobro-diario-rules-test",
    firestore: {
      rules: readFileSync("firebase/firestore.rules", "utf8"),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  // Sembrar el estado base (admin + un cobradiario activo) saltandonos
  // las reglas, para poder probar cada regla de forma aislada.
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "userIndex", ADMIN_UID), {
      organizationId: ORG_ID,
      role: "admin",
    });
    await setDoc(doc(db, "organizations", ORG_ID, "users", ADMIN_UID), {
      uid: ADMIN_UID,
      role: "admin",
      estado: "activo",
    });

    await setDoc(doc(db, "userIndex", COBRADIARIO_UID), {
      organizationId: ORG_ID,
      role: "cobradiario",
    });
    await setDoc(doc(db, "organizations", ORG_ID, "users", COBRADIARIO_UID), {
      uid: COBRADIARIO_UID,
      role: "cobradiario",
      estado: "activo",
    });

    await setDoc(doc(db, "organizations", ORG_ID, "clients", "cliente-1"), {
      nombre: "Cliente Uno",
      cobradiarioId: COBRADIARIO_UID,
    });

    await setDoc(doc(db, "organizations", ORG_ID, "movements", "mov-1"), {
      type: "cobro",
      amount: 40000,
      cobradiarioId: COBRADIARIO_UID,
    });
  });
});

describe("userIndex", () => {
  test("un usuario nuevo puede crear su propio userIndex como admin (bootstrap)", async () => {
    const ctx = testEnv.authenticatedContext(OUTSIDER_UID);
    const db = ctx.firestore();
    await assertSucceeds(
      setDoc(doc(db, "userIndex", OUTSIDER_UID), {
        organizationId: OUTSIDER_UID,
        role: "admin",
      })
    );
  });

  test("un usuario no puede crear userIndex de otro uid", async () => {
    const ctx = testEnv.authenticatedContext(OUTSIDER_UID);
    const db = ctx.firestore();
    await assertFails(
      setDoc(doc(db, "userIndex", COBRADIARIO_UID), {
        organizationId: ORG_ID,
        role: "admin",
      })
    );
  });

  test("un usuario no puede auto-asignarse role cobradiario en el bootstrap", async () => {
    const ctx = testEnv.authenticatedContext(OUTSIDER_UID);
    const db = ctx.firestore();
    await assertFails(
      setDoc(doc(db, "userIndex", OUTSIDER_UID), {
        organizationId: OUTSIDER_UID,
        role: "cobradiario",
      })
    );
  });

  test("un usuario no puede leer el userIndex de otro", async () => {
    const ctx = testEnv.authenticatedContext(OUTSIDER_UID);
    const db = ctx.firestore();
    await assertFails(getDoc(doc(db, "userIndex", ADMIN_UID)));
  });
});

describe("clients", () => {
  test("admin puede leer cualquier cliente de su organizacion", async () => {
    const ctx = testEnv.authenticatedContext(ADMIN_UID);
    const db = ctx.firestore();
    await assertSucceeds(getDoc(doc(db, "organizations", ORG_ID, "clients", "cliente-1")));
  });

  test("cobradiario puede leer su propio cliente", async () => {
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertSucceeds(getDoc(doc(db, "organizations", ORG_ID, "clients", "cliente-1")));
  });

  test("cobradiario NO puede leer un cliente de otro cobradiario", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "organizations", ORG_ID, "users", OTHER_COBRADIARIO_UID), {
        uid: OTHER_COBRADIARIO_UID,
        role: "cobradiario",
        estado: "activo",
      });
    });
    const ctx = testEnv.authenticatedContext(OTHER_COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertFails(getDoc(doc(db, "organizations", ORG_ID, "clients", "cliente-1")));
  });

  test("cobradiario puede crear un cliente propio (cobradiarioId = su uid)", async () => {
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertSucceeds(
      setDoc(doc(db, "organizations", ORG_ID, "clients", "cliente-nuevo"), {
        nombre: "Cliente Nuevo",
        cobradiarioId: COBRADIARIO_UID,
      })
    );
  });

  test("cobradiario NO puede crear un cliente asignado a otro cobradiario", async () => {
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertFails(
      setDoc(doc(db, "organizations", ORG_ID, "clients", "cliente-ajeno"), {
        nombre: "Cliente Ajeno",
        cobradiarioId: OTHER_COBRADIARIO_UID,
      })
    );
  });

  test("usuario no autenticado no puede leer clientes", async () => {
    const ctx = testEnv.unauthenticatedContext();
    const db = ctx.firestore();
    await assertFails(getDoc(doc(db, "organizations", ORG_ID, "clients", "cliente-1")));
  });
});

describe("movements (inmutabilidad financiera)", () => {
  test("cobradiario puede crear un movimiento propio", async () => {
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertSucceeds(
      addDoc(collection(db, "organizations", ORG_ID, "movements"), {
        type: "cobro",
        amount: 20000,
        cobradiarioId: COBRADIARIO_UID,
      })
    );
  });

  test("cobradiario NO puede editar un movimiento existente", async () => {
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertFails(
      updateDoc(doc(db, "organizations", ORG_ID, "movements", "mov-1"), { amount: 99999 })
    );
  });

  test("cobradiario NO puede borrar un movimiento existente", async () => {
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertFails(deleteDoc(doc(db, "organizations", ORG_ID, "movements", "mov-1")));
  });

  test("admin SI puede editar/anular un movimiento existente", async () => {
    const ctx = testEnv.authenticatedContext(ADMIN_UID);
    const db = ctx.firestore();
    await assertSucceeds(
      updateDoc(doc(db, "organizations", ORG_ID, "movements", "mov-1"), { anulado: true })
    );
  });
});

describe("settings", () => {
  test("cobradiario puede leer settings pero no escribirlas", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "organizations", ORG_ID, "settings", "default"), {
        interes: 20,
      });
    });
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertSucceeds(getDoc(doc(db, "organizations", ORG_ID, "settings", "default")));
    await assertFails(
      setDoc(doc(db, "organizations", ORG_ID, "settings", "default"), { interes: 99 }, { merge: true })
    );
  });

  test("admin puede escribir settings", async () => {
    const ctx = testEnv.authenticatedContext(ADMIN_UID);
    const db = ctx.firestore();
    await assertSucceeds(
      setDoc(doc(db, "organizations", ORG_ID, "settings", "default"), { interes: 20 }, { merge: true })
    );
  });
});

describe("users (miembros de la organizacion)", () => {
  test("admin puede desactivar (update) a un cobradiario", async () => {
    const ctx = testEnv.authenticatedContext(ADMIN_UID);
    const db = ctx.firestore();
    await assertSucceeds(
      updateDoc(doc(db, "organizations", ORG_ID, "users", COBRADIARIO_UID), { estado: "inactivo" })
    );
  });

  test("cobradiario NO puede modificar su propia ficha (rol/estado)", async () => {
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertFails(
      updateDoc(doc(db, "organizations", ORG_ID, "users", COBRADIARIO_UID), { role: "admin" })
    );
  });

  // Fase 3 (sin backend): el admin crea la cuenta de Auth de un cobradiario
  // con una instancia secundaria en el cliente y luego registra sus fichas
  // (userIndex + organizations/{orgId}/users) con su propia sesión.
  const NUEVO_COBRADIARIO_UID = "cobrador-nuevo-uid";

  test("admin puede registrar userIndex + ficha de un cobradiario nuevo", async () => {
    const ctx = testEnv.authenticatedContext(ADMIN_UID);
    const db = ctx.firestore();

    await assertSucceeds(
      setDoc(doc(db, "userIndex", NUEVO_COBRADIARIO_UID), {
        organizationId: ORG_ID,
        role: "cobradiario",
      })
    );
    await assertSucceeds(
      setDoc(doc(db, "organizations", ORG_ID, "users", NUEVO_COBRADIARIO_UID), {
        uid: NUEVO_COBRADIARIO_UID,
        nombre: "Cobrador Nuevo",
        role: "cobradiario",
        estado: "activo",
      })
    );
  });

  test("un cobradiario NO puede registrar a otro cobradiario", async () => {
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();

    await assertFails(
      setDoc(doc(db, "userIndex", NUEVO_COBRADIARIO_UID), {
        organizationId: ORG_ID,
        role: "cobradiario",
      })
    );
    await assertFails(
      setDoc(doc(db, "organizations", ORG_ID, "users", NUEVO_COBRADIARIO_UID), {
        uid: NUEVO_COBRADIARIO_UID,
        nombre: "Cobrador Nuevo",
        role: "cobradiario",
        estado: "activo",
      })
    );
  });

  test("admin NO puede reescribir un userIndex ya existente (es create, no update)", async () => {
    const ctx = testEnv.authenticatedContext(ADMIN_UID);
    const db = ctx.firestore();
    // COBRADIARIO_UID ya tiene userIndex sembrado en beforeEach: al no ser
    // un documento nuevo, la regla de "create" no aplica y no hay "update".
    await assertFails(
      setDoc(doc(db, "userIndex", COBRADIARIO_UID), {
        organizationId: ORG_ID,
        role: "cobradiario",
      })
    );
  });
});
