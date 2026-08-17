const styles = {
  mora: "text-mora",
  al_dia: "text-al-dia",
  adelantado: "text-adelanto",
  completado: "text-primary-light/70",
  activo: "text-al-dia",
  anulado: "text-primary-light/75",
};

const labels = {
  mora: "En mora",
  al_dia: "Al dÃ­a",
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

