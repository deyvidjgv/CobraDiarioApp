import { useState, useEffect } from "react";
import { where, orderBy } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { subscribeToCollection } from "../firebase/firestore";
import { TIPOS_MOVIMIENTO } from "../logic/caja";

/**
 * Hook para obtener el historial de cobros de un crédito específico.
 * Se suscribe en tiempo real a los cambios.
 * @param {string} loanId - ID del crédito
 */
export function usePaymentHistory(loanId) {
  const { orgId } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || !loanId) {
      setLoading(false);
      return;
    }

    // Suscribirse a todos los movimientos de este crédito y filtrar cobros
    const unsub = subscribeToCollection(
      orgId,
      "movements",
      [where("referencia", "==", loanId), orderBy("fecha", "desc")],
      (docs) => {
        // Filtrar solo cobros en el callback
        const cobros = docs.filter((doc) => doc.tipo === TIPOS_MOVIMIENTO.COBRO);
        setPayments(cobros);
        setLoading(false);
      }
    );

    return unsub;
  }, [orgId, loanId]);

  return { payments, loading };
}
