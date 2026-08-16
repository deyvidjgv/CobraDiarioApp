import { useState, useEffect } from "react";
import { where, orderBy, Timestamp } from "firebase/firestore";
import {
  subscribeToCollection,
  addDocument,
  deleteDocument,
} from "../firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { calcularSaldo, TIPOS_MOVIMIENTO } from "../logic/caja";

/**
 * Hook para los movimientos de caja de un día.
 * @param {string|null} fechaStr — "YYYY-MM-DD" o null para hoy
 * @param {string|null} cobradiarioUid — filtro del Admin por cobradiario
 *   (los cobradiarios siempre ven solo los suyos, por rol)
 */
export function useMovements(fechaStr = null, cobradiarioUid = null) {
  const { orgId, usuario, isCobradiario } = useAuth();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  const dateKey = fechaStr || new Date().toISOString().split("T")[0];
  const dueno = isCobradiario ? usuario.uid : cobradiarioUid;

  useEffect(() => {
    if (!orgId) return;

    const [y, m, d] = dateKey.split("-").map(Number);
    const start = new Date(y, m - 1, d);
    const end = new Date(y, m - 1, d + 1);

    const constraints = [
      where("fecha", ">=", Timestamp.fromDate(start)),
      where("fecha", "<", Timestamp.fromDate(end)),
      ...(dueno ? [where("cobradiarioId", "==", dueno)] : []),
      orderBy("fecha", "desc"),
    ];

    const unsub = subscribeToCollection(orgId, "movements", constraints, (docs) => {
      setMovements(docs);
      setLoading(false);
    });
    return unsub;
  }, [orgId, dateKey, dueno]);

  const saldo = calcularSaldo(movements);

  async function addMovement(data) {
    const enriched = {
      ...data,
      cobradiarioId: data.cobradiarioId || usuario.uid,
      createdBy: data.createdBy || usuario.uid,
    };
    return addDocument(orgId, "movements", enriched);
  }

  /**
   * Elimina UN movimiento puntual (para corregir un error de captura).
   * Solo permite borrar movimientos manuales (gasto / ingreso_base / ajuste).
   * Los cobros y prestamos nuevos NUNCA se eliminan aqui - representan
   * dinero real ya entregado o cobrado; si algo esta mal, se corrige
   * con un movimiento de tipo "ajuste", nunca borrando el original.
   */
  async function deleteMovement(movementId) {
    const mov = movements.find((m) => m.id === movementId);
    if (!mov) throw new Error("Movimiento no encontrado");
    const permitido = [
      TIPOS_MOVIMIENTO.GASTO,
      TIPOS_MOVIMIENTO.INGRESO_BASE,
      TIPOS_MOVIMIENTO.AJUSTE,
    ];
    if (!permitido.includes(mov.tipo)) {
      throw new Error(
        "Solo se pueden eliminar movimientos manuales (gasto/base/ajuste). Los cobros y préstamos no se pueden borrar, para preservar el historial."
      );
    }
    return deleteDocument(orgId, "movements", movementId);
  }

  return { movements, loading, saldo, addMovement, deleteMovement };
}
