/**
 * Logica de frecuencia de cobro (ver README seccion 5.2)
 *
 * El dia de cobro solo se define como "un dia fijo de la semana"
 * cuando el intervalo es de 7 dias (semanal). Para quincenal o
 * mensual se usa un intervalo de dias desde la fecha de inicio,
 * sin fijar dia de semana - por eso no comparten la misma logica.
 */

const MS_POR_DIA = 1000 * 60 * 60 * 24;

/**
 * @param {object} loan - documento del credito
 * @param {string} loan.frecuencia - "diario" | "semanal" | "quincenal" | "mensual"
 * @param {number[]} [loan.diasHabiles] - 0=domingo..6=sabado, solo si frecuencia="diario"
 * @param {number} [loan.diaSemana] - 0=domingo..6=sabado, solo si frecuencia="semanal"
 * @param {number} [loan.intervaloDias] - 15 o 30, solo si frecuencia="quincenal"/"mensual"
 * @param {Date} loan.fechaInicio
 * @param {Date} hoy
 * @returns {number} cuotas vencidas hasta hoy (piso, minimo 0)
 */
export function calcularCuotasVencidas(loan, hoy = new Date()) {
  const inicio = startOfDay(loan.fechaInicio);
  const fin = startOfDay(hoy);

  if (fin < inicio) return 0;

  switch (loan.frecuencia) {
    case "diario":
      return contarDiasHabiles(inicio, fin, loan.diasHabiles ?? [1, 2, 3, 4, 5, 6]);

    case "semanal":
      return Math.floor(diffDias(inicio, fin) / 7);

    case "quincenal":
      return Math.floor(diffDias(inicio, fin) / 15);

    case "mensual":
      return Math.floor(diffDias(inicio, fin) / 30);

    default:
      throw new Error(`Frecuencia desconocida: ${loan.frecuencia}`);
  }
}

function contarDiasHabiles(inicio, fin, diasHabiles) {
  let contador = 0;
  const cursor = new Date(inicio);
  while (cursor <= fin) {
    if (diasHabiles.includes(cursor.getDay())) contador++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return contador;
}

function diffDias(a, b) {
  return Math.floor((b - a) / MS_POR_DIA);
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
