/**
 * Formatea un número como monto en pesos colombianos con separadores de miles.
 * Usa Intl.NumberFormat con locale es-CO y sin decimales.
 * NO incluye el símbolo "$" — agrégalo en la UI según contexto.
 *
 * @param {number|null|undefined} numero
 * @returns {string}  Ejemplo: 1500000 → "1.500.000"
 */
export function formatearMonto(numero) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(
    numero ?? 0
  );
}

/**
 * Recibe un string formateado (ej. "1.500.000" o "1,500,000") y devuelve el número entero.
 */
export function limpiarMonto(montoStr) {
  if (!montoStr && montoStr !== 0) return "";
  const num = parseInt(montoStr.toString().replace(/\D/g, ""), 10);
  return isNaN(num) ? "" : num;
}

export function bloquearEntradaSoloNumeros(event) {
  const allowedKeys = [
    "Backspace",
    "Delete",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Tab",
    "Home",
    "End",
  ];
  if (allowedKeys.includes(event.key)) return;
  if (event.ctrlKey || event.metaKey) return;
  if (/^[0-9]$/.test(event.key)) return;
  event.preventDefault();
}

export function formatearFecha(fecha) {
  if (!fecha) return "";
  const date = typeof fecha === "string" ? new Date(fecha) : fecha;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function bloquearEntradaSoloNumerosConDecimal(event) {
  const allowedKeys = [
    "Backspace",
    "Delete",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Tab",
    "Home",
    "End",
  ];
  if (allowedKeys.includes(event.key)) return;
  if (event.ctrlKey || event.metaKey) return;
  if (/^[0-9]$/.test(event.key)) return;
  if (event.key === "." && !event.currentTarget.value.includes(".")) return;
  event.preventDefault();
}
