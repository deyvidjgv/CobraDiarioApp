import { useEffect, useState } from "react";
import { orderBy } from "firebase/firestore";
import { subscribeToCollection, addDocument, updateDocument } from "../firebase/firestore";
import { construirMovimiento, TIPOS_MOVIMIENTO } from "../logic/caja";
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
    return addDocument(orgId, "correctionRequests", {
      movementId,
      valorOriginal,
      valorCorrecto,
      motivo,
      estado: "pendiente",
      createdBy: usuario.uid,
    });
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
      });
      await addDocument(orgId, "movements", ajuste);
    }
    return updateDocument(orgId, "correctionRequests", request.id, {
      estado: "aprobada",
      resolvedBy: usuario.uid,
      resolvedAt: new Date().toISOString(),
    });
  }

  async function rechazarCorreccion(request, motivoRechazo = "") {
    return updateDocument(orgId, "correctionRequests", request.id, {
      estado: "rechazada",
      motivoRechazo,
      resolvedBy: usuario.uid,
      resolvedAt: new Date().toISOString(),
    });
  }

  return { corrections, loading, solicitarCorreccion, aprobarCorreccion, rechazarCorreccion };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
