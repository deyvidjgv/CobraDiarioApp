import { NavLink } from 'react-router-dom';
import {
  IconHome,
  IconMapPin,
  IconUsers,
  IconCash,
  IconSettings,
  IconChartBar,
  IconCoin,
  IconUserCog,
  IconClipboardCheck,
  IconHistory,
  IconLayoutDashboard,
  IconChevronsLeft,
  IconChevronsRight,
  IconLogout,
} from '@tabler/icons-react';
import Logo from '../ui/Logo';
import { cerrarSesion } from '../../firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';

const navItems = [
  { to: '/', label: 'Inicio', Icon: IconHome, end: true },
  { to: '/ruta', label: 'Ruta del día', Icon: IconMapPin, end: false },
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
  { to: '/desempeno', label: 'Desempeño', Icon: IconChartBar, end: false },
  { to: '/clientes', label: 'Clientes', Icon: IconUsers, end: false },
  { to: '/caja', label: 'Caja', Icon: IconCash, end: false },
  {
    to: '/correcciones',
    label: 'Correcciones',
    Icon: IconClipboardCheck,
    end: false,
  },
  { to: '/auditoria', label: 'Auditoría', Icon: IconHistory, end: false },
  { to: '/reportes', label: 'Reportes', Icon: IconChartBar, end: false },
  { to: '/configuracion', label: 'Ajustes', Icon: IconSettings, end: false },
];

function Marca({ collapsed }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Logo size={26} className="shrink-0" />
      {!collapsed && (
        <span className="font-display text-xl text-primary tracking-tight truncate">
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
            ? 'bg-gold/10 text-primary font-semibold'
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
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
          )}
        </>
      )}
    </NavLink>
  ));
}

function LogoutButton({ collapsed, onDone = () => {} }) {
  async function handleLogout() {
    if (!confirm('¿Cerrar sesión?')) return;
    await cerrarSesion();
    onDone();
    window.location.href = '/login';
  }
  return (
    <button
      type="button"
      onClick={handleLogout}
      title={collapsed ? 'Cerrar sesión' : undefined}
      className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} ${
        collapsed ? 'px-2' : 'px-4'
      } py-3 rounded-xl border border-line text-sm font-medium text-primary-light hover:text-primary hover:border-primary/25 transition`}>
      <IconLogout
        size={18}
        stroke={1.5}
        className="shrink-0"
      />
      {!collapsed && <span>Cerrar sesión</span>}
    </button>
  );
}

/**
 * Navegación lateral: solo la barra estática de escritorio (lg+, ≥1024px),
 * colapsable a solo iconos (preferencia guardada en UIContext →
 * localStorage). En móvil y tablet (<1024px) la navegación es BottomNav
 * (barra inferior + hoja "Más"); este componente no renderiza nada ahí.
 */
export default function SideNav() {
  const { isAdmin } = useAuth();
  const { navCollapsed, toggleNavCollapsed } = useUI();
  const items = isAdmin ? adminNavItems : navItems;

  return (
    <>
      {/* ─── Barra estática de escritorio ─── */}
      <aside
        className={`hidden lg:flex fixed top-0 left-0 h-full z-40 flex-col
          bg-obsidian border-r border-line transition-[width] duration-200
          ${navCollapsed ? 'w-[76px]' : 'w-72'}`}>
        <div
          className={`flex items-center ${navCollapsed ? 'justify-center' : 'justify-between'}
            px-4 py-4 border-b border-line`}>
          <Marca collapsed={navCollapsed} />
          {!navCollapsed && (
            <button
              type="button"
              onClick={toggleNavCollapsed}
              title="Contraer menú (se guarda la preferencia)"
              aria-label="Contraer menú"
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
              title="Expandir menú (se guarda la preferencia)"
              aria-label="Expandir menú"
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
          className={`px-3 py-4 border-t border-line ${navCollapsed ? 'px-2' : ''}`}>
          <LogoutButton collapsed={navCollapsed} />
          {!navCollapsed && (
            <p className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-primary/30 text-center mt-3">
              CrediDev
            </p>
          )}
        </div>
      </aside>

    </>
  );
}

