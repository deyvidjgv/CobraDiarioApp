const styles = {
  mora: "text-red-600",
  al_dia: "text-emerald-600",
  adelantado: "text-blue-600",
  completado: "text-gray-400",
  activo: "text-emerald-600",
  anulado: "text-gray-500",
};

const labels = {
  mora: "En mora",
  al_dia: "Al día",
  adelantado: "Adelanto",
  completado: "Completado",
  activo: "Activo",
  anulado: "Anulado",
};

export default function Badge({ status }) {
  return (
    <span
      className={`inline-block text-[11px] font-normal whitespace-nowrap ${
        styles[status] || styles.al_dia
      }`}
    >
      {labels[status] || status}
    </span>
  );
}
