import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import SideNav from "./SideNav";

/**
 * Layout base para cualquier ruta que requiera sesiÃ³n activa.
 * Solo valida autenticaciÃ³n (no rol) â€” AdminLayout y CobradiarioLayout
 * lo envuelven para agregar la restricciÃ³n de rol correspondiente
 * (Plan Maestro, Fase 4).
 *
 * Incluye la navegaciÃ³n lateral: estÃ¡tica en escritorio (el contenido se
 * desplaza segÃºn estÃ© expandida o colapsada) y overlay en mÃ³vil.
 *
 * OJO: el desplazamiento (md:pl) va en un contenedor dedicado, separado
 * del contenedor con padding horizontal y max-w. Si se combinan en el
 * mismo elemento, lg:px-8 sobrescribe el padding-left y la pÃ¡gina queda
 * debajo del menÃº.
 */
export default function ProtectedLayout({ children }) {
  const { usuario, cargando } = useAuth();
  const { navCollapsed } = useUI();

  if (cargando)
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-1">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-light/40 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-primary-light/70">Cargando...</p>
        </div>
      </div>
    );
  if (!usuario) return <Navigate to="/login" replace />;

  return (
    <div className="flex-1 flex flex-col bg-surface-1 min-h-screen relative">
      <SideNav />
      {/* Desplazamiento segÃºn el estado de la barra lateral estÃ¡tica */}
      <div
        className={`flex-1 w-full transition-[padding] duration-200 ${
          navCollapsed ? "md:pl-[76px]" : "md:pl-[288px]"
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
      </div>
    </div>
  );
}

