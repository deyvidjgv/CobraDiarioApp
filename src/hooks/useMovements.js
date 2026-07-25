import { useState, useEffect } from "react";
import { where, orderBy, Timestamp } from "firebase/firestore";
import {
  subscribeToCollection,
  addDocument,
  setDocument,
} from "../firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { calcularSaldo, construirCierreDiario } from "../logic/caja";

/**
 * Hook para los movimientos de caja de un día.
 * @param {string|null} fechaStr — "YYYY-MM-DD" o null para hoy
 */
export function useMovements(fechaStr = null) {
  const { orgId } = useAuth();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  const dateKey = fechaStr || new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!orgId) return;

    const [y, m, d] = dateKey.split("-").map(Number);
    const start = new Date(y, m - 1, d);
    const end = new Date(y, m - 1, d + 1);

    const constraints = [
      where("fecha", ">=", Timestamp.fromDate(start)),
      where("fecha", "<", Timestamp.fromDate(end)),
      orderBy("fecha", "desc"),
    ];

    const unsub = subscribeToCollection(orgId, "movements", constraints, (docs) => {
      setMovements(docs);
      setLoading(false);
    });
    return unsub;
  }, [orgId, dateKey]);

  const saldo = calcularSaldo(movements);

  async function addMovement(data) {
    return addDocument(orgId, "movements", data);
  }

  /** Guarda el snapshot en daily_closings usando la fecha como ID */
  async function cerrarCaja() {
    const cierre = construirCierreDiario(movements, new Date());
    await setDocument(orgId, "daily_closings", dateKey, cierre);
    return cierre;
  }

  return { movements, loading, saldo, addMovement, cerrarCaja };
}
