import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import SideNav from "./SideNav";
import BottomNav from "./BottomNav";

/**
 * Layout base para cualquier ruta que requiera sesión activa.
 * Escritorio (md+): barra lateral estática. Móvil: barra inferior fija de
 * cinco destinos (BottomNav); el drawer ☰ queda como acceso secundario.
 */
export default function ProtectedLayout({ children }) {
  const { usuario, cargando } = useAuth();
  const { navCollapsed } = useUI();

  if (cargando)
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-1">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-line border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-primary/50">Cargando...</p>
        </div>
      </div>
    );
  if (!usuario) return <Navigate to="/login" replace />;

  return (
    <div className="flex-1 flex flex-col bg-surface-1 min-h-screen relative">
      <SideNav />
      <div
        className={
          "flex-1 w-full transition-[padding] duration-200 " +
          (navCollapsed ? "md:pl-[76px]" : "md:pl-[288px]")
        }
      >
        {/* pb-28 en móvil: espacio para la barra inferior */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-28 md:pb-8">{children}</div>
      </div>
      <BottomNav />
    </div>
  );
}
