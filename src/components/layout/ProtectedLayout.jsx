import { Suspense } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { cerrarSesion } from "../../firebase/auth";
import SideNav from "./SideNav";
import BottomNav from "./BottomNav";

function PageSpinner() {
  return (
    <div className="flex justify-center py-24">
      <div className="w-7 h-7 border-2 border-line border-t-primary rounded-full animate-spin" />
    </div>
  );
}

/**
 * Layout base para cualquier ruta que requiera sesión activa.
 * La navegación principal es el menú ☰ (SideNav, ver ese archivo): un
 * cajón oculto por defecto que se abre desde el Header, igual en móvil
 * y escritorio, para Admin y Cobradiario. Deja el contenido a ancho
 * completo — ya no reserva una franja lateral fija. BottomNav se suma
 * en móvil/tablet (<1024px) como acceso rápido de pulgar a lo más usado.
 */
export default function ProtectedLayout({ children }) {
  const { usuario, cargando, errorSesion } = useAuth();

  if (cargando)
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-1">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-line border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-primary/70">Cargando...</p>
        </div>
      </div>
    );
  if (errorSesion)
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-1 p-4">
        <div className="card max-w-sm w-full p-6 text-center">
          <p className="text-sm text-primary mb-5">{errorSesion}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex-1 py-3 rounded-xl bg-gold text-surface-1 text-sm font-medium hover:bg-gold/90 transition">
              Reintentar
            </button>
            <button
              type="button"
              onClick={() => cerrarSesion()}
              className="flex-1 py-3 rounded-xl border border-line text-sm font-medium text-primary-light hover:text-primary transition">
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  if (!usuario) return <Navigate to="/login" replace />;

  return (
    <div className="flex-1 flex flex-col bg-surface-1 min-h-screen relative">
      <SideNav />
      <div className="flex-1 w-full">
        {/* pb-28 en móvil/tablet: espacio para la barra inferior */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-28 lg:pb-8">
          {/* La navegación queda fija mientras llega el código de la página. */}
          <Suspense fallback={<PageSpinner />}>{children}</Suspense>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
