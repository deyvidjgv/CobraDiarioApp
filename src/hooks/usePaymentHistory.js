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
  const { orgId, usuario, isCobradiario } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || !loanId) {
      setLoading(false);
      return;
    }

    // Suscribirse a todos los movimientos de este crédito y filtrar cobros.
    // "Las reglas no son filtros": la query debe pedir solo lo que el rol
    // puede leer, o Firestore niega el listener completo.
    const unsub = subscribeToCollection(
      orgId,
      "movements",
      [
        where("referencia", "==", loanId),
        ...(isCobradiario ? [where("cobradiarioId", "==", usuario.uid)] : []),
        orderBy("fecha", "desc"),
      ],
      (docs) => {
        // Filtrar solo cobros en el callback
        const cobros = docs.filter((doc) => doc.tipo === TIPOS_MOVIMIENTO.COBRO);
        setPayments(cobros);
        setLoading(false);
      }
    );

    return unsub;
  }, [orgId, loanId, isCobradiario, usuario?.uid]);

  return { payments, loading };
}
