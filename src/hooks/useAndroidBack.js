import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUI } from "../context/UIContext";

/**
 * Hook para manejar el botón atrás físico o por gestos en Android (PWA).
 * Implementa el patrón de centinela con pushState para evitar que el navegador cierre la app
 * por error cuando no queda historial de React Router.
 * 
 * @param {Object} params
 * @param {boolean} params.modalOpen - Indica si hay un modal abierto en la pantalla actual
 * @param {Function} params.closeModal - Función para cerrar el modal abierto
 * @param {boolean} params.showBack - Si la pantalla actual tiene botón volver natural en el Header
 * @param {string|null} params.backTo - Ruta fija a la que debe ir el botón volver
 * @param {boolean} params.loading - Indica si la página está cargando y debe ignorarse el back
 */
export function useAndroidBack({ modalOpen = false, closeModal = () => {}, showBack = false, backTo = null, loading = false } = {}) {
  const { drawerOpen, setDrawerOpen } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const [backPressedOnce, setBackPressedOnce] = useState(false);

  useEffect(() => {
    // 5. En /login, comportamiento normal del navegador (sin patrón doble pulsación ni centinela)
    if (location.pathname === "/login") return;

    // Insertar centinela en la historia actual para poder atrapar el evento popstate
    if (!window.history.state?.androidBackSentinel) {
      window.history.pushState(
        { ...window.history.state, androidBackSentinel: true },
        "",
        window.location.href
      );
    }

    const handlePopState = (event) => {
      // 1. Prioridad: Cerrar Modal
      if (modalOpen) {
        window.history.pushState(
          { ...window.history.state, androidBackSentinel: true },
          "",
          window.location.href
        );
        closeModal();
        return;
      }

      // 2. Prioridad: Cerrar Drawer
      if (drawerOpen) {
        window.history.pushState(
          { ...window.history.state, androidBackSentinel: true },
          "",
          window.location.href
        );
        setDrawerOpen(false);
        return;
      }

      // 2.5 Prioridad: durante carga, no navegar a ninguna parte
      if (loading) {
        window.history.pushState(
          { ...window.history.state, androidBackSentinel: true },
          "",
          window.location.href
        );
        return;
      }

      // 3. Prioridad: Botón volver normal (si showBack es true)
      if (showBack) {
        if (backTo) {
          navigate(backTo, { replace: true });
        } else {
          navigate(-1);
        }
        return;
      }

      // 4. Prioridad: Pantallas raíz menú principal
      const isRoot = location.pathname === "/" || location.pathname === "/ruta";
      if (isRoot) {
        if (!backPressedOnce) {
          window.history.pushState(
            { ...window.history.state, androidBackSentinel: true },
            "",
            window.location.href
          );
          setBackPressedOnce(true);
          mostrarAviso("Presiona atrás de nuevo para salir");
          
          setTimeout(() => {
            setBackPressedOnce(false);
          }, 2000);
        } else {
          // Salir de la app al permitir que retroceda al historial vacío
          window.history.back();
        }
        return;
      }

      // Fallback: para cualquier otra pantalla raíz secundaria que no tenga showBack explícito
      navigate(-1);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [location.pathname, modalOpen, closeModal, drawerOpen, setDrawerOpen, showBack, backTo, loading, backPressedOnce, navigate]);
}

/**
 * Muestra un aviso en pantalla estilo Toast.
 */
function mostrarAviso(mensaje) {
  const div = document.createElement("div");
  div.textContent = mensaje;
  div.style.position = "fixed";
  div.style.bottom = "30px";
  div.style.left = "50%";
  div.style.transform = "translateX(-50%)";
  div.style.backgroundColor = "rgba(38, 33, 92, 0.9)"; // text-primary approx
  div.style.color = "white";
  div.style.padding = "10px 20px";
  div.style.borderRadius = "20px";
  div.style.fontSize = "14px";
  div.style.fontWeight = "500";
  div.style.zIndex = "9999";
  div.style.transition = "opacity 0.3s ease-in-out";
  div.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  div.style.pointerEvents = "none";
  document.body.appendChild(div);

  setTimeout(() => {
    div.style.opacity = "0";
    setTimeout(() => div.remove(), 300);
  }, 2000);
}
