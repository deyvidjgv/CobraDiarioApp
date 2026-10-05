import Badge from "./Badge";
import {
  IconDots,
  IconChevronRight,
  IconChevronUp,
  IconChevronDown,
  IconGripHorizontal,
} from "@tabler/icons-react";

/**
 * Fila de cliente. Una sola acción primaria: toda la fila abre la pantalla
 * de cobro. Las gestiones secundarias viven detrás del botón "···" (44×44),
 * no como tres botones diminutos por fila.
 *
 * Props nuevas:
 *  - onMore: si se pasa, muestra el botón "···" en lugar del chevron
 *  - done: atenúa la fila (gestión ya registrada hoy)
 *  - tag: { texto, destacado } — etiqueta corta antes del subtítulo (el
 *    día de cobro en la lista manual de Ruta del Día)
 *  - reorder: { onUp, onDown, canUp, canDown, posicion, onPosicion, drag }
 *    — si se pasa, agrega flechas arriba/abajo a la izquierda y el número
 *    de posición en el recorrido (orden manual de Ruta del Día). El número
 *    es también la agarradera: arrastrarlo mueve la fila (`drag`, ver
 *    ListaOrdenable) y tocarlo permite elegir la posición. Las flechas
 *    quedan como alternativa de un toque cuando arrastrar no es cómodo.
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
  tag = null,
  reorder = null,
}) {
  const enMora = status === "mora";
  const drag = reorder?.drag;

  return (
    <div
      ref={drag?.setNodeRef}
      style={drag?.style}
      className={
        "w-full flex items-center gap-2 rounded-2xl bg-surface border border-line pr-2 py-3 transition " +
        (reorder ? "pl-2 " : "pl-4 ") +
        (enMora ? "border-l-[3px] border-l-mora border-l-solid " : "") +
        (drag?.isDragging
          ? "border-gold/60 shadow-xl shadow-black/60 "
          : done
          ? "opacity-55 "
          : "hover:border-primary/25 ")
      }
    >
      {reorder && (
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex flex-col">
            <button
              type="button"
              onClick={reorder.onUp}
              disabled={!reorder.canUp}
              aria-label={"Subir " + name}
              className="w-8 h-6 flex items-center justify-center rounded-md text-primary/60 hover:text-primary hover:bg-surface-2 disabled:opacity-25 disabled:pointer-events-none transition"
            >
              <IconChevronUp size={15} stroke={2} />
            </button>
            <button
              type="button"
              onClick={reorder.onDown}
              disabled={!reorder.canDown}
              aria-label={"Bajar " + name}
              className="w-8 h-6 flex items-center justify-center rounded-md text-primary/60 hover:text-primary hover:bg-surface-2 disabled:opacity-25 disabled:pointer-events-none transition"
            >
              <IconChevronDown size={15} stroke={2} />
            </button>
          </div>
          {reorder.posicion != null && (
            <button
              type="button"
              ref={drag?.handleRef}
              {...drag?.listeners}
              onClick={reorder.onPosicion}
              aria-label={
                "Posición " + reorder.posicion + " de " + name + ": arrastra para mover o toca para elegir posición"
              }
              className={
                "num min-w-[34px] h-11 px-1 flex flex-col items-center justify-center gap-0.5 rounded-lg border bg-surface-2 text-[12px] font-semibold leading-none transition touch-none select-none " +
                (drag ? "cursor-grab active:cursor-grabbing " : "") +
                (drag?.isDragging
                  ? "border-gold text-gold"
                  : "border-line text-primary/80 hover:text-primary hover:border-primary/25")
              }
            >
              {drag && <IconGripHorizontal size={12} stroke={2} className="opacity-60" />}
              {reorder.posicion}
            </button>
          )}
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
          {tag && (
            <span
              className={
                "mr-1.5 px-1.5 py-px rounded-md text-[10px] font-semibold uppercase tracking-wide " +
                (tag.destacado ? "bg-gold/15 text-gold" : "bg-surface-2 text-primary/75")
              }
            >
              {tag.texto}
            </span>
          )}
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
