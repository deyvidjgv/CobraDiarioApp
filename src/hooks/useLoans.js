import { useState, useEffect } from "react";
import { where, orderBy } from "firebase/firestore";
import {
  subscribeToCollection,
  addDocument,
  updateDocument,
  getDocument,
} from "../firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { construirMovimiento, TIPOS_MOVIMIENTO } from "../logic/caja";

export function useLoans(filterActive = true) {
  const { orgId } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    const constraints = filterActive
      ? [where("estado", "==", "activo"), orderBy("fechaInicio", "desc")]
      : [orderBy("fechaInicio", "desc")];

    const unsub = subscribeToCollection(orgId, "loans", constraints, (docs) => {
      setLoans(docs);
      setLoading(false);
    });
    return unsub;
  }, [orgId, filterActive]);

  /** Crea el crédito y registra el movimiento prestamo_nuevo en el ledger */
  async function addLoan(loanData) {
    const loanRef = await addDocument(orgId, "loans", loanData);
    const mov = construirMovimiento({
      tipo: TIPOS_MOVIMIENTO.PRESTAMO_NUEVO,
      monto: loanData.capital,
      orgId,
      referencia: loanRef.id,
      nota: `Nuevo crédito — Capital: $${loanData.capital}`,
    });
    await addDocument(orgId, "movements", mov);
    return loanRef;
  }

  /** Registra un pago: actualiza saldo del crédito + crea movimiento cobro */
  async function registerPayment(loanId, monto) {
    const loan = await getDocument(orgId, "loans", loanId);
    if (!loan) throw new Error("Crédito no encontrado");

    const nuevoSaldo = Math.max(0, round2((loan.saldoPendiente ?? 0) - monto));
    const updates = { saldoPendiente: nuevoSaldo };
    if (nuevoSaldo <= 0) updates.estado = "completado";

    await updateDocument(orgId, "loans", loanId, updates);

    const mov = construirMovimiento({
      tipo: TIPOS_MOVIMIENTO.COBRO,
      monto,
      orgId,
      referencia: loanId,
      nota: `Cobro crédito`,
    });
    await addDocument(orgId, "movements", mov);
  }

  async function updateLoan(id, data) {
    return updateDocument(orgId, "loans", id, data);
  }

  return { loans, loading, addLoan, registerPayment, updateLoan };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
