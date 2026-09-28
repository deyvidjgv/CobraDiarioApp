import Badge from "./Badge";
import { IconDots, IconChevronRight, IconChevronUp, IconChevronDown } from "@tabler/icons-react";

/**
 * Fila de cliente. Una sola acción primaria: toda la fila abre la pantalla
 * de cobro. Las gestiones secundarias viven detrás del botón "···" (44×44),
 * no como tres botones diminutos por fila.
 *
 * Props nuevas:
 *  - onMore: si se pasa, muestra el botón "···" en lugar del chevron
 *  - done: atenúa la fila (gestión ya registrada hoy)
 *  - reorder: { onUp, onDown, canUp, canDown } — si se pasa, agrega
 *    flechas arriba/abajo a la izquierda (orden manual de Ruta del Día).
 *    Flechas en vez de arrastrar: en la calle, con el celular en una mano
 *    y cobertura floja, un "drag" táctil falla mucho más que un toque.
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
  reorder = null,
}) {
  const enMora = status === "mora";

  return (
    <div
      className={
        "w-full flex items-center gap-2 rounded-2xl bg-surface border border-line pr-2 py-3 transition " +
        (reorder ? "pl-2 " : "pl-4 ") +
        (enMora ? "border-l-[3px] border-l-mora border-l-solid " : "") +
        (done ? "opacity-55 " : "hover:border-primary/25 ")
      }
    >
      {reorder && (
        <div className="flex flex-col shrink-0">
          <button
            type="button"
            onClick={reorder.onUp}
            disabled={!reorder.canUp}
            aria-label={"Subir " + name}
            className="w-7 h-6 flex items-center justify-center rounded-md text-primary/60 hover:text-primary hover:bg-surface-2 disabled:opacity-25 disabled:pointer-events-none transition"
          >
            <IconChevronUp size={15} stroke={2} />
          </button>
          <button
            type="button"
            onClick={reorder.onDown}
            disabled={!reorder.canDown}
            aria-label={"Bajar " + name}
            className="w-7 h-6 flex items-center justify-center rounded-md text-primary/60 hover:text-primary hover:bg-surface-2 disabled:opacity-25 disabled:pointer-events-none transition"
          >
            <IconChevronDown size={15} stroke={2} />
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={onClick}
        className="flex-1 min-w-0 text-left py-1"
      >
        <p className="text-[15px] font-semibold text-primary tracking-tight truncate">{name}</p>
        <p
          className={
            "num text-[11.5px] mt-0.5 truncate " + (enMora ? "text-mora" : "text-primary/70")
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
          className="tap rounded-xl border border-line text-primary/70 hover:text-primary hover:border-primary/25 transition shrink-0"
        >
          <IconDots size={18} stroke={2} />
        </button>
      ) : (
        <button type="button" onClick={onClick} aria-label="Abrir" className="tap shrink-0 text-primary/58">
          <IconChevronRight size={18} stroke={1.5} />
        </button>
      )}
    </div>
  );
}
