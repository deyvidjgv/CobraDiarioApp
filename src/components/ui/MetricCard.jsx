export default function MetricCard({ label, value, color = "primary", onClick }) {
  const bgMap = {
    green: "bg-emerald-50",
    red: "bg-mora/10",
    blue: "bg-adelanto/10",
    primary: "bg-primary-bg",
    gold: "bg-gold/20",
  };
  const valueColorMap = {
    green: "text-emerald-700",
    red: "text-mora",
    blue: "text-blue-700",
    primary: "text-primary",
    gold: "text-[#D97706]",
  };

  return (
    <div
      onClick={onClick}
      className={`${bgMap[color] || bgMap.primary} rounded-xl p-4 border-thin ${
        onClick ? "cursor-pointer hover:opacity-80 transition" : ""
      }`}
    >
      <p className="text-xs text-primary-light/75 font-medium">{label}</p>
      <p className={`text-xl font-medium leading-tight mt-1 ${valueColorMap[color] || valueColorMap.primary}`}>
        {value}
      </p>
    </div>
  );
}

