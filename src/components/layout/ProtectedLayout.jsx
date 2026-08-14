import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * Layout base para cualquier ruta que requiera sesión activa.
 * Solo valida autenticación (no rol) — AdminLayout y CobradiarioLayout
 * lo envuelven para agregar la restricción de rol correspondiente
 * (Plan Maestro, Fase 4).
 */
export default function ProtectedLayout({ children }) {
  const { usuario, cargando } = useAuth();

  if (cargando)
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-1">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-light/40 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  if (!usuario) return <Navigate to="/login" replace />;

  return (
    <div className="flex-1 flex flex-col bg-surface-1 min-h-screen relative">
      <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
