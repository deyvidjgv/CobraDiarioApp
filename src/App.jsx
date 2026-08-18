import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { UIProvider } from "./context/UIContext";
import AdminLayout from "./components/layout/AdminLayout";
import CobradiarioLayout from "./components/layout/CobradiarioLayout";

import Login from "./pages/Login/Login";
import Registro from "./pages/Registro/Registro";
import Inicio from "./pages/Inicio/Inicio";
import RutaDelDia from "./pages/RutaDelDia/RutaDelDia";
import Clientes from "./pages/Clientes/Clientes";
import NuevoCliente from "./pages/Clientes/NuevoCliente";
import DetalleCliente from "./pages/Clientes/DetalleCliente";
import NuevoCredito from "./pages/Creditos/NuevoCredito";
import CreditosAdmin from "./pages/Creditos/CreditosAdmin";
import DetalleCredito from "./pages/Creditos/DetalleCredito";
import RegistrarCobro from "./pages/RegistrarCobro/RegistrarCobro";
import Reportes from "./pages/Reportes/Reportes";
import Caja from "./pages/Caja/Caja";
import Configuracion from "./pages/Configuracion/Configuracion";
import Cobradiarios from "./pages/Cobradiarios/Cobradiarios";
import NuevoCobradiario from "./pages/Cobradiarios/NuevoCobradiario";
import Correcciones from "./pages/Correcciones/Correcciones";
import Auditoria from "./pages/Auditoria/Auditoria";
import Dashboard from "./pages/Dashboard/Dashboard";
import Desempeno from "./pages/Desempeno/Desempeno";
import OperacionCobradiario from "./pages/OperacionCobradiario/OperacionCobradiario";

/**
 * React Router no reinicia el scroll al cambiar de ruta. La pantalla de
 * login es más alta que un celular (el panel del logo va sobre el
 * formulario) y iOS la desplaza al enfocar la contraseña; ese offset se
 * heredaba a Inicio y dejaba el saludo debajo del header translúcido.
 * Pasaba en toda navegación, no solo al entrar.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />

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
      <Route path="/dashboard" element={<AdminLayout><Dashboard /></AdminLayout>} />
      {/* Cartera completa, solo lectura: el Admin no entrega créditos.
          No choca con /creditos/nuevo ni /creditos/:loanId, más específicas. */}
      <Route path="/creditos" element={<AdminLayout><CreditosAdmin /></AdminLayout>} />
      <Route path="/cobradiarios" element={<AdminLayout><Cobradiarios /></AdminLayout>} />
      <Route path="/cobradiarios/nuevo" element={<AdminLayout><NuevoCobradiario /></AdminLayout>} />
      <Route path="/cobradiarios/operacion/:uid" element={<AdminLayout><OperacionCobradiario /></AdminLayout>} />
      <Route path="/correcciones" element={<AdminLayout><Correcciones /></AdminLayout>} />
      <Route path="/auditoria" element={<AdminLayout><Auditoria /></AdminLayout>} />
      <Route path="/desempeno" element={<AdminLayout><Desempeno /></AdminLayout>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <UIProvider>
        <BrowserRouter>
          <ScrollToTop />
          <div className="min-h-screen bg-surface-1 text-primary font-sans antialiased flex flex-col">
            <AppRoutes />
          </div>
        </BrowserRouter>
      </UIProvider>
    </AuthProvider>
  );
}

