const opciones = [
  { value: "diario", label: "Diario", emoji: "📅" },
  { value: "semanal", label: "Semanal", emoji: "📆" },
  { value: "quincenal", label: "Quincenal", emoji: "🗓️" },
  { value: "mensual", label: "Mensual", emoji: "📋" },
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
              ? "border-primary-light bg-primary-bg text-primary-light"
              : "border-[#E5E5EA] bg-white text-gray-600 hover:border-gray-300"
          }`}
        >
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
