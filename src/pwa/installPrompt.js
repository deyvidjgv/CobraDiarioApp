/**
 * Estado global de instalación de la PWA.
 *
 * El evento `beforeinstallprompt` se dispara a los pocos segundos de cargar
 * la app — mucho antes de que el usuario llegue a la pantalla de Ajustes.
 * Si el listener vivía solo en esa pantalla, el evento se perdía y el botón
 * "Instalar app" quedaba siempre deshabilitado. Aquí se captura desde el
 * arranque (initInstallPrompt en main.jsx) y cualquier pantalla se
 * suscribe al estado.
 */

let deferredPrompt = null;
let installed = false;
const listeners = new Set();

function notificar() {
  listeners.forEach((cb) => cb(getEstado()));
}

export function getEstado() {
  return { puedeInstalar: !!deferredPrompt && !installed, instalada: installed };
}

export function suscribirInstalacion(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function yaInstalada() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
}

/** Detecta iOS (Safari no soporta beforeinstallprompt). */
export function esIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPadOS
}

export function initInstallPrompt() {
  if (typeof window === "undefined" || initInstallPrompt._hecho) return;
  initInstallPrompt._hecho = true;

  installed = yaInstalada();

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installed = false;
    notificar();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installed = true;
    notificar();
  });
}

/** Muestra el diálogo nativo de instalación. Retorna true si aceptó. */
export async function pedirInstalacion() {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  try {
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      deferredPrompt = null;
      installed = true;
      notificar();
      return true;
    }
  } catch {
    /* el navegador maneja el resto */
  }
  return false;
}
