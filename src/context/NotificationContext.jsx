import { createContext, useContext, useEffect, useRef, useState } from "react";
import { where } from "firebase/firestore";
import { subscribeToCollection } from "../firebase/firestore";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

/**
 * Beep de dos tonos generado con Web Audio API — sin archivo de audio.
 * El AudioContext se crea perezoso y una sola vez: crearlo antes de que
 * el usuario haya interactuado con la página dispara el bloqueo de
 * autoplay de los navegadores, así que se instancia recién al primer beep.
 */
function reproducirBeep(audioCtxRef) {
  if (!audioCtxRef.current) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtxRef.current = new Ctx();
  }
  const ctx = audioCtxRef.current;
  if (ctx.state === "suspended") ctx.resume();

  const tonos = [880, 660];
  tonos.forEach((freq, i) => {
    const inicio = ctx.currentTime + i * 0.16;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, inicio);
    gain.gain.exponentialRampToValueAtTime(0.2, inicio + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(inicio);
    osc.stop(inicio + 0.15);
  });
}

/**
 * Aviso al Admin de solicitudes de corrección pendientes: punto en el nav
 * + beep cuando llega una nueva, mientras la app está abierta (no es push
 * del sistema operativo — para eso haría falta Firebase Cloud Messaging).
 * Montado una sola vez en App.jsx, fuera de <Routes>, para que el listener
 * no se reabra en cada navegación entre pantallas del Admin.
 */
export function NotificationProvider({ children }) {
  const { orgId, isAdmin } = useAuth();
  const [pendingCorrectionsCount, setPendingCorrectionsCount] = useState(0);
  const idsVistos = useRef(null); // null = aún no llegó el primer snapshot
  const audioCtxRef = useRef(null);

  useEffect(() => {
    if (!orgId || !isAdmin) {
      setPendingCorrectionsCount(0);
      idsVistos.current = null;
      return;
    }

    const unsub = subscribeToCollection(
      orgId,
      "correctionRequests",
      [where("estado", "==", "pendiente")],
      (docs) => {
        const idsActuales = new Set(docs.map((d) => d.id));
        // El primer snapshot solo pinta el punto: si ya avisara con sonido
        // aquí, sonaría cada vez que el Admin abre la app y ya había
        // solicitudes pendientes de antes.
        if (idsVistos.current) {
          const hayNueva = [...idsActuales].some((id) => !idsVistos.current.has(id));
          if (hayNueva) reproducirBeep(audioCtxRef);
        }
        idsVistos.current = idsActuales;
        setPendingCorrectionsCount(docs.length);
      }
    );
    return unsub;
  }, [orgId, isAdmin]);

  return (
    <NotificationContext.Provider value={{ pendingCorrectionsCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications debe usarse dentro de <NotificationProvider>");
  return ctx;
}
