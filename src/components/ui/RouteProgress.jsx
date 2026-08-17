/**
 * Encabezado de progreso de la ruta. Es el dato que el cobrador mira
 * veinte veces al día, así que va en bloque elevado, arriba de la lista.
 */
export default function RouteProgress({ gestionados, total, enMora, montoCobrado = null }) {
  const pct = total > 0 ? Math.round((gestionados / total) * 100) : 0;
  const faltan = Math.max(total - gestionados, 0);

  return (
    <div className="rounded-2xl bg-surface-2 border border-line px-5 py-4 flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-primary/50">
            {montoCobrado ? "Cobrado hoy" : "Ruta de hoy"}
          </span>
          <span className="num text-3xl font-semibold text-primary tracking-tight leading-none">
            {montoCobrado || gestionados + " / " + total}
          </span>
        </div>
        <span className="num text-[11px] text-gold">
          {montoCobrado ? gestionados + " / " + total : pct + "%"}
        </span>
      </div>

      <div className="h-[3px] rounded-full bg-primary/15 overflow-hidden">
        <div className="h-full bg-gold transition-[width] duration-500" style={{ width: pct + "%" }} />
      </div>

      <p className="text-xs text-primary/60">
        {faltan === 0 ? "Ruta completa" : "Faltan " + faltan + " visitas"}
        {enMora > 0 && " \u00b7 " + enMora + " en mora"}
      </p>
    </div>
  );
}
