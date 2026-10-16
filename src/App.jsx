import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { UIProvider } from "./context/UIContext";
import { NotificationProvider } from "./context/NotificationContext";
import AdminLayout from "./components/layout/AdminLayout";
import CobradiarioLayout from "./components/layout/CobradiarioLayout";

import Login from "./pages/Login/Login";

// Las páginas se cargan bajo demanda: jsPDF/ExcelJS y el resto de pantallas
// ya no van en el bundle inicial, así el login abre rápido en datos móviles.
const Registro = lazy(() => import("./pages/Registro/Registro"));
const Inicio = lazy(() => import("./pages/Inicio/Inicio"));
const RutaDelDia = lazy(() => import("./pages/RutaDelDia/RutaDelDia"));
const Clientes = lazy(() => import("./pages/Clientes/Clientes"));
const NuevoCliente = lazy(() => import("./pages/Clientes/NuevoCliente"));
const DetalleCliente = lazy(() => import("./pages/Clientes/DetalleCliente"));
const NuevoCredito = lazy(() => import("./pages/Creditos/NuevoCredito"));
const CreditosAdmin = lazy(() => import("./pages/Creditos/CreditosAdmin"));
const DetalleCredito = lazy(() => import("./pages/Creditos/DetalleCredito"));
const RegistrarCobro = lazy(() => import("./pages/RegistrarCobro/RegistrarCobro"));
const Reportes = lazy(() => import("./pages/Reportes/Reportes"));
const Caja = lazy(() => import("./pages/Caja/Caja"));
const Configuracion = lazy(() => import("./pages/Configuracion/Configuracion"));
const Cobradiarios = lazy(() => import("./pages/Cobradiarios/Cobradiarios"));
const NuevoCobradiario = lazy(() => import("./pages/Cobradiarios/NuevoCobradiario"));
const Correcciones = lazy(() => import("./pages/Correcciones/Correcciones"));
const Auditoria = lazy(() => import("./pages/Auditoria/Auditoria"));
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const Desempeno = lazy(() => import("./pages/Desempeno/Desempeno"));
const OperacionCobradiario = lazy(() => import("./pages/OperacionCobradiario/OperacionCobradiario"));

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
      <NotificationProvider>
        <UIProvider>
          <BrowserRouter>
            <ScrollToTop />
            <div className="min-h-screen bg-surface-1 text-primary font-sans antialiased flex flex-col">
              <Suspense fallback={null}>
                <AppRoutes />
              </Suspense>
            </div>
          </BrowserRouter>
        </UIProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

