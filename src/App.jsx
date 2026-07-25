import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import BottomNav from "./components/layout/BottomNav";

import Login from "./pages/Login/Login";
import Inicio from "./pages/Inicio/Inicio";
import RutaDelDia from "./pages/RutaDelDia/RutaDelDia";
import Clientes from "./pages/Clientes/Clientes";
import NuevoCliente from "./pages/Clientes/NuevoCliente";
import NuevoCredito from "./pages/Creditos/NuevoCredito";
import DetalleCredito from "./pages/Creditos/DetalleCredito";
import RegistrarCobro from "./pages/RegistrarCobro/RegistrarCobro";
import Reportes from "./pages/Reportes/Reportes";
import Caja from "./pages/Caja/Caja";
import Configuracion from "./pages/Configuracion/Configuracion";

function ProtectedLayout({ children }) {
  const { usuario, cargando } = useAuth();

  if (cargando) return <div className="p-6 text-sm text-gray-500">Cargando...</div>;
  if (!usuario) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen pb-16">
      {children}
      <BottomNav />
    </div>
  );
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
      <Route path="/creditos/nuevo" element={<ProtectedLayout><NuevoCredito /></ProtectedLayout>} />
      <Route path="/creditos/:loanId" element={<ProtectedLayout><DetalleCredito /></ProtectedLayout>} />
      <Route path="/reportes" element={<ProtectedLayout><Reportes /></ProtectedLayout>} />
      <Route path="/caja" element={<ProtectedLayout><Caja /></ProtectedLayout>} />
      <Route path="/configuracion" element={<ProtectedLayout><Configuracion /></ProtectedLayout>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
