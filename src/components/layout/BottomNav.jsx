import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  IconHome,
  IconMapPin,
  IconUsers,
  IconCash,
  IconDotsVertical,
  IconUserCog,
  IconFileText,
} from "@tabler/icons-react";
import { useAuth } from "../../context/AuthContext";
import { useRutaHoy } from "../../hooks/useRutaHoy";
import { useNotifications } from "../../context/NotificationContext";
import { cerrarSesion } from "../../firebase/auth";

/**
 * Barra inferior de móvil: cinco destinos fijos y todo lo administrativo
 * dentro de "Más". Sustituye al menú ☰ como navegación principal en
 * teléfono; el SideNav sigue siendo la navegación de escritorio (lg+).
 * "Ruta" va al centro para el cobradiario: es la pantalla que más se toca
 * durante el día. El admin no tiene ruta personal (SideNav tampoco se la
 * muestra en escritorio), así que ve otra cosa — antes esta lista no se
 * filtraba por rol y el admin veía "Ruta" igual en móvil, apuntando a una
 * pantalla pensada para el cobrador.
 */
const tabsCobradiario = [
  { to: "/", label: "Inicio", Icon: IconHome, end: true },
  { to: "/clientes", label: "Clientes", Icon: IconUsers, end: false },
  { to: "/ruta", label: "Ruta", Icon: IconMapPin, end: false, badge: true },
  { to: "/caja", label: "Caja", Icon: IconCash, end: false },
];

// El Admin vive en su gente y su cartera, no en la lista de clientes: por
// eso Cobradiarios y Créditos ocupan el centro. Clientes y Dashboard bajan
// a "Más". El <nav> es grid-cols-5 (4 pestañas + "Más"), así que este
// arreglo debe tener exactamente 4 entradas.
const tabsAdmin = [
  { to: "/", label: "Inicio", Icon: IconHome, end: true },
  { to: "/cobradiarios", label: "Cobradiarios", Icon: IconUserCog, end: false },
  { to: "/creditos", label: "Créditos", Icon: IconFileText, end: true },
  { to: "/caja", label: "Caja", Icon: IconCash, end: false },
];

/**
 * Contador de pendientes de hoy sobre el ícono de "Ruta". Aislado en su
 * propio componente y montado solo para el cobradiario (ver uso más abajo)
 * para que sus listeners de Firestore (créditos + visitas) no queden
 * activos también en la sesión del admin, que no tiene ruta personal.
 */
function PuntoBadge({ count }) {
  if (!count) return null;
  return (
    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-mora text-surface-1 text-[9px] font-bold flex items-center justify-center leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function RutaPendientesBadge() {
  const { pendientesHoy } = useRutaHoy();
  return <PuntoBadge count={pendientesHoy.length} />;
}

const extraCobradiario = [
  { to: "/reportes", label: "Reportes" },
  { to: "/configuracion", label: "Configuración" },
];

// Cobradiarios ya es pesta\u00f1a; en su lugar bajan aqu\u00ed Dashboard y Clientes.
const extraAdmin = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/clientes", label: "Clientes" },
  { to: "/desempeno", label: "Desempe\u00f1o" },
  { to: "/correcciones", label: "Correcciones" },
  { to: "/auditoria", label: "Auditor\u00eda" },
  { to: "/reportes", label: "Reportes" },
  { to: "/configuracion", label: "Configuración" },
];

export default function BottomNav() {
  const { isAdmin } = useAuth();
  const { pendingCorrectionsCount } = useNotifications();
  const navigate = useNavigate();
  const [masOpen, setMasOpen] = useState(false);
  const extras = isAdmin ? extraAdmin : extraCobradiario;
  const tabs = isAdmin ? tabsAdmin : tabsCobradiario;

  async function handleLogout() {
    if (!confirm("\u00bfCerrar sesión?")) return;
    await cerrarSesion();
    window.location.href = "/login";
  }

  return (
    <>
      {masOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMasOpen(false)} />
          <div className="relative w-full max-h-[90vh] overflow-y-auto bg-surface-1 rounded-t-3xl px-5 pt-3.5 pb-6 pb-safe flex flex-col gap-3">
            <div className="w-9 h-1 rounded-full bg-primary/15 mx-auto" />
            <span className="eyebrow">Más</span>
            <div className="flex flex-col divide-y divide-line rounded-2xl bg-surface border border-line overflow-hidden">
              {extras.map((e) => {
                const badgeCount = e.to === "/correcciones" ? pendingCorrectionsCount : 0;
                return (
                  <button
                    key={e.to + e.label}
                    type="button"
                    onClick={() => {
                      setMasOpen(false);
                      navigate(e.to);
                    }}
                    className="px-5 py-4 flex items-center justify-between text-left text-[15px] font-medium text-primary"
                  >
                    {e.label}
                    {badgeCount > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-mora text-surface-1 text-[11px] font-bold flex items-center justify-center leading-none">
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={handleLogout}
                className="px-5 py-4 text-left text-[15px] font-medium text-primary/55"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      <nav
        aria-label="Navegación principal"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 bg-surface-1/95 backdrop-blur border-t border-line pt-1.5 pb-safe"
      >
        {tabs.map(({ to, label, Icon, end, badge }) => (
          <NavLink key={to} to={to} end={end} className="min-h-[52px] flex flex-col items-center justify-center gap-1">
            {({ isActive }) => (
              <>
                <span className="relative">
                  <Icon
                    size={21}
                    stroke={isActive ? 2 : 1.5}
                    className={isActive ? "text-primary" : "text-primary/45"}
                  />
                  {badge && !isAdmin && <RutaPendientesBadge />}
                </span>
                <span
                  className={
                    "text-[11px] " +
                    (isActive ? "font-bold text-primary" : "font-medium text-primary/45")
                  }
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMasOpen(true)}
          className="min-h-[52px] flex flex-col items-center justify-center gap-1"
        >
          <span className="relative">
            <IconDotsVertical size={21} stroke={1.5} className="text-primary/45" />
            {isAdmin && <PuntoBadge count={pendingCorrectionsCount} />}
          </span>
          <span className="text-[11px] font-medium text-primary/45">Más</span>
        </button>
      </nav>
    </>
  );
}
