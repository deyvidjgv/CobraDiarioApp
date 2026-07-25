import { useState, useEffect } from "react";
import { where, orderBy, Timestamp } from "firebase/firestore";
import {
  subscribeToCollection,
  addDocument,
  setDocument,
  deleteDocument,
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

  /**
   * Elimina TODOS los movimientos del día actual de Firestore.
   * Solo borra los que fueron creados manualmente (gasto / ingreso_base).
   * Los cobros (tipo "cobro") NO se tocan — viven en los préstamos.
   * Si quieres limpiar TODO sin excepción pasa `soloManuales = false`.
   */
  async function limpiarDia(soloManuales = true) {
    const aEliminar = soloManuales
      ? movements.filter(
          (m) => m.tipo === "gasto" || m.tipo === "ingreso_base" || m.tipo === "ajuste"
        )
      : movements;

    await Promise.all(aEliminar.map((m) => deleteDocument(orgId, "movements", m.id)));
  }

  return { movements, loading, saldo, addMovement, cerrarCaja, limpiarDia };
}
