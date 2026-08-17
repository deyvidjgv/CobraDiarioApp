import Badge from "./Badge";
import { IconDots, IconChevronRight } from "@tabler/icons-react";

/**
 * Fila de cliente. Una sola acción primaria: toda la fila abre la pantalla
 * de cobro. Las gestiones secundarias viven detrás del botón "···" (44×44),
 * no como tres botones diminutos por fila.
 *
 * Props nuevas:
 *  - onMore: si se pasa, muestra el botón "···" en lugar del chevron
 *  - done: atenúa la fila (gestión ya registrada hoy)
 */
export default function ClientRow({
  name,
  phone,
  status,
  subtitle,
  amount,
  onClick,
  onMore = null,
  done = false,
}) {
  const enMora = status === "mora";

  return (
    <div
      className={
        "w-full flex items-center gap-3 rounded-2xl bg-surface border border-line pl-4 pr-2 py-3 transition " +
        (enMora ? "border-l-[3px] border-l-mora border-l-solid " : "") +
        (done ? "opacity-55 " : "hover:border-primary/25 ")
      }
    >
      <button
        type="button"
        onClick={onClick}
        className="flex-1 min-w-0 text-left py-1"
      >
        <p className="text-[15px] font-semibold text-primary tracking-tight truncate">{name}</p>
        <p
          className={
            "num text-[11.5px] mt-0.5 truncate " + (enMora ? "text-mora" : "text-primary/50")
          }
        >
          {subtitle || phone}
        </p>
      </button>

      <div className="shrink-0 text-right">
        {amount && <p className="num text-sm font-medium text-primary">{amount}</p>}
        {status && <Badge status={status} />}
      </div>

      {onMore ? (
        <button
          type="button"
          onClick={onMore}
          aria-label={"Acciones de " + name}
          className="tap rounded-xl border border-line text-primary/50 hover:text-primary hover:border-primary/25 transition shrink-0"
        >
          <IconDots size={18} stroke={2} />
        </button>
      ) : (
        <button type="button" onClick={onClick} aria-label="Abrir" className="tap shrink-0 text-primary/35">
          <IconChevronRight size={18} stroke={1.5} />
        </button>
      )}
    </div>
  );
}
