const styles = {
  mora: "text-mora",
  al_dia: "text-al-dia",
  adelantado: "text-adelanto",
  completado: "text-primary/45",
  activo: "text-al-dia",
  anulado: "text-primary/40",
};

const labels = {
  mora: "En mora",
  al_dia: "Al d\u00eda",
  adelantado: "Adelanto",
  completado: "Completado",
  activo: "Activo",
  anulado: "Anulado",
};

export default function Badge({ status }) {
  return (
    <span
      className={
        "inline-block font-mono text-[10px] tracking-[0.1em] uppercase whitespace-nowrap " +
        (styles[status] || styles.al_dia)
      }
    >
      {labels[status] || status}
    </span>
  );
}
