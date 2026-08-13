const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();

const db = getFirestore();
const auth = getAuth();

/**
 * Verifica que el usuario que invoca la funcion sea un admin activo y
 * devuelve su organizationId. El SDK Admin ignora las Security Rules,
 * asi que esta validacion es la unica barrera de autorizacion aqui.
 */
async function requireAdmin(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  const callerUid = request.auth.uid;

  const indexSnap = await db.collection("userIndex").doc(callerUid).get();
  if (!indexSnap.exists) {
    throw new HttpsError("permission-denied", "Usuario sin organización asignada.");
  }
  const { organizationId } = indexSnap.data();

  const memberSnap = await db
    .collection("organizations")
    .doc(organizationId)
    .collection("users")
    .doc(callerUid)
    .get();

  const member = memberSnap.data();
  if (!memberSnap.exists || member.role !== "admin" || member.estado !== "activo") {
    throw new HttpsError("permission-denied", "Solo un Admin activo puede realizar esta acción.");
  }

  return { organizationId, callerUid };
}

function requireString(value, field, { optional = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (optional) return "";
    throw new HttpsError("invalid-argument", `El campo "${field}" es obligatorio.`);
  }
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", `El campo "${field}" debe ser texto.`);
  }
  return value.trim();
}

/**
 * Crea una cuenta de cobradiario dentro de la organización del Admin que
 * invoca la función: usuario de Firebase Auth + userIndex + ficha en
 * organizations/{orgId}/users. Ver Plan Maestro, sección 5 y Fase 3.
 */
exports.createCobradiario = onCall(async (request) => {
  const { organizationId, callerUid } = await requireAdmin(request);

  const data = request.data ?? {};
  const email = requireString(data.email, "email").toLowerCase();
  const password = requireString(data.password, "password");
  const nombre = requireString(data.nombre, "nombre");
  const cedula = requireString(data.cedula, "cedula", { optional: true });
  const celular = requireString(data.celular, "celular", { optional: true });

  if (password.length < 6) {
    throw new HttpsError("invalid-argument", "La contraseña debe tener al menos 6 caracteres.");
  }

  let newUid;
  try {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: nombre,
    });
    newUid = userRecord.uid;
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "Ya existe una cuenta con ese correo.");
    }
    throw new HttpsError("internal", "No se pudo crear la cuenta de autenticación.");
  }

  try {
    const batch = db.batch();
    batch.set(db.collection("userIndex").doc(newUid), {
      organizationId,
      role: "cobradiario",
    });
    batch.set(
      db.collection("organizations").doc(organizationId).collection("users").doc(newUid),
      {
        uid: newUid,
        nombre,
        cedula,
        celular,
        email,
        role: "cobradiario",
        estado: "activo",
        createdAt: FieldValue.serverTimestamp(),
        createdBy: callerUid,
      }
    );
    await batch.commit();
  } catch (err) {
    // Evita cuentas de Auth huérfanas si la escritura en Firestore falla.
    await auth.deleteUser(newUid).catch(() => {});
    throw new HttpsError("internal", "No se pudo guardar el registro del cobradiario.");
  }

  return { uid: newUid };
});

/**
 * Activa o desactiva a un cobradiario de la organización del Admin que
 * invoca la función: actualiza su ficha en Firestore y bloquea/desbloquea
 * su cuenta de Firebase Auth para que no pueda iniciar sesión mientras
 * esté inactivo.
 */
exports.setCobradiarioEstado = onCall(async (request) => {
  const { organizationId } = await requireAdmin(request);

  const data = request.data ?? {};
  const uid = requireString(data.uid, "uid");
  const estado = requireString(data.estado, "estado");
  if (estado !== "activo" && estado !== "inactivo") {
    throw new HttpsError("invalid-argument", 'El campo "estado" debe ser "activo" o "inactivo".');
  }

  const memberRef = db.collection("organizations").doc(organizationId).collection("users").doc(uid);
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists || memberSnap.data().role !== "cobradiario") {
    throw new HttpsError("not-found", "Ese cobradiario no existe en tu organización.");
  }

  await memberRef.update({ estado });
  await auth.updateUser(uid, { disabled: estado === "inactivo" });

  return { uid, estado };
});
