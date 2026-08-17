const opciones = [
  { value: "diario", label: "Diario", emoji: "ðŸ“…" },
  { value: "semanal", label: "Semanal", emoji: "ðŸ“†" },
  { value: "quincenal", label: "Quincenal", emoji: "ðŸ—“ï¸" },
  { value: "mensual", label: "Mensual", emoji: "ðŸ“‹" },
];

export default function FrequencySelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {opciones.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium border transition ${
            value === opt.value
              ? "border-gold/40 bg-gold/10 text-primary"
              : "border-line bg-surface text-primary-light hover:border-primary/20"
          }`}
        >
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

