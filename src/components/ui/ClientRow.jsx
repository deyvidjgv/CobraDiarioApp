import Badge from "./Badge";
import { IconChevronRight } from "@tabler/icons-react";

const rowColors = {
  mora: "bg-red-50 hover:bg-red-100 border-red-200",
  al_dia: "bg-amber-50 hover:bg-amber-100 border-amber-200",
  adelantado: "bg-blue-50 hover:bg-blue-100 border-blue-200",
  completado: "bg-gray-50 hover:bg-gray-100 border-gray-200",
  activo: "bg-white hover:bg-surface-1 border-thin"
};

const avatarColors = {
  mora: { bg: "bg-red-200", text: "text-red-700" },
  al_dia: { bg: "bg-amber-200", text: "text-amber-800" },
  adelantado: { bg: "bg-blue-200", text: "text-blue-700" },
  completado: { bg: "bg-gray-200", text: "text-gray-600" },
  activo: { bg: "bg-primary-bg", text: "text-primary" },
};

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
}

export default function ClientRow({ name, phone, status, subtitle, amount, onClick }) {
  const aColors = avatarColors[status] || avatarColors.activo;
  const rColors = rowColors[status] || rowColors.activo;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 transition text-left border ${rColors}`}
    >
      {/* Avatar con iniciales */}
      <div className={`w-10 h-10 rounded-full ${aColors.bg} ${aColors.text} flex items-center justify-center text-sm font-medium shrink-0`}>
        {getInitials(name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
        <p className="text-xs text-gray-400 truncate">{subtitle || phone}</p>
      </div>

      {/* Monto + Estado */}
      <div className="text-right shrink-0">
        {amount && <p className="text-sm font-medium text-gray-800">{amount}</p>}
        {status && <Badge status={status} />}
      </div>

      {/* Chevron */}
      <IconChevronRight size={16} stroke={1.5} className="text-gray-300 shrink-0" />
    </button>
  );
}
