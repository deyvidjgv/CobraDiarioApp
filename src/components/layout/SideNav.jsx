import { NavLink } from 'react-router-dom';
import {
  IconHome,
  IconMapPin,
  IconUsers,
  IconCash,
  IconSettings,
  IconChartBar,
  IconUserCog,
  IconClipboardCheck,
  IconHistory,
  IconLayoutDashboard,
  IconX,
  IconLogout,
  IconFileText,
} from '@tabler/icons-react';
import Logo from '../ui/Logo';
import { cerrarSesion } from '../../firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useNotifications } from '../../context/NotificationContext';

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
  // Cartera completa en solo lectura (el Admin no entrega créditos).
  { to: '/creditos', label: 'Créditos', Icon: IconFileText, end: true },
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

function Marca() {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Logo size={26} className="shrink-0" />
      <span className="font-display text-xl text-primary tracking-tight truncate">
        CrediDev
      </span>
    </div>
  );
}

function NavLinks({ items, onNavigate }) {
  const { pendingCorrectionsCount } = useNotifications();

  return items.map(({ to, label, Icon, end }) => {
    // Aviso de correcciones pendientes: solo aplica al ítem "Correcciones" del Admin.
    const badgeCount = to === '/correcciones' ? pendingCorrectionsCount : 0;
    return (
      <NavLink
        key={to + label}
        to={to}
        end={end}
        onClick={onNavigate}
        className={({ isActive }) =>
          `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
            isActive
              ? 'bg-gold/10 text-primary font-semibold'
              : 'text-primary-light hover:bg-surface-2 hover:text-primary'
          }`
        }>
        {({ isActive }) => (
          <>
            <span className="relative shrink-0">
              <Icon
                size={20}
                stroke={1.5}
                className={isActive ? 'text-primary' : 'text-primary-light/85'}
              />
              {badgeCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-mora text-surface-1 text-[9px] font-bold flex items-center justify-center leading-none">
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </span>
            <span className="truncate">{label}</span>
            {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-gold shrink-0" />}
          </>
        )}
      </NavLink>
    );
  });
}

function LogoutButton() {
  async function handleLogout() {
    if (!confirm('¿Cerrar sesión?')) return;
    await cerrarSesion();
    window.location.href = '/login';
  }
  return (
    <button
      type="button"
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-line text-sm font-medium text-primary-light hover:text-primary hover:border-primary/40 transition">
      <IconLogout size={18} stroke={1.5} className="shrink-0" />
      <span>Cerrar sesión</span>
    </button>
  );
}

/**
 * Menú tipo hamburguesa: un cajón que se abre sobre el contenido (overlay
 * + fondo oscuro) y se cierra tocando fuera, la X, un enlace o Atrás.
 * Arranca OCULTO en cualquier tamaño de pantalla — Admin y Cobradiario
 * comparten el mismo componente, solo cambia la lista de accesos. El
 * botón ☰ que lo abre vive en el Header.
 */
export default function SideNav() {
  const { isAdmin } = useAuth();
  const { drawerOpen, setDrawerOpen } = useUI();
  const items = isAdmin ? adminNavItems : navItems;

  return (
    <>
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        aria-hidden={!drawerOpen}
        className={`fixed top-0 left-0 h-full w-[280px] max-w-[85vw] z-50 flex flex-col
          bg-obsidian border-r border-line transition-transform duration-200 ease-out
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-line">
          <Marca />
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú"
            className="tap rounded-lg hover:bg-surface-2 transition text-primary-light hover:text-primary">
            <IconX size={20} stroke={1.5} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <NavLinks items={items} onNavigate={() => setDrawerOpen(false)} />
        </nav>

        <div className="px-3 py-4 border-t border-line">
          <LogoutButton />
          <p className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-primary/60 text-center mt-3">
            CrediDev
          </p>
        </div>
      </aside>
    </>
  );
}
