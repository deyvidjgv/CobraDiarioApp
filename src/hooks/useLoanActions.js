import { getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import {
  updateDocument,
  subCollection,
  getBatch,
  documentRef,
} from "../firebase/firestore";
import { TIPOS_MOVIMIENTO } from "../logic/caja";

export function useLoanActions() {
  const { orgId } = useAuth();

  async function anularLoan(id) {
    if (!orgId) throw new Error("No orgId");
    return updateDocument(orgId, "loans", id, { estado: "anulado" });
  }

  async function deleteLoan(id) {
    if (!orgId) throw new Error("No orgId");
    const ref = subCollection(orgId, "movements");
    
    // Obtener absolutamente todos los movimientos vinculados a este crédito
    // (prestamo_nuevo, seguro, recargo_vencimiento, cobro, etc.)
    const qAll = query(ref, where("referencia", "==", id));
    const snapAll = await getDocs(qAll);
    
    const batch = getBatch();
    
    // Eliminar cada movimiento para no dejar registros huérfanos en la caja
    snapAll.docs.forEach(docSnap => {
      batch.delete(documentRef(orgId, "movements", docSnap.id));
    });

    // Eliminar el documento del crédito
    batch.delete(documentRef(orgId, "loans", id));

    await batch.commit();
  }

  return { anularLoan, deleteLoan };
}
