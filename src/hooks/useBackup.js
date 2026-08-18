import { useAuth } from "../context/AuthContext";
import {
  getSettings,
  saveSettings,
  getAllDocuments,
  documentRef,
  getBatch,
  wSetPreserving,
} from "../firebase/firestore";
import {
  COLECCIONES_RESPALDO,
  serializarParaRespaldo,
  deserializarDesdeRespaldo,
} from "../logic/backup";
import { useAudit, ACCIONES_AUDIT } from "./useAudit";

// Los batches de Firestore aceptan hasta 500 operaciones; 400 deja margen.
const TAMANO_LOTE = 400;

// firestore.rules hace que correctionRequests/visits/auditLogs/users sean
// imborrables (append-only) e incluso "users" y "correctionRequests" ya
// resueltas quedan sin permiso de update — incluso para el Admin, por
// diseño (protege el rastro de auditoría). Un batch de Firestore es
// atómico: si UNA sola operación viola las reglas, TODO el batch falla.
// Así que para estas colecciones restaurar solo puede CREAR lo que falte
// (documentos con un ID que hoy no existe); lo que ya existe no se toca.
const COLECCIONES_REEMPLAZABLES = ["clients", "loans", "movements"];
const COLECCIONES_SOLO_CREAR = ["correctionRequests", "visits", "auditLogs", "users"];

function partirEnLotes(arr, tamano) {
  const lotes = [];
  for (let i = 0; i < arr.length; i += tamano) lotes.push(arr.slice(i, i + tamano));
  return lotes;
}

/**
 * Respaldo y restauración de una organización completa, como archivo JSON
 * descargable — pensado como plan de contingencia (recuperar el negocio
 * si algo falla), no como sincronización entre dispositivos. Ver el
 * comentario de restaurarRespaldo: no todas las colecciones se pueden
 * "reemplazar" — algunas son imborrables por diseño (rules).
 */
export function useBackup() {
  const { orgId } = useAuth();
  const { registrarEvento } = useAudit();

  async function exportarRespaldo() {
    const settings = (await getSettings(orgId)) ?? {};
    const colecciones = {};
    for (const nombre of COLECCIONES_RESPALDO) {
      const docs = await getAllDocuments(orgId, nombre);
      colecciones[nombre] = docs.map(serializarParaRespaldo);
    }

    const data = {
      tipo: "respaldo_credidev",
      version: 1,
      orgId,
      exportedAt: new Date().toISOString(),
      settings: serializarParaRespaldo(settings),
      colecciones,
    };

    registrarEvento(ACCIONES_AUDIT.RESPALDO_DESCARGADO, {
      entidad: "organizations",
      entidadId: orgId,
      detalle: COLECCIONES_RESPALDO.map((c) => `${c}: ${colecciones[c].length}`).join(", "),
    });

    return data;
  }

  async function escribirEnLotes(nombre, docs) {
    for (const lote of partirEnLotes(docs, TAMANO_LOTE)) {
      const batch = getBatch();
      for (const doc of lote) {
        const { id, ...campos } = doc;
        wSetPreserving(batch, documentRef(orgId, nombre, id), campos);
      }
      await batch.commit();
    }
  }

  /**
   * Restaura una organización desde un respaldo:
   *  - clients/loans/movements/settings: reemplazo total (se borra lo que
   *    exista hoy y se escribe exactamente lo del archivo) — las reglas de
   *    Firestore permiten borrar estas colecciones al Admin.
   *  - correctionRequests/visits/auditLogs/users: solo se CREA lo que falte
   *    (documentos cuyo ID no existe hoy); lo que ya existe no se toca,
   *    porque las reglas las hacen imborrables/no editables por diseño.
   * `userIndex` (mapeo uid → organización/rol) nunca se toca.
   */
  async function restaurarRespaldo(data, { onProgress } = {}) {
    const totalPasos = COLECCIONES_RESPALDO.length + 1; // +1 por settings
    let paso = 0;
    const reportar = (mensaje) => {
      paso += 1;
      onProgress?.({ paso, totalPasos, mensaje });
    };

    if (data.settings) {
      await saveSettings(orgId, deserializarDesdeRespaldo(data.settings));
    }
    reportar("Configuración restaurada");

    for (const nombre of COLECCIONES_REEMPLAZABLES) {
      const actuales = await getAllDocuments(orgId, nombre);
      const nuevos = (data.colecciones[nombre] || []).map((d) => deserializarDesdeRespaldo(d));

      for (const lote of partirEnLotes(actuales.map((d) => d.id), TAMANO_LOTE)) {
        const batch = getBatch();
        for (const id of lote) batch.delete(documentRef(orgId, nombre, id));
        await batch.commit();
      }
      await escribirEnLotes(nombre, nuevos);

      reportar(`${nombre}: ${nuevos.length} documentos restaurados`);
    }

    for (const nombre of COLECCIONES_SOLO_CREAR) {
      const actuales = await getAllDocuments(orgId, nombre);
      const idsExistentes = new Set(actuales.map((d) => d.id));
      const nuevos = (data.colecciones[nombre] || [])
        .map((d) => deserializarDesdeRespaldo(d))
        .filter((doc) => !idsExistentes.has(doc.id));

      await escribirEnLotes(nombre, nuevos);

      reportar(`${nombre}: ${nuevos.length} documentos agregados (no se toca lo existente)`);
    }

    registrarEvento(ACCIONES_AUDIT.RESPALDO_RESTAURADO, {
      entidad: "organizations",
      entidadId: orgId,
      detalle: `Restaurado desde respaldo del ${data.exportedAt}`,
    });
  }

  return { exportarRespaldo, restaurarRespaldo };
}
