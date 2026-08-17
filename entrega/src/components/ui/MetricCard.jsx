/**
 * Tarjeta de métrica. Superficie siempre neutra: el color solo entra en la
 * cifra, y únicamente cuando comunica un estado (mora, al día, adelanto).
 */
export default function MetricCard({ label, value, color = "primary", onClick }) {
  const valueColor = {
    green: "text-al-dia",
    red: "text-mora",
    blue: "text-adelanto",
    primary: "text-primary",
    gold: "text-primary",
  }[color] || "text-primary";

  return (
    <div
      onClick={onClick}
      className={
        "bg-white rounded-2xl p-4 border border-line " +
        (onClick ? "cursor-pointer hover:border-primary/25 transition" : "")
      }
    >
      <p className="eyebrow">{label}</p>
      <p className={"num text-2xl font-medium leading-tight mt-2 tracking-tight " + valueColor}>
        {value}
      </p>
    </div>
  );
}
