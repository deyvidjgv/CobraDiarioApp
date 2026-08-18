import { addDays, addMonths } from "date-fns";
import { round2 } from "./formato";
import { toDate } from "./dateUtils";

/**
 * Fecha en que vence la última cuota.
 *
 * "mensual" es calendario, no 30 días corridos: un crédito del 31 de
 * enero a 3 cuotas vence el 30 de abril, no el 1 de mayo. Con días fijos
 * la fecha se corría uno o dos días por ciclo y nunca caía en el mismo
 * día del mes que el cliente tenía en la cabeza.
 *
 * "quincenal" sí es cada 15 días corridos — es lo que literalmente
 * significa en este negocio.
 */
export function calcularFechaVencimientoTotal(loanBase) {
  const { fechaInicio, numeroCuotas, frecuencia, diasHabiles } = loanBase;
  // toDate parsea "YYYY-MM-DD" como medianoche LOCAL; new Date() lo
  // parseaba como UTC, y en Colombia (UTC-5) eso guardaba el día anterior:
  // la fecha almacenada y la mostrada en pantalla no coincidían.
  const dInicio = toDate(fechaInicio);

  if (frecuencia === "diario") {
    let cursor = new Date(dInicio);
    let cuotasContadas = 0;
    const habiles = diasHabiles ?? [1, 2, 3, 4, 5, 6]; // Lunes a Sabado por defecto
    
    // Si la fecha de inicio no es habil, el ciclo empieza ese dia pero cuenta como 0
    // Asumiremos que el prestamo empieza a cobrar al dia siguiente habil o el mismo dia si es habil.
    // Simplificamos avanzando un dia a la vez hasta cumplir numeroCuotas habiles.
    while (cuotasContadas < numeroCuotas) {
      if (habiles.includes(cursor.getDay())) {
        cuotasContadas++;
      }
      if (cuotasContadas < numeroCuotas) {
        cursor = addDays(cursor, 1);
      }
    }
    return cursor;
  } else if (frecuencia === "semanal") {
    return addDays(dInicio, numeroCuotas * 7);
  } else if (frecuencia === "quincenal") {
    return addDays(dInicio, numeroCuotas * 15);
  } else if (frecuencia === "mensual") {
    return addMonths(dInicio, numeroCuotas);
  }
  return dInicio;
}

export function construirVencimientoInicial(vencimientoConfig, loanBase) {
  if (!vencimientoConfig || !vencimientoConfig.activo) {
    return null;
  }

  const fechaVencimientoTotal = calcularFechaVencimientoTotal(loanBase);
  const modoInicial = vencimientoConfig.modoInicial || "al_vencer";
  
  let proximoCorte;
  if (modoInicial === "mensual") {
    // Un mes de calendario, mismo criterio que calcularFechaVencimientoTotal.
    proximoCorte = addMonths(toDate(loanBase.fechaInicio), 1);
  } else {
    proximoCorte = fechaVencimientoTotal;
  }

  return {
    activo: true,
    modoInicial,
    porcentaje: vencimientoConfig.porcentaje || 20,
    fechaVencimientoTotal: fechaVencimientoTotal.toISOString(),
    continuacion: null, // null hasta que se tome una decisión al vencer por primera vez
    proximoCorte: proximoCorte.toISOString(),
    recargosAcumulados: 0,
    fechaUltimoRecargo: null
  };
}

/**
 * Retorna true si ya pasó o es igual al día del proximoCorte.
 */
export function hayCorteVencidoPendiente(loan, hoy = new Date()) {
  const vencimiento = loan.vencimiento;
  if (!vencimiento || !vencimiento.activo) return false;
  if (!vencimiento.proximoCorte) return false;
  if (loan.saldoPendiente <= 0) return false; // No hay mora si no debe nada
  
  const corte = new Date(vencimiento.proximoCorte);
  corte.setHours(0,0,0,0);
  
  const h = new Date(hoy);
  h.setHours(0,0,0,0);
  
  if (h < corte) return false;
  if (!vencimiento.fechaUltimoRecargo) return true;

  const ultimoRecargo = new Date(vencimiento.fechaUltimoRecargo);
  ultimoRecargo.setHours(0,0,0,0);
  return ultimoRecargo < corte;
}

export function esCreditoVencido(loan, hoy = new Date()) {
  const vencimiento = loan.vencimiento;
  if (!vencimiento || !vencimiento.activo) return false;
  if (!vencimiento.proximoCorte) return false;
  if (loan.saldoPendiente <= 0) return false;

  const corte = new Date(vencimiento.proximoCorte);
  corte.setHours(0,0,0,0);
  const h = new Date(hoy);
  h.setHours(0,0,0,0);

  return h >= corte;
}

/**
 * Calcula el monto del recargo como porcentaje del saldo pendiente actual.
 */
export function calcularRecargo(saldoPendiente, porcentaje) {
  const recargo = (saldoPendiente * porcentaje) / 100;
  return round2(recargo);
}
