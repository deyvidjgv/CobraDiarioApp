import Badge from "./Badge";
import { IconChevronRight, IconMapPin } from "@tabler/icons-react";

const rowColors = {
  mora: "bg-mora/10 hover:bg-mora/15 border-mora/20",
  al_dia: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200",
  adelantado: "bg-adelanto/10 hover:bg-blue-100 border-adelanto/20",
  completado: "bg-surface-1 hover:bg-surface-2 border-primary/10",
  activo: "bg-white hover:bg-surface-1 border-thin"
};

const avatarColors = {
  mora: { bg: "bg-red-200", text: "text-mora" },
  al_dia: { bg: "bg-emerald-200", text: "text-emerald-800" },
  adelantado: { bg: "bg-blue-200", text: "text-blue-700" },
  completado: { bg: "bg-gray-200", text: "text-primary-light" },
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

export default function ClientRow({ name, phone, status, subtitle, amount, onClick, ubicacion }) {
  const aColors = avatarColors[status] || avatarColors.activo;
  const rColors = rowColors[status] || rowColors.activo;

  const handleMapClick = (e) => {
    e.stopPropagation();
    if (ubicacion?.lat && ubicacion?.lng) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${ubicacion.lat},${ubicacion.lng}`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  return (
    <div
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 transition text-left border cursor-pointer ${rColors}`}
    >
      {/* Avatar con iniciales */}
      <div className={`w-10 h-10 rounded-full ${aColors.bg} ${aColors.text} flex items-center justify-center text-sm font-medium shrink-0`}>
        {getInitials(name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-primary truncate">{name}</p>
        <p className="text-xs text-primary-light/70 truncate">{subtitle || phone}</p>
      </div>

      {/* Monto + Estado */}
      <div className="text-right shrink-0">
        {amount && <p className="text-sm font-medium text-primary">{amount}</p>}
        {status && <Badge status={status} />}
      </div>

      {/* BotÃ³n GPS si hay ubicaciÃ³n */}
      {ubicacion && ubicacion.lat && ubicacion.lng && (
        <button
          type="button"
          onClick={handleMapClick}
          className="p-2 text-primary-light hover:text-primary hover:bg-primary-bg/50 rounded-lg transition shrink-0 flex items-center justify-center"
          title="CÃ³mo llegar (Google Maps)"
        >
          <IconMapPin size={20} stroke={2} />
        </button>
      )}

      {/* Chevron */}
      <IconChevronRight size={16} stroke={1.5} className="text-primary-light/50 shrink-0" />
    </div>
  );
}

