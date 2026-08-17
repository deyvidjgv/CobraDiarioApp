/**
 * Aviso temporal con salida. Aparece sobre la barra inferior después de
 * cada gestión: en la calle los toques equivocados son constantes y sin
 * "Deshacer" el error queda escrito.
 */
export default function UndoToast({ mensaje, onUndo }) {
  if (!mensaje) return null;
  return (
    <div className="fixed left-0 right-0 bottom-[86px] md:bottom-6 z-40 px-4 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full sm:max-w-md bg-surface-2 border border-line text-primary rounded-2xl px-4 py-3.5 flex items-center justify-between gap-4 shadow-xl shadow-black/50">
        <span className="text-sm font-medium">{mensaje}</span>
        <button
          type="button"
          onClick={onUndo}
          className="text-sm font-bold text-gold shrink-0 px-1 py-0.5"
        >
          Deshacer
        </button>
      </div>
    </div>
  );
}
