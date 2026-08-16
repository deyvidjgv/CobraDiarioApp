import { createContext, useContext, useEffect, useRef, useState } from "react";

const UIContext = createContext(null);

const NAV_COLLAPSED_KEY = "sidenav-collapsed";
/** Ancho de pantalla por debajo del cual la barra arranca contraída */
const UMBRAL_AUTO_COLAPSO = 1280;

function preferenciaGuardada() {
  try {
    return localStorage.getItem(NAV_COLLAPSED_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Estado de UI global:
 *  - drawerOpen: menú lateral en móvil (overlay)
 *  - navCollapsed: barra lateral estática de escritorio contraída.
 *
 * Comportamiento de la barra estática:
 *  - Si el usuario la expande/contrae con las flechas, esa preferencia se
 *    GUARDA en localStorage y se respeta siempre.
 *  - Si no hay preferencia guardada, se adapta a la pantalla mientras la
 *    página está abierta: contraída en escritorios angostos (< 1280px)
 *    y expandida en pantallas amplias, incluyendo cambios de tamaño.
 */
export function UIProvider({ children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const guardadaRef = useRef(preferenciaGuardada());
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(NAV_COLLAPSED_KEY);
      if (saved !== null) return saved === "1";
    } catch {
      /* sin almacenamiento */
    }
    return typeof window !== "undefined" && window.innerWidth < UMBRAL_AUTO_COLAPSO;
  });

  // Adaptación en vivo solo cuando el usuario no ha fijado una preferencia
  useEffect(() => {
    const onResize = () => {
      if (guardadaRef.current) return;
      setNavCollapsed(window.innerWidth < UMBRAL_AUTO_COLAPSO);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /** Expande/contrae la barra y guarda la preferencia del usuario. */
  const toggleNavCollapsed = () =>
    setNavCollapsed((valor) => {
      const nuevo = !valor;
      guardadaRef.current = true;
      try {
        localStorage.setItem(NAV_COLLAPSED_KEY, nuevo ? "1" : "0");
      } catch {
        /* sin almacenamiento: solo aplica en esta sesión */
      }
      return nuevo;
    });

  return (
    <UIContext.Provider
      value={{ drawerOpen, setDrawerOpen, navCollapsed, toggleNavCollapsed }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI debe usarse dentro de un UIProvider");
  }
  return context;
}
