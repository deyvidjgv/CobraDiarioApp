import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  IconHome,
  IconMapPin,
  IconUsers,
  IconCash,
  IconDotsVertical,
} from "@tabler/icons-react";
import { useAuth } from "../../context/AuthContext";
import { cerrarSesion } from "../../firebase/auth";

/**
 * Barra inferior de móvil: cinco destinos fijos y todo lo administrativo
 * dentro de "Más". Sustituye al menú ☰ como navegación principal en
 * teléfono; el SideNav sigue siendo la navegación de escritorio (md+).
 */
const tabs = [
  { to: "/", label: "Inicio", Icon: IconHome, end: true },
  { to: "/ruta", label: "Ruta", Icon: IconMapPin, end: false },
  { to: "/clientes", label: "Clientes", Icon: IconUsers, end: false },
  { to: "/caja", label: "Caja", Icon: IconCash, end: false },
];

const extraCobradiario = [
  { to: "/reportes", label: "Reportes" },
  { to: "/configuracion", label: "Configuraci\u00f3n" },
];

const extraAdmin = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/cobradiarios", label: "Cobradiarios" },
  { to: "/desempeno", label: "Desempe\u00f1o" },
  { to: "/correcciones", label: "Correcciones" },
  { to: "/auditoria", label: "Auditor\u00eda" },
  { to: "/reportes", label: "Reportes" },
  { to: "/configuracion", label: "Configuraci\u00f3n" },
];

export default function BottomNav() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [masOpen, setMasOpen] = useState(false);
  const extras = isAdmin ? extraAdmin : extraCobradiario;

  async function handleLogout() {
    if (!confirm("\u00bfCerrar sesi\u00f3n?")) return;
    await cerrarSesion();
    window.location.href = "/login";
  }

  return (
    <>
      {masOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-primary/45" onClick={() => setMasOpen(false)} />
          <div className="relative w-full bg-surface-1 rounded-t-3xl px-5 pt-3.5 pb-6 pb-safe flex flex-col gap-3">
            <div className="w-9 h-1 rounded-full bg-primary/15 mx-auto" />
            <span className="eyebrow">M\u00e1s</span>
            <div className="flex flex-col divide-y divide-line rounded-2xl bg-white border border-line overflow-hidden">
              {extras.map((e) => (
                <button
                  key={e.to + e.label}
                  type="button"
                  onClick={() => {
                    setMasOpen(false);
                    navigate(e.to);
                  }}
                  className="px-5 py-4 text-left text-[15px] font-medium text-primary"
                >
                  {e.label}
                </button>
              ))}
              <button
                type="button"
                onClick={handleLogout}
                className="px-5 py-4 text-left text-[15px] font-medium text-primary/55"
              >
                Cerrar sesi\u00f3n
              </button>
            </div>
          </div>
        </div>
      )}

      <nav
        aria-label="Navegaci\u00f3n principal"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 bg-surface-1/95 backdrop-blur border-t border-line pt-1.5 pb-safe"
      >
        {tabs.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="min-h-[52px] flex flex-col items-center justify-center gap-1">
            {({ isActive }) => (
              <>
                <Icon
                  size={21}
                  stroke={isActive ? 2 : 1.5}
                  className={isActive ? "text-primary" : "text-primary/45"}
                />
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
          <IconDotsVertical size={21} stroke={1.5} className="text-primary/45" />
          <span className="text-[11px] font-medium text-primary/45">M\u00e1s</span>
        </button>
      </nav>
    </>
  );
}
