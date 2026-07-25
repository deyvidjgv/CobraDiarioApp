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

/**
 * Calcula el estado de un credito: cuanto deberia llevar pagado,
 * cuanto ha pagado, y el deficit (positivo = mora, negativo = adelanto).
 *
 * @param {number} cuotasVencidas - cuantas cuotas ya deberian haberse pagado a hoy
 * @param {number} cuota - monto de cada cuota
 * @param {number} pagadoAcumulado - suma de todos los pagos hechos a este credito
 * @returns {{ esperadoAcumulado: number, deficit: number, cuotasMora: number, estado: string }}
 */
export function calcularEstadoMora(cuotasVencidas, cuota, pagadoAcumulado) {
  const esperadoAcumulado = round2(cuotasVencidas * cuota);
  const deficit = round2(esperadoAcumulado - pagadoAcumulado);

  if (deficit > 0) {
    return {
      esperadoAcumulado,
      deficit,
      cuotasMora: round2(deficit / cuota),
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

function round2(n) {
  return Math.round(n * 100) / 100;
}
