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

export function useLoanActions() {
  const { orgId, isAdmin } = useAuth();
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

    const ref = subCollection(orgId, "movements");
    const qAll = query(ref, where("referencia", "==", id));
    const snapAll = await getDocs(qAll);

    const batch = getBatch();

    snapAll.docs.forEach(docSnap => {
      batch.delete(documentRef(orgId, "movements", docSnap.id));
    });

    batch.delete(documentRef(orgId, "loans", id));

    await batch.commit();

    registrarEvento(ACCIONES_AUDIT.CREDITO_ELIMINADO, {
      entidad: "loans",
      entidadId: id,
      detalle: loan
        ? `Cliente ${loan.clientId ?? "—"} · capital $${formatearMonto(loan.capital)} · saldo $${formatearMonto(
            loan.saldoPendiente ?? 0
          )} · ${snapAll.docs.length} movimientos borrados`
        : `${snapAll.docs.length} movimientos borrados`,
    });
  }

  return { anularLoan, deleteLoan };
}
