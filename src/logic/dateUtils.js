/**
 * Utilidades para manejo de fechas y zonas horarias, forzando Colombia (UTC-5).
 */

/**
 * Retorna la fecha actual ajustada a la zona horaria de Colombia
 * en formato string "YYYY-MM-DD".
 * Esto evita problemas si el dispositivo del usuario está en otra zona horaria.
 * @returns {string} Fecha en formato "YYYY-MM-DD"
 */
export function getColombiaDateKey(dateInput = new Date()) {
  // Formateador que fuerza la zona horaria de Bogotá (Colombia)
  // formatToParts retorna un array con partes como year, month, day.
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(dateInput);
  const map = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }

  return `${map.year}-${map.month}-${map.day}`;
}

/** Convierte cualquier valor (Timestamp, Date, string) a Date JS sin desfases UTC */
export function toDate(val) {
  if (!val) return new Date();
  if (typeof val === "object" && typeof val.toDate === "function") return val.toDate(); // Firestore Timestamp
  if (val instanceof Date) return val;
  if (typeof val === "string") {
    // Si la cadena es "YYYY-MM-DD", crear la fecha en medianoche hora local sin convertir a UTC
    const dateOnlyMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0);
    }
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
}
