import { useEffect, useState } from "react";
import { orderBy } from "firebase/firestore";
import { subscribeToCollection, addDocument } from "../firebase/firestore";
import { useAuth } from "../context/AuthContext";

/**
 * Auditoría (Fase 9, Plan Maestro): registro append-only de las acciones
 * sensibles de la operación. Cada entrada es inmutable (las reglas de
 * Firestore solo permiten create) y queda asociada al actor real.
 */
export const ACCIONES_AUDIT = {
  CLIENTE_CREADO: "cliente_creado",
  CLIENTE_ACTUALIZADO: "cliente_actualizado",
  CREDITO_CREADO: "credito_creado",
  CREDITO_ACTUALIZADO: "credito_actualizado",
  CREDITO_ANULADO: "credito_anulado",
  CREDITO_ELIMINADO: "credito_eliminado",
  COBRO_REGISTRADO: "cobro_registrado",
  CORRECCION_SOLICITADA: "correccion_solicitada",
  CORRECCION_APROBADA: "correccion_aprobada",
  CORRECCION_RECHAZADA: "correccion_rechazada",
  MOVIMIENTO_CAJA: "movimiento_caja",
  MOVIMIENTO_ELIMINADO: "movimiento_eliminado",
  VISITA_REGISTRADA: "visita_registrada",
  SETTINGS_ACTUALIZADAS: "settings_actualizadas",
  ADMIN_VIEW_AS_USER: "admin_view_as_user",
  RESPALDO_DESCARGADO: "respaldo_descargado",
  RESPALDO_RESTAURADO: "respaldo_restaurado",
};

/** Hook de solo-escritura: registra eventos de auditoría. */
export function useAudit() {
  const { orgId, usuario } = useAuth();

  async function registrarEvento(accion, { entidad = null, entidadId = null, detalle = null } = {}) {
    if (!orgId || !usuario) return;
    try {
      await addDocument(orgId, "auditLogs", {
        accion,
        entidad,
        entidadId,
        detalle,
        actorId: usuario.uid,
        actorNombre: usuario.displayName ?? null,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      // La auditoría nunca debe romper la operación que la dispara.
      console.warn("No se pudo registrar evento de auditoría:", err);
    }
  }

  return { registrarEvento };
}

/** Hook de solo-lectura para el panel de auditoría del Admin. */
export function useAuditFeed(limite = 100) {
  const { orgId } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    const unsub = subscribeToCollection(
      orgId,
      "auditLogs",
      [orderBy("createdAt", "desc")],
      (docs) => {
        setLogs(docs.slice(0, limite));
        setLoading(false);
      }
    );
    return unsub;
  }, [orgId, limite]);

  return { logs, loading };
}
