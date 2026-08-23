import { getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import {
  updateDocument,
  subCollection,
  getBatch,
  documentRef,
  getDocument,
} from "../firebase/firestore";
import { useAudit, ACCIONES_AUDIT } from "./useAudit";
import { formatearMonto } from "../logic/formato";

// Firestore limita "in" a 30 valores por consulta — se agrupan los ids en
// bloques de ese tamaño para no romper con créditos muy longevos.
function agruparDe30(items) {
  const grupos = [];
  for (let i = 0; i < items.length; i += 30) grupos.push(items.slice(i, i + 30));
  return grupos;
}

export function useLoanActions() {
  const { orgId, isAdmin, usuario } = useAuth();
  const { registrarEvento } = useAudit();

  async function anularLoan(id) {
    if (!orgId) throw new Error("No orgId");
    const loan = await getDocument(orgId, "loans", id);
    const ref = await updateDocument(orgId, "loans", id, { estado: "anulado" });
    registrarEvento(ACCIONES_AUDIT.CREDITO_ANULADO, {
      entidad: "loans",
      entidadId: id,
      detalle: loan
        ? `Capital $${formatearMonto(loan.capital)} · saldo $${formatearMonto(loan.saldoPendiente ?? 0)} — historial intacto`
        : null,
    });
    return ref;
  }

  /**
   * Elimina un crédito y todos sus movimientos asociados.
   * RESTRINGIDO: solo el Admin puede ejecutar esta operación y queda
   * registrado en auditoría con los datos del crédito destruido.
   * Para conservar el historial, preferir `anularLoan`.
   */
  async function deleteLoan(id) {
    if (!orgId) throw new Error("No orgId");
    if (!isAdmin) throw new Error("Solo el Administrador puede eliminar créditos");

    // Capturar los datos antes de borrar para la trazabilidad
    const loan = await getDocument(orgId, "loans", id);

    const movementsRef = subCollection(orgId, "movements");
    const qAll = query(movementsRef, where("referencia", "==", id));
    const snapAll = await getDocs(qAll);
    const movementIds = snapAll.docs.map((docSnap) => docSnap.id);

    // Los "Ajuste" de correcciones aprobadas no referencian el crédito —
    // referencian el movimiento que corrigieron (ver useCorrections.js).
    // Sin esto quedaban huérfanos, contando en la caja de un cobro que ya
    // no existe (así se vio el saldo del día quedar negativo).
    const ajustesHuerfanos = [];
    const solicitudesPendientes = [];
    for (const grupo of agruparDe30(movementIds)) {
      if (grupo.length === 0) continue;
      const [snapAjustes, snapPendientes] = await Promise.all([
        getDocs(query(movementsRef, where("tipo", "==", "ajuste"), where("referencia", "in", grupo))),
        getDocs(
          query(
            subCollection(orgId, "correctionRequests"),
            where("movementId", "in", grupo),
            where("estado", "==", "pendiente")
          )
        ),
      ]);
      ajustesHuerfanos.push(...snapAjustes.docs);
      solicitudesPendientes.push(...snapPendientes.docs);
    }

    const operaciones = [
      ...snapAll.docs.map((docSnap) => ({ tipo: "delete", ref: documentRef(orgId, "movements", docSnap.id) })),
      ...ajustesHuerfanos.map((docSnap) => ({ tipo: "delete", ref: documentRef(orgId, "movements", docSnap.id) })),
      ...solicitudesPendientes.map((docSnap) => ({
        tipo: "update",
        ref: documentRef(orgId, "correctionRequests", docSnap.id),
        data: {
          estado: "rechazada",
          motivoRechazo: "Movimiento eliminado junto con el crédito",
          resolvedBy: usuario.uid,
          resolvedAt: new Date().toISOString(),
        },
      })),
    ];

    for (let inicio = 0; inicio < operaciones.length; inicio += 400) {
      const batch = getBatch();
      for (const operacion of operaciones.slice(inicio, inicio + 400)) {
        if (operacion.tipo === "delete") batch.delete(operacion.ref);
        else batch.update(operacion.ref, operacion.data);
      }
      await batch.commit();
    }

    const loanBatch = getBatch();
    loanBatch.delete(documentRef(orgId, "loans", id));
    await loanBatch.commit();

    const clienteNombre = snapAll.docs.find((d) => d.data().clienteNombre)?.data().clienteNombre;

    registrarEvento(ACCIONES_AUDIT.CREDITO_ELIMINADO, {
      entidad: "loans",
      entidadId: id,
      detalle: loan
        ? `${clienteNombre || "Cliente"} · capital $${formatearMonto(loan.capital)} · saldo $${formatearMonto(
            loan.saldoPendiente ?? 0
          )} · ${snapAll.docs.length + ajustesHuerfanos.length} movimientos borrados` +
          (solicitudesPendientes.length
            ? ` · ${solicitudesPendientes.length} solicitud(es) de corrección rechazada(s) automáticamente`
            : "")
        : `${snapAll.docs.length} movimientos borrados`,
    });
  }

  return { anularLoan, deleteLoan };
}
