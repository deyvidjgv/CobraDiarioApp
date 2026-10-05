import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const anuncios = {
  onDragStart: () => "Cliente tomado. Arrástralo a su nueva posición.",
  onDragOver: () => undefined,
  onDragEnd: ({ over }) => (over ? "Cliente movido." : "Movimiento cancelado."),
  onDragCancel: () => "Movimiento cancelado.",
};

/**
 * Sección de la ruta reordenable arrastrando (orden manual de Ruta del
 * Día). Se arrastra desde una agarradera (el número de posición de la
 * fila), no desde toda la fila: así tocar la fila sigue abriendo el cobro
 * y deslizar sobre ella sigue haciendo scroll. La agarradera necesita
 * `touch-action: none` para que el dedo arrastre en vez de desplazar.
 *
 * @param {string[]} ids - ids de las filas, en el orden en que se muestran
 * @param {(desde: number, hasta: number) => void} onMover - índices al soltar
 */
export function ListaOrdenable({ ids, onMover, children }) {
  // 6 px de recorrido antes de arrastrar: un toque sin mover el dedo
  // sigue siendo un clic (abre la hoja de posición).
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function alSoltar({ active, over }) {
    if (!over || active.id === over.id) return;
    onMover(ids.indexOf(active.id), ids.indexOf(over.id));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      // Desplazamiento automático suave y solo vertical al acercar el dedo
      // al borde: con el valor por defecto la lista corría tan rápido que
      // la fila caía más lejos de donde se apuntaba.
      autoScroll={{ threshold: { x: 0, y: 0.15 }, acceleration: 4 }}
      onDragEnd={alSoltar}
      accessibility={{
        announcements: anuncios,
        screenReaderInstructions: {
          draggable: "Arrastra el número de posición para mover al cliente en la ruta.",
        },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

/**
 * Una fila dentro de ListaOrdenable. Entrega por render-prop lo que la
 * fila necesita: ref y estilo del contenedor, y ref + eventos de la
 * agarradera.
 */
export function FilaOrdenable({ id, children }) {
  const { setNodeRef, setActivatorNodeRef, listeners, transform, transition, isDragging } =
    useSortable({ id });

  return children({
    setNodeRef,
    handleRef: setActivatorNodeRef,
    listeners,
    isDragging,
    style: {
      // Solo eje vertical: la fila no se va de lado siguiendo al dedo.
      transform: CSS.Translate.toString(transform && { ...transform, x: 0 }),
      // Sin la transición de dnd-kit, "none": la clase `transition` de la
      // fila también anima transform y haría que se arrastre con retraso.
      transition: transition ?? "none",
      ...(isDragging ? { position: "relative", zIndex: 30 } : null),
    },
  });
}
