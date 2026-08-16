import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";import {
  IconHome,
  IconMapPin,
  IconUsers,
  IconCash,
  IconSettings,
  IconChartBar,
  IconCoin,
  IconX,
  IconUserCog,
  IconClipboardCheck,
  IconHistory,
  IconLayoutDashboard,
  IconChevronsLeft,
  IconChevronsRight,
  IconLogout,
} from "@tabler/icons-react";
import { cerrarSesion } from "../../firebase/auth";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";

const navItems = [
  { to: "/", label: "Inicio", Icon: IconHome, end: true },
  { to: "/ruta", label: "Ruta del día", Icon: IconMapPin, end: false },
  { to: "/clientes", label: "Clientes", Icon: IconUsers, end: false },
  { to: "/caja", label: "Caja", Icon: IconCash, end: false },
  { to: "/reportes", label: "Reportes", Icon: IconChartBar, end: false },
  { to: "/configuracion", label: "Ajustes", Icon: IconSettings, end: false },
];

const adminNavItems = [
  { to: "/dashboard", label: "Dashboard", Icon: IconLayoutDashboard, end: false },
  { to: "/cobradiarios", label: "Cobradiarios", Icon: IconUserCog, end: false },
  { to: "/desempeno", label: "Desempeño", Icon: IconChartBar, end: false },
  { to: "/clientes", label: "Clientes", Icon: IconUsers, end: false },
  { to: "/caja", label: "Caja", Icon: IconCash, end: false },
  { to: "/correcciones", label: "Correcciones", Icon: IconClipboardCheck, end: false },
  { to: "/auditoria", label: "Auditoría", Icon: IconHistory, end: false },
  { to: "/reportes", label: "Reportes", Icon: IconChartBar, end: false },
  { to: "/configuracion", label: "Ajustes", Icon: IconSettings, end: false },
];

function Marca({ collapsed }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-8 h-8 rounded-xl bg-primary-bg flex items-center justify-center shrink-0">
        <IconCoin size={18} stroke={1.5} className="text-primary" />
      </div>
      {!collapsed && (
        <span className="text-base font-semibold text-primary tracking-tight truncate">
          Cobro Diario
        </span>
      )}
    </div>
  );
}

function NavLinks({ items, collapsed }) {
  return items.map(({ to, label, Icon, end }) => (
    <NavLink
      key={to + label}
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center ${collapsed ? "justify-center" : "gap-3"} ${
          collapsed ? "px-2" : "px-4"
        } py-3 rounded-xl text-sm font-medium transition-all ${
          isActive
            ? "bg-primary-bg text-primary font-semibold"
            : "text-gray-600 hover:bg-surface-2 hover:text-gray-800"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={20}
            stroke={1.5}
            className={isActive ? "text-primary shrink-0" : "text-gray-400 shrink-0"}
          />
          {!collapsed && <span className="truncate">{label}</span>}
          {!collapsed && isActive && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          )}
        </>
      )}
    </NavLink>
  ));
}

function LogoutButton({ collapsed, onDone = () => {} }) {
  async function handleLogout() {
    if (!confirm("¿Cerrar sesión?")) return;
    await cerrarSesion();
    onDone();
    window.location.href = "/login";
  }
  return (
    <button
      type="button"
      onClick={handleLogout}
      title={collapsed ? "Cerrar sesión" : undefined}
      className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-3"} ${
        collapsed ? "px-2" : "px-4"
      } py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-medium text-red-700 hover:bg-red-100 transition`}
    >
      <IconLogout size={18} stroke={1.5} className="shrink-0" />
      {!collapsed && <span>Cerrar sesión</span>}
    </button>
  );
}

/**
 * Navegación lateral:
 *  - Escritorio (md+): barra estática a la izquierda, colapsable a solo
 *    iconos. La preferencia se guarda (UIContext → localStorage).
 *  - Móvil: overlay controlado por el botón ☰ del Header.
 */
export default function SideNav() {
  const { isAdmin } = useAuth();
  const { drawerOpen, setDrawerOpen, navCollapsed, toggleNavCollapsed } = useUI();
  const { pathname } = useLocation();
  const items = isAdmin ? adminNavItems : navItems;

  // Cierra el overlay móvil al navegar
  useEffect(() => {
    setDrawerOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Bloquea el scroll del fondo mientras el drawer móvil está abierto
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <>
      {/* ─── Barra estática de escritorio ─── */}
      <aside
        className={`hidden md:flex fixed top-0 left-0 h-full z-40 flex-col
          bg-white border-r border-[#E5E5EA] transition-[width] duration-200
          ${navCollapsed ? "w-[76px]" : "w-72"}`}
      >
        <div
          className={`flex items-center ${navCollapsed ? "justify-center" : "justify-between"}
            px-4 py-4 border-b border-[#E5E5EA]`}
        >
          <Marca collapsed={navCollapsed} />
          {!navCollapsed && (
            <button
              type="button"
              onClick={toggleNavCollapsed}
              title="Contraer menú (se guarda la preferencia)"
              aria-label="Contraer menú"
              className="p-1.5 rounded-lg hover:bg-surface-2 transition text-gray-400 hover:text-gray-600"
            >
              <IconChevronsLeft size={18} stroke={1.5} />
            </button>
          )}
        </div>

        {navCollapsed && (
          <div className="flex justify-center pt-3">
            <button
              type="button"
              onClick={toggleNavCollapsed}
              title="Expandir menú (se guarda la preferencia)"
              aria-label="Expandir menú"
              className="p-1.5 rounded-lg hover:bg-surface-2 transition text-gray-400 hover:text-gray-600"
            >
              <IconChevronsRight size={18} stroke={1.5} />
            </button>
          </div>
        )}

        <nav className={`flex-1 overflow-y-auto py-4 space-y-1 ${navCollapsed ? "px-2" : "px-3"}`}>
          <NavLinks items={items} collapsed={navCollapsed} />
        </nav>

        <div className={`px-3 py-4 border-t border-[#E5E5EA] ${navCollapsed ? "px-2" : ""}`}>
          <LogoutButton collapsed={navCollapsed} />
          {!navCollapsed && (
            <p className="text-[11px] text-gray-300 text-center mt-3">Cobro Diario App</p>
          )}
        </div>
      </aside>

      {/* ─── Overlay móvil ─── */}
      <div
        aria-hidden="true"
        className={`md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setDrawerOpen(false)}
      />
      <aside
        role="navigation"
        aria-label="Menú principal"
        className={`md:hidden fixed top-0 left-0 h-full w-72 max-w-[85vw] z-50 flex flex-col
          bg-white shadow-2xl shadow-black/20
          transition-transform duration-300 ease-out
          ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5EA]">
          <Marca collapsed={false} />
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú"
            className="p-1.5 rounded-lg hover:bg-surface-2 transition text-gray-400 hover:text-gray-600"
          >
            <IconX size={20} stroke={1.5} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <NavLinks items={items} collapsed={false} />
        </nav>

        <div className="mt-auto px-3 py-4 border-t border-[#E5E5EA]">
          <LogoutButton collapsed={false} onDone={() => setDrawerOpen(false)} />
          <p className="text-[11px] text-gray-300 text-center mt-3">Cobro Diario App</p>
        </div>
      </aside>
    </>
  );
}
