/**
 * Logica de creacion de creditos (ver README secciones 5.3 y 5.4)
 */

import { calcularSeguro } from "./seguro";
import { construirVencimientoInicial } from "./vencimiento";
import { round2 } from "./formato";

/**
 * Calcula los totales de un credito nuevo a partir del capital,
 * el interes aplicado y el numero de cuotas.
 *
 * @param {number} capital - monto prestado
 * @param {number} interesAplicado - porcentaje, ej. 20 para 20%
 * @param {number} numeroCuotas
 * @returns {{ montoTotalAPagar: number, cuota: number, saldoPendiente: number }}
 */
export function calcularTotalesCredito(capital, interesAplicado, numeroCuotas) {
  const montoTotalAPagar = round2(capital + (capital * interesAplicado) / 100);
  const cuota = round2(montoTotalAPagar / numeroCuotas);

  return {
    montoTotalAPagar,
    cuota,
    saldoPendiente: montoTotalAPagar, // al crear, nadie ha pagado aun
  };
}

/**
 * Construye el documento de un credito nuevo, tomando el interes y la
 * frecuencia por defecto de la configuracion global SOLO como plantilla
 * inicial. Una vez creado, esos valores quedan fijos (snapshot) y un
 * cambio futuro en la configuracion global no los afecta - ver 5.4.
 *
 * El seguro (si esta activo) reduce lo que el cliente RECIBE en efectivo,
 * pero NO aumenta lo que debe pagar (eso sigue siendo solo capital + interes).
 * El interes por vencimiento (si esta activo) queda embebido como un
 * objeto `vencimiento` que se evalua dia a dia, ver logic/vencimiento.js.
 *
 * @param {object} input - datos capturados en el formulario "Nuevo credito"
 * @param {object} settings - configuracion global de la organizacion (org/settings)
 */
export function construirCredito(input, settings) {
  const interesAplicado = input.interes ?? settings.interesDefault;
  const { montoTotalAPagar, cuota, saldoPendiente } = calcularTotalesCredito(
    input.capital,
    interesAplicado,
    input.numeroCuotas
  );

  const seguroConfig = input.seguro ?? settings.seguroDefault ?? { activo: false };
  const { seguroMonto, totalARecibirCliente } = calcularSeguro(input.capital, seguroConfig);

  const loanBase = {
    clientId: input.clientId,
    capital: input.capital,
    interesAplicado, // snapshot: ya no se vuelve a leer de settings
    numeroCuotas: input.numeroCuotas,
    frecuencia: input.frecuencia,
    diasHabiles: input.diasHabiles ?? settings.diasHabilesDefault ?? [1, 2, 3, 4, 5, 6],
    diaSemana: input.diaSemana ?? settings.diaSemanaDefault ?? null,
    intervaloDias: input.intervaloDias ?? settings.intervaloDiasDefault ?? null,
    fechaInicio: input.fechaInicio,
    montoTotalAPagar,
    cuota,
    saldoPendiente,
    estado: "activo",
    seguro: seguroConfig.activo ? { ...seguroConfig, seguroMonto } : null,
  };

  const vencimientoConfig = input.vencimiento ?? settings.vencimientoDefault ?? { activo: false };
  const vencimiento = construirVencimientoInicial(vencimientoConfig, loanBase);

  return {
    ...loanBase,
    vencimiento, // null si no esta activo
    // Solo informativo, para mostrar en NuevoCredito/DetalleCredito cuanto salio de caja neto
    totalARecibirCliente,
  };
}
