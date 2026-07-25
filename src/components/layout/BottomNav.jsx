import { NavLink } from "react-router-dom";
import {
  IconHome,
  IconMapPin,
  IconUsers,
  IconWallet,
  IconSettings,
} from "@tabler/icons-react";

const tabs = [
  { to: "/", label: "Inicio", Icon: IconHome },
  { to: "/ruta", label: "Ruta", Icon: IconMapPin },
  { to: "/clientes", label: "Clientes", Icon: IconUsers },
  { to: "/caja", label: "Caja", Icon: IconWallet },
  { to: "/configuracion", label: "Ajustes", Icon: IconSettings },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full sm:max-w-sm bg-white border-t border-[#E5E5EA] z-50">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-xs font-normal transition-colors ${
                isActive ? "text-primary-light" : "text-gray-400 hover:text-gray-600"
              }`
            }
          >
            <tab.Icon size={24} stroke={1.5} />
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
