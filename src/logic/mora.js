/**
 * Logica de mora - modelo de deficit acumulado (ver README seccion 5.1)
 *
 * La mora NUNCA se calcula como "dias desde el ultimo pago" - eso se
 * resetea mal en cuanto el cliente paga algo, aunque siga debiendo.
 *
 * En su lugar, se compara cuanto deberia llevar pagado hasta hoy
 * contra cuanto ha pagado realmente. Un pago nuevo nunca "resetea"
 * nada, solo reduce el deficit acumulado.
 */
import { toDate } from "./dateUtils";
import { calcularCuotasVencidas } from "./frecuencia";
import { round2 } from "./formato";

/**
 * Calcula el estado de un credito: cuanto deberia llevar pagado,
 * cuanto ha pagado, y el deficit (positivo = mora, negativo = adelanto).
 *
 * @param {number} cuotasVencidas - cuantas cuotas ya deberian haberse pagado a hoy
 * @param {number} cuota - monto de cada cuota
 * @param {number} pagadoAcumulado - suma de todos los pagos hechos a este credito
 * @returns {{ esperadoAcumulado: number, deficit: number, cuotasMora: number, estado: string }}
 */
export function calcularEstadoMora(cuotasVencidas, cuota, pagadoAcumulado, saldoPendiente = Infinity) {
  const esperadoAcumulado = round2(cuotasVencidas * cuota);
  let deficit = round2(esperadoAcumulado - pagadoAcumulado);

  // El déficit NUNCA puede sobrepasar lo que el cliente realmente debe en total
  if (saldoPendiente != null && deficit > saldoPendiente) {
    deficit = round2(saldoPendiente);
  }

  if (deficit > 0) {
    return {
      esperadoAcumulado,
      deficit,
      cuotasMora: cuota > 0 ? round2(deficit / cuota) : 0,
      estado: "mora",
    };
  }

  if (deficit < 0) {
    return {
      esperadoAcumulado,
      deficit,
      cuotasMora: 0,
      adelanto: round2(Math.abs(deficit)),
      estado: "adelantado",
    };
  }

  return {
    esperadoAcumulado,
    deficit: 0,
    cuotasMora: 0,
    estado: "al_dia",
  };
}

/**
 * Calcula todo el estado de mora y cuotas vencidas para un préstamo,
 * convirtiendo su fecha de inicio si es necesario.
 * @param {object} loan 
 */
export function calcularMoraGlobal(loan, hoy = new Date()) {
  const cuotasVencidas = calcularCuotasVencidas(
    {
      ...loan,
      fechaInicio: toDate(loan.fechaInicio),
    },
    hoy
  );
  const pagado = loan.montoTotalAPagar - (loan.saldoPendiente ?? 0);
  return calcularEstadoMora(cuotasVencidas, loan.cuota, pagado, loan.saldoPendiente);
}

/**
 * Estado de mora proyectado al cierre de HOY: igual que calcularMoraGlobal
 * pero contando también la cuota de hoy en lo esperado (si hoy es día de
 * cobro). La ruta del día lo usa para distinguir a quién falta cobrarle
 * (deficit > 0) de quien ya cubrió la cuota con un adelanto.
 *
 * @param {object} loan
 * @param {Date} [hoy]
 */
export function calcularMoraGlobalAlCierre(loan, hoy = new Date()) {
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);
  return calcularMoraGlobal(loan, manana);
}
