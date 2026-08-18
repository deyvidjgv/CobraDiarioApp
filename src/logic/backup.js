/**
 * Respaldo completo de una organización (exportar/restaurar como JSON).
 *
 * Las colecciones operativas (clients, loans, movements, correctionRequests,
 * visits, auditLogs, users) se listan aquí; `settings` es un documento único
 * y se maneja aparte. `userIndex` (fuera de organizations/{orgId}, mapea uid
 * → organización/rol) NUNCA se toca — restaurar un negocio no debe alterar
 * a qué organización pertenece una cuenta de Firebase Auth.
 */
export const COLECCIONES_RESPALDO = [
  "clients",
  "loans",
  "movements",
  "correctionRequests",
  "visits",
  "auditLogs",
  "users",
];

const MARCA_TIMESTAMP = "__firestoreTimestamp";

/**
 * Convierte cualquier valor leído de Firestore a algo serializable en JSON.
 * Los Timestamp de Firestore (fecha, createdAt, updatedAt, etc.) se marcan
 * explícitamente para poder reconstruirlos al restaurar — un ISO string
 * suelto se guardaría como texto plano, no como fecha real.
 */
export function serializarParaRespaldo(valor) {
  if (valor && typeof valor.toDate === "function") {
    return { [MARCA_TIMESTAMP]: valor.toDate().toISOString() };
  }
  if (Array.isArray(valor)) return valor.map(serializarParaRespaldo);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor).map(([k, v]) => [k, serializarParaRespaldo(v)])
    );
  }
  return valor;
}

/** Inverso de serializarParaRespaldo: reconstruye Date reales desde la marca */
export function deserializarDesdeRespaldo(valor) {
  if (valor && typeof valor === "object" && typeof valor[MARCA_TIMESTAMP] === "string") {
    return new Date(valor[MARCA_TIMESTAMP]);
  }
  if (Array.isArray(valor)) return valor.map(deserializarDesdeRespaldo);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor).map(([k, v]) => [k, deserializarDesdeRespaldo(v)])
    );
  }
  return valor;
}

/** ¿Este objeto tiene la forma esperada de un archivo de respaldo de esta app? */
export function esRespaldoValido(data) {
  if (!data || typeof data !== "object") return false;
  if (data.tipo !== "respaldo_credidev") return false;
  if (!data.exportedAt) return false;
  return COLECCIONES_RESPALDO.every((c) => Array.isArray(data.colecciones?.[c]));
}

/** Conteos por colección, para mostrarle al admin qué va a pasar antes de restaurar */
export function resumenRespaldo(data) {
  return COLECCIONES_RESPALDO.map((c) => ({
    coleccion: c,
    cantidad: data.colecciones?.[c]?.length ?? 0,
  }));
}
