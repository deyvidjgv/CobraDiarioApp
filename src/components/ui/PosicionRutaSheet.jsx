import { useEffect, useState } from "react";

/**
 * Hoja inferior para llevar un cliente directo a una posición del
 * recorrido manual, sin tener que tocar la flecha veinte veces. Se abre
 * al tocar el número de posición de una fila en Ruta del Día.
 */
export default function PosicionRutaSheet({ open, nombre, posicion, total, onClose, onMover }) {
  const [valor, setValor] = useState("");

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (open) setValor(String(posicion ?? ""));
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, posicion]);

  if (!open) return null;

  const numero = parseInt(valor, 10);
  const valido = Number.isInteger(numero) && numero >= 1 && numero <= total;

  function mover(destino) {
    onMover(destino);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={onClose} />

      <form
        role="dialog"
        aria-label={"Mover a " + (nombre || "cliente") + " en la ruta"}
        onSubmit={(e) => {
          e.preventDefault();
          if (valido) mover(numero);
        }}
        className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-surface-1 rounded-t-3xl sm:rounded-3xl sm:mb-6 px-5 pt-3.5 pb-6 pb-safe flex flex-col gap-5 shadow-2xl"
      >
        <div className="w-9 h-1 rounded-full bg-primary/15 mx-auto" />

        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-primary tracking-tight">{nombre || "Cliente"}</h2>
          <p className="num text-xs text-primary/70">
            Posición actual {posicion} de {total}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => mover(1)}
            disabled={posicion === 1}
            className="h-12 rounded-xl bg-surface-2 text-sm font-semibold text-primary disabled:opacity-40"
          >
            Primero
          </button>
          <button
            type="button"
            onClick={() => mover(total)}
            disabled={posicion === total}
            className="h-12 rounded-xl bg-surface-2 text-sm font-semibold text-primary disabled:opacity-40"
          >
            Último
          </button>
        </div>

        <label className="flex flex-col gap-2">
          <span className="eyebrow">Llevar a la posición</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={total}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="num w-full h-12 rounded-2xl border border-line bg-surface px-4 text-base text-primary focus:outline-none focus:border-primary transition"
          />
        </label>

        <button
          type="submit"
          disabled={!valido || numero === posicion}
          className="h-14 rounded-2xl bg-gold text-surface-1 font-bold text-base active:scale-[0.99] transition disabled:opacity-40"
        >
          Mover
        </button>
      </form>
    </div>
  );
}
