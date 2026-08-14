import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ProtectedLayout from "./ProtectedLayout";

/**
 * Panel exclusivo del Admin (Plan Maestro, sección 5 y Fase 4).
 * Envuelve ProtectedLayout (sesión activa) y además exige role === "admin";
 * un cobradiario autenticado que intente entrar es redirigido al panel
 * operativo ("/").
 */
export default function AdminLayout({ children }) {
  const { cargando, isAdmin } = useAuth();

  return (
    <ProtectedLayout>
      {!cargando && !isAdmin ? <Navigate to="/" replace /> : children}
    </ProtectedLayout>
  );
}
