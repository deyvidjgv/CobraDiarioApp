import { useEffect, useState } from "react";
import { where, orderBy } from "firebase/firestore";
import { subscribeToCollection, addDocument } from "../firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { getColombiaDateKey } from "../logic/dateUtils";

/** Resultados posibles de una visita de ruta (Plan Maestro, sección "visits") */
export const RESULTADOS_VISITA = {
  COBRO: "cobro",
  NO_PAGO: "no_pago",
  NO_ENCONTRADO: "no_encontrado",
  PROMESA_PAGO: "promesa_pago",
};

/**
 * Visita de ruta: registro inmutable de cada gestión presencial con GPS
 * y resultado. Se consulta por día para reconstruir la actividad de la ruta.
 */
export function useVisits(fechaStr = null) {
  const { orgId, usuario, isCobradiario } = useAuth();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  const dateKey = fechaStr || getColombiaDateKey();

  useEffect(() => {
    if (!orgId) return;
    const constraints = [
      where("fecha", "==", dateKey),
      ...(isCobradiario ? [where("cobradiarioId", "==", usuario.uid)] : []),
      orderBy("createdAt", "desc"),
    ];
    const unsub = subscribeToCollection(orgId, "visits", constraints, (docs) => {
      setVisits(docs);
      setLoading(false);
    });
    return unsub;
  }, [orgId, dateKey, isCobradiario, usuario?.uid]);

  /**
   * Registra una visita. Si no se pasa ubicacion intenta capturar el GPS
   * del dispositivo; si falla, registra la visita sin coordenadas (la
   * gestión importa más que el GPS).
   */
  async function registrarVisita({ clientId, loanId = null, resultado, nota = null, ubicacion = undefined }) {
    let geo = ubicacion ?? null;
    if (geo === undefined && typeof navigator !== "undefined" && navigator.geolocation) {
      geo = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null), // sin permiso o sin señal: visita sin GPS
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });
    }
    return addDocument(orgId, "visits", {
      clientId,
      loanId,
      resultado,
      nota,
      ubicacion: geo,
      fecha: dateKey,
      hora: new Date().toISOString(),
      cobradiarioId: usuario.uid,
      createdBy: usuario.uid,
    });
  }

  return { visits, loading, registrarVisita };
}
