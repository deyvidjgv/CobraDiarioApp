import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import SideNav from "./SideNav";
import BottomNav from "./BottomNav";

/**
 * Layout base para cualquier ruta que requiera sesión activa.
 * La navegación principal es el menú ☰ (SideNav, ver ese archivo): un
 * cajón oculto por defecto que se abre desde el Header, igual en móvil
 * y escritorio, para Admin y Cobradiario. Deja el contenido a ancho
 * completo — ya no reserva una franja lateral fija. BottomNav se suma
 * en móvil/tablet (<1024px) como acceso rápido de pulgar a lo más usado.
 */
export default function ProtectedLayout({ children }) {
  const { usuario, cargando } = useAuth();

  if (cargando)
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-1">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-line border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-primary/70">Cargando...</p>
        </div>
      </div>
    );
  if (!usuario) return <Navigate to="/login" replace />;

  return (
    <div className="flex-1 flex flex-col bg-surface-1 min-h-screen relative">
      <SideNav />
      <div className="flex-1 w-full">
        {/* pb-28 en móvil/tablet: espacio para la barra inferior */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-28 lg:pb-8">{children}</div>
      </div>
      <BottomNav />
    </div>
  );
}
