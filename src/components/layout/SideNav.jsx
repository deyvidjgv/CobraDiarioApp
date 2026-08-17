import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
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
} from '@tabler/icons-react';
import { cerrarSesion } from '../../firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';

const navItems = [
  { to: '/', label: 'Inicio', Icon: IconHome, end: true },
  { to: '/ruta', label: 'Ruta del dÃ­a', Icon: IconMapPin, end: false },
  { to: '/clientes', label: 'Clientes', Icon: IconUsers, end: false },
  { to: '/caja', label: 'Caja', Icon: IconCash, end: false },
  { to: '/reportes', label: 'Reportes', Icon: IconChartBar, end: false },
  { to: '/configuracion', label: 'Ajustes', Icon: IconSettings, end: false },
];

const adminNavItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    Icon: IconLayoutDashboard,
    end: false,
  },
  { to: '/cobradiarios', label: 'Cobradiarios', Icon: IconUserCog, end: false },
  { to: '/desempeno', label: 'DesempeÃ±o', Icon: IconChartBar, end: false },
  { to: '/clientes', label: 'Clientes', Icon: IconUsers, end: false },
  { to: '/caja', label: 'Caja', Icon: IconCash, end: false },
  {
    to: '/correcciones',
    label: 'Correcciones',
    Icon: IconClipboardCheck,
    end: false,
  },
  { to: '/auditoria', label: 'AuditorÃ­a', Icon: IconHistory, end: false },
  { to: '/reportes', label: 'Reportes', Icon: IconChartBar, end: false },
  { to: '/configuracion', label: 'Ajustes', Icon: IconSettings, end: false },
];

function Marca({ collapsed }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center shrink-0 overflow-hidden border border-black/10 shadow-sm">
        <img
          src="/icons/credi-dev-logo.png"
          alt="CrediDev logo"
          className="w-6 h-6 object-contain"
        />
      </div>
      {!collapsed && (
        <span className="text-base font-semibold text-primary tracking-tight truncate">
          CrediDev
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
        `flex items-center ${collapsed ? 'justify-center' : 'gap-3'} ${
          collapsed ? 'px-2' : 'px-4'
        } py-3 rounded-xl text-sm font-medium transition-all ${
          isActive
            ? 'bg-primary-bg text-primary font-semibold'
            : 'text-primary-light hover:bg-surface-2 hover:text-primary'
        }`
      }>
      {({ isActive }) => (
        <>
          <Icon
            size={20}
            stroke={1.5}
            className={
              isActive ? 'text-primary shrink-0' : 'text-primary-light/70 shrink-0'
            }
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
    if (!confirm('Â¿Cerrar sesiÃ³n?')) return;
    await cerrarSesion();
    onDone();
    window.location.href = '/login';
  }
  return (
    <button
      type="button"
      onClick={handleLogout}
      title={collapsed ? 'Cerrar sesiÃ³n' : undefined}
      className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} ${
        collapsed ? 'px-2' : 'px-4'
      } py-3 rounded-xl border border-mora/20 bg-mora/10 text-sm font-medium text-mora hover:bg-mora/15 transition`}>
      <IconLogout
        size={18}
        stroke={1.5}
        className="shrink-0"
      />
      {!collapsed && <span>Cerrar sesiÃ³n</span>}
    </button>
  );
}

/**
 * NavegaciÃ³n lateral:
 *  - Escritorio (md+): barra estÃ¡tica a la izquierda, colapsable a solo
 *    iconos. La preferencia se guarda (UIContext â†’ localStorage).
 *  - MÃ³vil: overlay controlado por el botÃ³n â˜° del Header.
 */
export default function SideNav() {
  const { isAdmin } = useAuth();
  const { drawerOpen, setDrawerOpen, navCollapsed, toggleNavCollapsed } =
    useUI();
  const { pathname } = useLocation();
  const items = isAdmin ? adminNavItems : navItems;

  // Cierra el overlay mÃ³vil al navegar
  useEffect(() => {
    setDrawerOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Bloquea el scroll del fondo mientras el drawer mÃ³vil estÃ¡ abierto
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  return (
    <>
      {/* â”€â”€â”€ Barra estÃ¡tica de escritorio â”€â”€â”€ */}
      <aside
        className={`hidden md:flex fixed top-0 left-0 h-full z-40 flex-col
          bg-white border-r border-[#E3DFD8] transition-[width] duration-200
          ${navCollapsed ? 'w-[76px]' : 'w-72'}`}>
        <div
          className={`flex items-center ${navCollapsed ? 'justify-center' : 'justify-between'}
            px-4 py-4 border-b border-[#E3DFD8]`}>
          <Marca collapsed={navCollapsed} />
          {!navCollapsed && (
            <button
              type="button"
              onClick={toggleNavCollapsed}
              title="Contraer menÃº (se guarda la preferencia)"
              aria-label="Contraer menÃº"
              className="p-1.5 rounded-lg hover:bg-surface-2 transition text-primary-light/70 hover:text-primary-light">
              <IconChevronsLeft
                size={18}
                stroke={1.5}
              />
            </button>
          )}
        </div>

        {navCollapsed && (
          <div className="flex justify-center pt-3">
            <button
              type="button"
              onClick={toggleNavCollapsed}
              title="Expandir menÃº (se guarda la preferencia)"
              aria-label="Expandir menÃº"
              className="p-1.5 rounded-lg hover:bg-surface-2 transition text-primary-light/70 hover:text-primary-light">
              <IconChevronsRight
                size={18}
                stroke={1.5}
              />
            </button>
          </div>
        )}

        <nav
          className={`flex-1 overflow-y-auto py-4 space-y-1 ${navCollapsed ? 'px-2' : 'px-3'}`}>
          <NavLinks
            items={items}
            collapsed={navCollapsed}
          />
        </nav>

        <div
          className={`px-3 py-4 border-t border-[#E3DFD8] ${navCollapsed ? 'px-2' : ''}`}>
          <LogoutButton collapsed={navCollapsed} />
          {!navCollapsed && (
            <p className="text-[11px] text-primary-light/50 text-center mt-3">
              CrediDev
            </p>
          )}
        </div>
      </aside>

      {/* â”€â”€â”€ Overlay mÃ³vil â”€â”€â”€ */}
      <div
        aria-hidden="true"
        className={`md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          drawerOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setDrawerOpen(false)}
      />
      <aside
        role="navigation"
        aria-label="MenÃº principal"
        className={`md:hidden fixed top-0 left-0 h-full w-72 max-w-[85vw] z-50 flex flex-col
          bg-white shadow-2xl shadow-black/20
          transition-transform duration-300 ease-out
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E3DFD8]">
          <Marca collapsed={false} />
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menÃº"
            className="p-1.5 rounded-lg hover:bg-surface-2 transition text-primary-light/70 hover:text-primary-light">
            <IconX
              size={20}
              stroke={1.5}
            />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <NavLinks
            items={items}
            collapsed={false}
          />
        </nav>

        <div className="mt-auto px-3 py-4 border-t border-[#E3DFD8]">
          <LogoutButton
            collapsed={false}
            onDone={() => setDrawerOpen(false)}
          />
          <p className="text-[11px] text-primary-light/50 text-center mt-3">CrediDev</p>
        </div>
      </aside>
    </>
  );
}

