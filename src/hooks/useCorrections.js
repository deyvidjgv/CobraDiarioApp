import { useEffect, useState } from "react";
import { where, orderBy } from "firebase/firestore";
import {
  subscribeToCollection,
  addDocument,
  updateDocument,
  getDocument,
  documentRef,
  newDocRef,
  runInTransaction,
  txGet,
  wSet,
  wUpdate,
} from "../firebase/firestore";
import { construirMovimiento, TIPOS_MOVIMIENTO } from "../logic/caja";
import { round2 } from "../logic/formato";
import { useAudit, ACCIONES_AUDIT } from "./useAudit";
import { useAuth } from "../context/AuthContext";

/**
 * Solicitudes de corrección sobre un movimiento/cobro ya registrado
 * (Plan Maestro, sección 11). No se edita ni se borra el movimiento
 * original: el cobradiario (o el admin) pide la corrección con el valor
 * correcto y el motivo, y el Admin la aprueba o rechaza. Al aprobar se
 * crea un movimiento de ajuste que compensa la diferencia en caja, dejando
 * el original intacto y la corrección trazable. Si el movimiento corregido
 * era un cobro ligado a un crédito, también se ajusta `saldoPendiente` del
 * crédito por la misma diferencia — de lo contrario la caja queda cuadrada
 * pero el cliente sigue debiendo (o pagado de más) según el monto original
 * equivocado.
 */
export function useCorrections() {
  const { orgId, usuario, isCobradiario } = useAuth();
  const { registrarEvento } = useAudit();
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    // "Las reglas no son filtros": el cobradiario solo puede leer sus
    // propias solicitudes, así que la query debe filtrar por creador.
    const unsub = subscribeToCollection(
      orgId,
      "correctionRequests",
      [
        ...(isCobradiario ? [where("createdBy", "==", usuario.uid)] : []),
        orderBy("createdAt", "desc"),
      ],
      (docs) => {
        setCorrections(docs);
        setLoading(false);
      }
    );
    return unsub;
  }, [orgId, isCobradiario, usuario?.uid]);

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

  /**
   * Aprobar una corrección es una operación financiera (ajusta caja y el
   * saldo del crédito), así que corre dentro de una transacción que vuelve
   * a leer `correctionRequests/{id}` y aborta si ya no está "pendiente" —
   * sin esto, dos aprobaciones casi simultáneas (dos admins, o la misma
   * sesión en dos pestañas) duplicarían el movimiento de ajuste y
   * descontarían el saldo del crédito dos veces.
   */
  async function aprobarCorreccion(request) {
    const diferencia = round2((request.valorCorrecto ?? 0) - (request.valorOriginal ?? 0));
    const requestRef = documentRef(orgId, "correctionRequests", request.id);

    // El movimiento original es inmutable (nunca se edita ni se borra una
    // vez creado), así que leerlo fuera de la transacción es seguro.
    const movOriginal =
      diferencia !== 0 ? await getDocument(orgId, "movements", request.movementId) : null;
    // Solo un cobro ligado a un crédito mueve saldoPendiente; gasto/base/
    // ajuste no tienen crédito asociado y no deben tocar loans.
    const loanId =
      movOriginal?.tipo === TIPOS_MOVIMIENTO.COBRO && movOriginal.referencia
        ? movOriginal.referencia
        : null;
    const loanRef = loanId ? documentRef(orgId, "loans", loanId) : null;
    const ajusteRef = diferencia !== 0 ? newDocRef(orgId, "movements") : null;

    const resultado = await runInTransaction(async (tx) => {
      const reqActual = await txGet(tx, requestRef);
      if (!reqActual) throw new Error("La solicitud de corrección ya no existe.");
      if (reqActual.estado !== "pendiente") {
        throw new Error(`Esta solicitud ya fue resuelta (${reqActual.estado}).`);
      }

      let saldoAntes = null;
      let saldoDespues = null;

      if (diferencia !== 0) {
        if (loanRef) {
          const loan = await txGet(tx, loanRef);
          if (loan) {
            saldoAntes = loan.saldoPendiente ?? 0;
            // Misma fórmula que useLoans.js al registrar un cobro: diferencia
            // positiva (se cobró más de lo registrado) descuenta más saldo;
            // negativa lo sube de vuelta.
            saldoDespues = Math.max(0, round2(saldoAntes - diferencia));
            const loanUpdates = { saldoPendiente: saldoDespues };
            if (saldoDespues <= 0) loanUpdates.estado = "completado";
            else if (loan.estado === "completado") loanUpdates.estado = "activo";
            wUpdate(tx, loanRef, loanUpdates);
          }
        }

        const ajuste = construirMovimiento({
          tipo: TIPOS_MOVIMIENTO.AJUSTE,
          monto: diferencia,
          orgId,
          referencia: request.movementId,
          nota: `Corrección aprobada: ${request.motivo}`,
          cobradiarioId: movOriginal?.cobradiarioId || null,
          createdBy: usuario.uid,
        });
        // Denormalizado para que Caja.jsx pueda mostrar el desglose sin releer.
        ajuste.valorOriginal = request.valorOriginal;
        ajuste.valorCorrecto = request.valorCorrecto;
        wSet(tx, ajusteRef, ajuste);
      }

      wUpdate(tx, requestRef, {
        estado: "aprobada",
        resolvedBy: usuario.uid,
        resolvedAt: new Date().toISOString(),
        ...(loanId ? { loanId, saldoAntes, saldoDespues } : {}),
      });

      return { loanId, saldoAntes, saldoDespues };
    });

    registrarEvento(ACCIONES_AUDIT.CORRECCION_APROBADA, {
      entidad: "correctionRequests",
      entidadId: request.id,
      detalle:
        `Ajuste de $${diferencia} sobre mov ${request.movementId}.` +
        (resultado.loanId ? ` Saldo crédito: $${resultado.saldoAntes} → $${resultado.saldoDespues}.` : "") +
        ` ${request.motivo}`,
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
