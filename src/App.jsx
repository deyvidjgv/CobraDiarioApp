import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { UIProvider } from "./context/UIContext";
import AdminLayout from "./components/layout/AdminLayout";
import CobradiarioLayout from "./components/layout/CobradiarioLayout";

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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Panel operativo: hoy lo usan Admin y Cobradiario por igual, el
          filtrado de datos por rol se agrega página a página (Fase 5-8). */}
      <Route path="/" element={<CobradiarioLayout><Inicio /></CobradiarioLayout>} />
      <Route path="/ruta" element={<CobradiarioLayout><RutaDelDia /></CobradiarioLayout>} />
      <Route path="/cobro/:loanId" element={<CobradiarioLayout><RegistrarCobro /></CobradiarioLayout>} />
      <Route path="/clientes" element={<CobradiarioLayout><Clientes /></CobradiarioLayout>} />
      <Route path="/clientes/nuevo" element={<CobradiarioLayout><NuevoCliente /></CobradiarioLayout>} />
      <Route path="/clientes/:clientId" element={<CobradiarioLayout><DetalleCliente /></CobradiarioLayout>} />
      <Route path="/creditos/nuevo" element={<CobradiarioLayout><NuevoCredito /></CobradiarioLayout>} />
      <Route path="/creditos/:loanId" element={<CobradiarioLayout><DetalleCredito /></CobradiarioLayout>} />
      <Route path="/reportes" element={<CobradiarioLayout><Reportes /></CobradiarioLayout>} />
      <Route path="/caja" element={<CobradiarioLayout><Caja /></CobradiarioLayout>} />
      <Route path="/configuracion" element={<CobradiarioLayout><Configuracion /></CobradiarioLayout>} />

      {/* Panel exclusivo del Admin (Plan Maestro, sección 5). */}
      <Route path="/cobradiarios" element={<AdminLayout><Cobradiarios /></AdminLayout>} />
      <Route path="/cobradiarios/nuevo" element={<AdminLayout><NuevoCobradiario /></AdminLayout>} />

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
