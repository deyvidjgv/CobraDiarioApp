/**
 * Logica de frecuencia de cobro (ver README seccion 5.2)
 *
 * El dia de cobro solo se define como "un dia fijo de la semana"
 * cuando el intervalo es de 7 dias (semanal). Para quincenal o
 * mensual se usa un intervalo de dias desde la fecha de inicio,
 * sin fijar dia de semana - por eso no comparten la misma logica.
 */

import { addMonths } from "date-fns";
import { toDate } from "./dateUtils";

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

  // Si hoy es la fecha de inicio del crédito o anterior, aún no hay días pasados en mora.
  if (fin <= inicio) return 0;

  // Evaluamos las cuotas de los días efectivamente transcurridos hasta ayer
  const ayer = new Date(fin);
  ayer.setDate(ayer.getDate() - 1);

  const maxCuotas = loan.numeroCuotas ?? Infinity;
  let calculadas = 0;

  switch (loan.frecuencia) {
    case "diario":
      calculadas = contarDiasHabiles(inicio, ayer, loan.diasHabiles ?? [1, 2, 3, 4, 5, 6]);
      break;

    case "semanal":
      calculadas = Math.floor(diffDias(inicio, ayer) / 7);
      break;

    case "quincenal":
      calculadas = Math.floor(diffDias(inicio, ayer) / 15);
      break;

    case "mensual":
      // Meses de calendario, no bloques de 30 días: la cuota cae siempre
      // en el mismo día del mes (31 ene → 28 feb → 31 mar) en vez de
      // irse corriendo un par de días por ciclo.
      //
      // Se cuentan las fechas de cuota REALES que ya pasaron, en vez de
      // usar differenceInMonths: addMonths recorta a fin de mes
      // (31 ene + 3 = 30 abr) pero differenceInMonths no lo compensa
      // (30 abr − 31 ene = 2, no 3). Derivándolo de addMonths, este
      // conteo y calcularFechaVencimientoTotal comparten exactamente el
      // mismo calendario.
      calculadas = contarCuotasMensuales(inicio, ayer, maxCuotas);
      break;

    default:
      // Un documento con `frecuencia` corrupta/nula no debe tumbar la
      // pantalla de nadie: se trata como si aún no tuviera cuotas vencidas
      // (conservador — no marca mora sobre un dato que no se puede leer).
      console.warn(`[frecuencia] Frecuencia desconocida "${loan.frecuencia}" en crédito ${loan.id ?? "?"}`);
      calculadas = 0;
  }

  return Math.min(maxCuotas, calculadas);
}

/**
 * Determina si la fecha dada es un día de cobro programado para el
 * crédito: cuenta las cuotas vencidas hasta hoy y hasta ayer; si hoy
 * suma una más, es que hoy toca cobrar. Respeta el calendario de cada
 * frecuencia (días hábiles, día de semana, intervalos) y el tope de
 * cuotas: pasada la última cuota ya no hay día de cobro.
 *
 * @param {object} loan - documento del crédito (fechaInicio puede ser Timestamp/ISO)
 * @param {Date} [hoy]
 * @returns {boolean}
 */
export function esDiaDeCobro(loan, hoy = new Date()) {
  const normalizado = { ...loan, fechaInicio: toDate(loan.fechaInicio) };
  const manana = startOfDay(hoy);
  manana.setDate(manana.getDate() + 1);
  return calcularCuotasVencidas(normalizado, manana) > calcularCuotasVencidas(normalizado, hoy);
}

/**
 * Cuántas fechas de cuota mensual (inicio + 1 mes, + 2 meses, ...) ya
 * quedaron en el pasado a la fecha `fin`. El tope evita recorrer para
 * siempre si el crédito no trae numeroCuotas.
 */
function contarCuotasMensuales(inicio, fin, maxCuotas) {
  const tope = Number.isFinite(maxCuotas) ? maxCuotas : 600; // 50 años
  let n = 0;
  while (n < tope && addMonths(inicio, n + 1) <= fin) n++;
  return n;
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
