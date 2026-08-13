import { useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  IconHome,
  IconMapPin,
  IconUsers,
  IconWallet,
  IconCash,
  IconSettings,
  IconChartBar,
  IconCoin,
  IconX,
} from "@tabler/icons-react";
import { cerrarSesion } from "../../firebase/auth";

const navItems = [
  { to: "/", label: "Inicio", Icon: IconHome, end: true },
  { to: "/ruta", label: "Ruta del día", Icon: IconMapPin, end: false },
  { to: "/clientes", label: "Clientes", Icon: IconUsers, end: false },
  { to: "/caja", label: "Caja", Icon: IconCash, end: false },
  { to: "/reportes", label: "Reportes", Icon: IconChartBar, end: false },
  { to: "/configuracion", label: "Ajustes", Icon: IconSettings, end: false },
];

/**
 * Drawer lateral de navegación principal.
 * Se controla desde fuera con `isOpen` y `onClose`.
 */
export default function NavDrawer({ isOpen, onClose }) {
  const drawerRef = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  async function handleLogout() {
    if (!confirm("¿Cerrar sesión?")) return;
    await cerrarSesion();
    onClose();
    navigate("/login", { replace: true });
  }

  // Cierra el drawer cuando cambia la ruta (el usuario seleccionó una opción)
  // Usamos un ref para evitar que se dispare en el primer montaje
  const isMounted = useRef(false);
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Cierra al hacer click fuera del drawer
  useEffect(() => {
    if (!isOpen) return;
    function handleOutside(e) {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        onClose();
      }
    }
    // Pequeño delay para que el primer click (el del botón ☰) no cierre inmediatamente
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleOutside);
      document.addEventListener("touchstart", handleOutside);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [isOpen, onClose]);

  // Bloquea scroll del body mientras el drawer está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Overlay semitransparente */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Panel del drawer */}
      <aside
        ref={drawerRef}
        role="navigation"
        aria-label="Menú principal"
        className={`fixed top-0 left-0 h-full w-72 max-w-[85vw] z-50 flex flex-col
          bg-white shadow-2xl shadow-black/20
          transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Cabecera del drawer */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5EA]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-bg flex items-center justify-center">
              <IconCoin size={18} stroke={1.5} className="text-primary" />
            </div>
            <span className="text-base font-semibold text-primary tracking-tight">
              Cobro Diario
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="p-1.5 rounded-lg hover:bg-surface-2 transition text-gray-400 hover:text-gray-600"
          >
            <IconX size={20} stroke={1.5} />
          </button>
        </div>

        {/* Links de navegación */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary-bg text-primary font-semibold"
                    : "text-gray-600 hover:bg-surface-1 hover:text-gray-800"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={20}
                    stroke={1.5}
                    className={isActive ? "text-primary" : "text-gray-400"}
                  />
                  <span>{label}</span>
                  {/* Indicador activo */}
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer del drawer */}
        <div className="mt-auto px-5 py-4 border-t border-[#E5E5EA] space-y-3">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-100 transition"
          >
            Cerrar sesión
          </button>
          <p className="text-[11px] text-gray-300 text-center">
            Cobro Diario App
          </p>
        </div>
      </aside>
    </>
  );
}
