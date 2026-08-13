import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { UIProvider } from "./context/UIContext";

import Login from "./pages/Login/Login";
import Inicio from "./pages/Inicio/Inicio";
import RutaDelDia from "./pages/RutaDelDia/RutaDelDia";
import Clientes from "./pages/Clientes/Clientes";
import NuevoCliente from "./pages/Clientes/NuevoCliente";
import DetalleCliente from "./pages/Clientes/DetalleCliente";
import NuevoCredito from "./pages/Creditos/NuevoCredito";
import DetalleCredito from "./pages/Creditos/DetalleCredito";
import RegistrarCobro from "./pages/RegistrarCobro/RegistrarCobro";
import Reportes from "./pages/Reportes/Reportes";
import Caja from "./pages/Caja/Caja";
import Configuracion from "./pages/Configuracion/Configuracion";
import Cobradiarios from "./pages/Cobradiarios/Cobradiarios";
import NuevoCobradiario from "./pages/Cobradiarios/NuevoCobradiario";

function ProtectedLayout({ children }) {
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

// Gestión de cobradiarios es exclusiva del Admin (Plan Maestro, sección 5).
function AdminOnly({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<ProtectedLayout><Inicio /></ProtectedLayout>} />
      <Route path="/ruta" element={<ProtectedLayout><RutaDelDia /></ProtectedLayout>} />
      <Route path="/cobro/:loanId" element={<ProtectedLayout><RegistrarCobro /></ProtectedLayout>} />
      <Route path="/clientes" element={<ProtectedLayout><Clientes /></ProtectedLayout>} />
      <Route path="/clientes/nuevo" element={<ProtectedLayout><NuevoCliente /></ProtectedLayout>} />
      <Route path="/clientes/:clientId" element={<ProtectedLayout><DetalleCliente /></ProtectedLayout>} />
      <Route path="/creditos/nuevo" element={<ProtectedLayout><NuevoCredito /></ProtectedLayout>} />
      <Route path="/creditos/:loanId" element={<ProtectedLayout><DetalleCredito /></ProtectedLayout>} />
      <Route path="/reportes" element={<ProtectedLayout><Reportes /></ProtectedLayout>} />
      <Route path="/caja" element={<ProtectedLayout><Caja /></ProtectedLayout>} />
      <Route path="/configuracion" element={<ProtectedLayout><Configuracion /></ProtectedLayout>} />
      <Route path="/cobradiarios" element={<ProtectedLayout><AdminOnly><Cobradiarios /></AdminOnly></ProtectedLayout>} />
      <Route path="/cobradiarios/nuevo" element={<ProtectedLayout><AdminOnly><NuevoCobradiario /></AdminOnly></ProtectedLayout>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <UIProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-surface-1 text-gray-800 font-sans antialiased flex flex-col">
            <AppRoutes />
          </div>
        </BrowserRouter>
      </UIProvider>
    </AuthProvider>
  );
}
