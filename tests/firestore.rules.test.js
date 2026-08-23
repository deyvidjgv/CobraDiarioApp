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
      tipo: "cobro",
      monto: 40000,
      cobradiarioId: COBRADIARIO_UID,
    });

    // Crédito del cobradiario para probar actualizaciones por campo
    await setDoc(doc(db, "organizations", ORG_ID, "loans", "loan-1"), {
      estado: "activo",
      capital: 100000,
      interesAplicado: 20,
      cuota: 4000,
      saldoPendiente: 80000,
      montoTotalAPagar: 80000,
      fechaInicio: new Date().toISOString(),
      clientId: "cliente-1",
      cobradiarioId: COBRADIARIO_UID,
      vencimiento: {
        activo: true,
        porcentaje: 20,
        modoInicial: "al_vencer",
        proximoCorte: "2026-12-01",
        fechaVencimientoTotal: "2026-12-01",
        recargosAcumulados: 0,
        fechaUltimoRecargo: null,
      },
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
        tipo: "cobro",
        monto: 20000,
        cobradiarioId: COBRADIARIO_UID,
        createdBy: COBRADIARIO_UID,
      })
    );
  });

  test("cobradiario NO puede editar un movimiento existente", async () => {
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertFails(
      updateDoc(doc(db, "organizations", ORG_ID, "movements", "mov-1"), { monto: 99999 })
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

  test("cobradiario NO puede crear un movimiento con tipo o signo inválido", async () => {
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertFails(
      addDoc(collection(db, "organizations", ORG_ID, "movements"), {
        tipo: "movimiento_falso",
        monto: 999999,
        cobradiarioId: COBRADIARIO_UID,
        createdBy: COBRADIARIO_UID,
      })
    );
    await assertFails(
      addDoc(collection(db, "organizations", ORG_ID, "movements"), {
        tipo: "cobro",
        monto: -500,
        cobradiarioId: COBRADIARIO_UID,
        createdBy: COBRADIARIO_UID,
      })
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

describe("correctionRequests (Fase 7)", () => {
  test("cobradiario puede crear una solicitud de correccion propia", async () => {
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertSucceeds(
      setDoc(doc(db, "organizations", ORG_ID, "correctionRequests", "req-1"), {
        movementId: "mov-1",
        valorOriginal: 40000,
        valorCorrecto: 35000,
        motivo: "Se digito mal el valor",
        estado: "pendiente",
        createdBy: COBRADIARIO_UID,
      })
    );
  });

  test("cobradiario NO puede crear una solicitud a nombre de otro usuario", async () => {
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertFails(
      setDoc(doc(db, "organizations", ORG_ID, "correctionRequests", "req-2"), {
        movementId: "mov-1",
        valorOriginal: 40000,
        valorCorrecto: 35000,
        motivo: "Suplantando a otro",
        estado: "pendiente",
        createdBy: OTHER_COBRADIARIO_UID,
      })
    );
  });

  test("cobradiario NO puede corregir un movimiento de otro cobrador", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "organizations", ORG_ID, "movements", "mov-ajeno"), {
        tipo: "cobro",
        monto: 25000,
        cobradiarioId: OTHER_COBRADIARIO_UID,
      });
    });
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertFails(
      setDoc(doc(db, "organizations", ORG_ID, "correctionRequests", "req-ajena"), {
        movementId: "mov-ajeno",
        valorOriginal: 25000,
        valorCorrecto: 20000,
        estado: "pendiente",
        createdBy: COBRADIARIO_UID,
      })
    );
  });

  test("cobradiario NO puede aprobar su propia solicitud (update)", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "organizations", ORG_ID, "correctionRequests", "req-3"), {
        movementId: "mov-1",
        valorOriginal: 40000,
        valorCorrecto: 35000,
        motivo: "Error de digitacion",
        estado: "pendiente",
        createdBy: COBRADIARIO_UID,
      });
    });
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertFails(
      updateDoc(doc(db, "organizations", ORG_ID, "correctionRequests", "req-3"), { estado: "aprobada" })
    );
  });

  test("admin SI puede aprobar una solicitud pendiente", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "organizations", ORG_ID, "correctionRequests", "req-4"), {
        movementId: "mov-1",
        valorOriginal: 40000,
        valorCorrecto: 35000,
        motivo: "Error de digitacion",
        estado: "pendiente",
        createdBy: COBRADIARIO_UID,
      });
    });
    const ctx = testEnv.authenticatedContext(ADMIN_UID);
    const db = ctx.firestore();
    await assertSucceeds(
      updateDoc(doc(db, "organizations", ORG_ID, "correctionRequests", "req-4"), {
        estado: "aprobada",
        resolvedBy: ADMIN_UID,
      })
    );
  });
});

describe("loans (actualizaciones por campo)", () => {
  const loanPath = ["organizations", ORG_ID, "loans", "loan-1"];

  test("cobradiario puede actualizar saldo/estado al registrar un cobro", async () => {
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertSucceeds(
      updateDoc(doc(db, ...loanPath), { saldoPendiente: 76000, estado: "activo" })
    );
  });

  test("cobradiario puede marcar el crédito como completado (renovación/cierre)", async () => {
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertSucceeds(
      updateDoc(doc(db, ...loanPath), { saldoPendiente: 0, estado: "completado" })
    );
  });

  test("cobradiario puede aplicar recargo (campos operativos del vencimiento)", async () => {
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertSucceeds(
      updateDoc(doc(db, ...loanPath), {
        saldoPendiente: 96000,
        montoTotalAPagar: 96000,
        "vencimiento.recargosAcumulados": 16000,
        "vencimiento.fechaUltimoRecargo": new Date().toISOString(),
      })
    );
  });

  test("cobradiario NO puede cambiar las condiciones (capital/interés/cuota)", async () => {
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertFails(
      updateDoc(doc(db, ...loanPath), { capital: 999999, saldoPendiente: 0 })
    );
    await assertFails(
      updateDoc(doc(db, ...loanPath), { interesAplicado: 0 })
    );
    await assertFails(
      updateDoc(doc(db, ...loanPath), { cuota: 1 })
    );
  });

  test("cobradiario NO puede falsificar el porcentaje del vencimiento", async () => {
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertFails(
      updateDoc(doc(db, ...loanPath), {
        saldoPendiente: 0,
        "vencimiento.porcentaje": 0,
      })
    );
  });

  test("cobradiario NO puede anular el crédito (solo Admin)", async () => {
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertFails(
      updateDoc(doc(db, ...loanPath), { estado: "anulado" })
    );
  });

  test("cobradiario NO puede aumentar el saldo sin un recargo válido", async () => {
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertFails(
      updateDoc(doc(db, ...loanPath), {
        saldoPendiente: 999999,
        montoTotalAPagar: 999999,
      })
    );
  });

  test("cobradiario NO puede crear un crédito para cliente ajeno", async () => {
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertFails(
      setDoc(doc(db, "organizations", ORG_ID, "loans", "loan-ajeno"), {
        estado: "activo",
        capital: 100000,
        saldoPendiente: 100000,
        montoTotalAPagar: 100000,
        clientId: "cliente-ajeno-no-existe",
        cobradiarioId: COBRADIARIO_UID,
        createdBy: COBRADIARIO_UID,
      })
    );
  });

  test("otro cobradiario NO puede tocar un crédito ajeno", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "organizations", ORG_ID, "users", OTHER_COBRADIARIO_UID), {
        uid: OTHER_COBRADIARIO_UID,
        role: "cobradiario",
        estado: "activo",
      });
    });
    const ctx = testEnv.authenticatedContext(OTHER_COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertFails(
      updateDoc(doc(db, ...loanPath), { saldoPendiente: 0 })
    );
  });

  test("admin puede modificar todo el crédito", async () => {
    const ctx = testEnv.authenticatedContext(ADMIN_UID);
    const db = ctx.firestore();
    await assertSucceeds(
      updateDoc(doc(db, ...loanPath), { estado: "anulado", nota: "ajuste admin" })
    );
  });
});

describe("visits (Fase 8)", () => {
  test("cobradiario puede crear una visita propia con GPS", async () => {
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertSucceeds(
      setDoc(doc(db, "organizations", ORG_ID, "visits", "vis-1"), {
        clientId: "cliente-1",
        loanId: null,
        resultado: "no_pago",
        ubicacion: { lat: 4.6, lng: -74.1 },
        fecha: "2026-08-16",
        cobradiarioId: COBRADIARIO_UID,
        createdBy: COBRADIARIO_UID,
      })
    );
  });

  test("cobradiario NO puede crear una visita a nombre de otro", async () => {
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertFails(
      setDoc(doc(db, "organizations", ORG_ID, "visits", "vis-2"), {
        clientId: "cliente-1",
        resultado: "no_pago",
        cobradiarioId: OTHER_COBRADIARIO_UID,
        createdBy: COBRADIARIO_UID,
      })
    );
  });

  test("las visitas son inmutables (ni el propio cobradiario las edita)", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "organizations", ORG_ID, "visits", "vis-3"), {
        clientId: "cliente-1",
        resultado: "no_pago",
        cobradiarioId: COBRADIARIO_UID,
      });
    });
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertFails(
      updateDoc(doc(db, "organizations", ORG_ID, "visits", "vis-3"), { resultado: "cobro" })
    );
    await assertFails(deleteDoc(doc(db, "organizations", ORG_ID, "visits", "vis-3")));
  });

  test("cobradiario puede leer sus visitas y admin puede leer todas", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "organizations", ORG_ID, "visits", "vis-3"), {
        clientId: "cliente-1",
        resultado: "no_pago",
        cobradiarioId: COBRADIARIO_UID,
      });
    });
    const cobCtx = testEnv.authenticatedContext(COBRADIARIO_UID);
    await assertSucceeds(
      getDoc(doc(cobCtx.firestore(), "organizations", ORG_ID, "visits", "vis-3"))
    );
    const adminCtx = testEnv.authenticatedContext(ADMIN_UID);
    await assertSucceeds(
      getDoc(doc(adminCtx.firestore(), "organizations", ORG_ID, "visits", "vis-3"))
    );
  });
});

describe("auditLogs (Fase 9)", () => {
  test("miembro activo puede registrar un evento con su propio actorId", async () => {
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertSucceeds(
      setDoc(doc(db, "organizations", ORG_ID, "auditLogs", "log-1"), {
        accion: "cobro_registrado",
        actorId: COBRADIARIO_UID,
        detalle: "$40000",
        createdAt: new Date().toISOString(),
      })
    );
  });

  test("no puede registrar eventos a nombre de otro actor", async () => {
    const ctx = testEnv.authenticatedContext(COBRADIARIO_UID);
    const db = ctx.firestore();
    await assertFails(
      setDoc(doc(db, "organizations", ORG_ID, "auditLogs", "log-2"), {
        accion: "credito_eliminado",
        actorId: ADMIN_UID,
        createdAt: new Date().toISOString(),
      })
    );
  });

  test("los logs son append-only y solo el Admin los lee", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "organizations", ORG_ID, "auditLogs", "log-3"), {
        accion: "cobro_registrado",
        actorId: COBRADIARIO_UID,
      });
    });
    const adminCtx = testEnv.authenticatedContext(ADMIN_UID);
    await assertSucceeds(
      getDoc(doc(adminCtx.firestore(), "organizations", ORG_ID, "auditLogs", "log-3"))
    );
    const cobCtx = testEnv.authenticatedContext(COBRADIARIO_UID);
    await assertFails(
      getDoc(doc(cobCtx.firestore(), "organizations", ORG_ID, "auditLogs", "log-3"))
    );
    await assertFails(
      updateDoc(doc(adminCtx.firestore(), "organizations", ORG_ID, "auditLogs", "log-3"), { detalle: "x" })
    );
    await assertFails(
      deleteDoc(doc(adminCtx.firestore(), "organizations", ORG_ID, "auditLogs", "log-3"))
    );
  });
});

