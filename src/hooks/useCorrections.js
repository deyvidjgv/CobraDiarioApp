import { useEffect, useState } from "react";
import { orderBy } from "firebase/firestore";
import { subscribeToCollection, addDocument, updateDocument } from "../firebase/firestore";
import { construirMovimiento, TIPOS_MOVIMIENTO } from "../logic/caja";
import { round2 } from "../logic/formato";
import { useAudit, ACCIONES_AUDIT } from "./useAudit";
import { useAuth } from "../context/AuthContext";

/**
 * Solicitudes de corrección sobre un movimiento/cobro ya registrado
 * (Plan Maestro, sección 11). No se edita ni se borra el movimiento
 * original: el cobradiario (o el admin) pide la corrección con el valor
 * correcto y el motivo, y el Admin la aprueba o rechaza. Al aprobar se
 * crea un movimiento de ajuste que compensa la diferencia, dejando el
 * original intacto y la corrección trazable.
 */
export function useCorrections() {
  const { orgId, usuario } = useAuth();
  const { registrarEvento } = useAudit();
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    const unsub = subscribeToCollection(
      orgId,
      "correctionRequests",
      [orderBy("createdAt", "desc")],
      (docs) => {
        setCorrections(docs);
        setLoading(false);
      }
    );
    return unsub;
  }, [orgId]);

  async function solicitarCorreccion({ movementId, valorOriginal, valorCorrecto, motivo }) {
    const ref = await addDocument(orgId, "correctionRequests", {
      movementId,
      valorOriginal,
      valorCorrecto,
      motivo,
      estado: "pendiente",
      createdBy: usuario.uid,
    });
    registrarEvento(ACCIONES_AUDIT.CORRECCION_SOLICITADA, {
      entidad: "correctionRequests",
      entidadId: ref.id,
      detalle: `Mov ${movementId}: $${valorOriginal} → $${valorCorrecto}. ${motivo}`,
    });
    return ref;
  }

  async function aprobarCorreccion(request) {
    const diferencia = round2((request.valorCorrecto ?? 0) - (request.valorOriginal ?? 0));
    if (diferencia !== 0) {
      const ajuste = construirMovimiento({
        tipo: TIPOS_MOVIMIENTO.AJUSTE,
        monto: diferencia,
        orgId,
        referencia: request.movementId,
        nota: `Corrección aprobada: ${request.motivo}`,
        cobradiarioId: request.cobradiarioId || null,
        createdBy: usuario.uid,
      });
      await addDocument(orgId, "movements", ajuste);
    }
    registrarEvento(ACCIONES_AUDIT.CORRECCION_APROBADA, {
      entidad: "correctionRequests",
      entidadId: request.id,
      detalle: `Ajuste de $${diferencia} sobre mov ${request.movementId}. ${request.motivo}`,
    });
    return updateDocument(orgId, "correctionRequests", request.id, {
      estado: "aprobada",
      resolvedBy: usuario.uid,
      resolvedAt: new Date().toISOString(),
    });
  }

  async function rechazarCorreccion(request, motivoRechazo = "") {
    registrarEvento(ACCIONES_AUDIT.CORRECCION_RECHAZADA, {
      entidad: "correctionRequests",
      entidadId: request.id,
      detalle: motivoRechazo || request.motivo,
    });
    return updateDocument(orgId, "correctionRequests", request.id, {
      estado: "rechazada",
      motivoRechazo,
      resolvedBy: usuario.uid,
      resolvedAt: new Date().toISOString(),
    });
  }

  return { corrections, loading, solicitarCorreccion, aprobarCorreccion, rechazarCorreccion };
}
