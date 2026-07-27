/**
 * Logica de caja - ledger de movimientos (ver README seccion 5.6)
 *
 * El saldo NUNCA se guarda como un numero editable directamente.
 * Siempre se calcula sumando movimientos, para poder auditar
 * cualquier dia pasado sin margen de error.
 */

export const TIPOS_MOVIMIENTO = {
  COBRO: "cobro", // entrada (+)
  PRESTAMO_NUEVO: "prestamo_nuevo", // salida (-)
  GASTO: "gasto", // salida (-)
  AJUSTE: "ajuste", // correccion manual, monto puede ser + o -
  INGRESO_BASE: "ingreso_base", // entrada (+)
  SEGURO: "seguro", // entrada (+)
  RECARGO_VENCIMIENTO: "recargo_vencimiento", // monto 0 (solo afecta deuda, no la caja)
};

/**
 * Construye un movimiento listo para guardar en Firestore.
 * clienteNombre y cobradorNombre se guardan de una vez (denormalizado)
 * para no tener que volver a leer clientes/creditos al mostrar el detalle.
 */
export function construirMovimiento({
  tipo,
  monto,
  orgId,
  referencia = null,
  nota = null,
  clienteNombre = null,
  cobradorNombre = null,
}) {
  const signo = (tipo === TIPOS_MOVIMIENTO.COBRO || tipo === TIPOS_MOVIMIENTO.INGRESO_BASE || tipo === TIPOS_MOVIMIENTO.SEGURO) ? 1 : -1;
  const montoFirmado = (tipo === TIPOS_MOVIMIENTO.AJUSTE || tipo === TIPOS_MOVIMIENTO.RECARGO_VENCIMIENTO) ? monto : signo * Math.abs(monto);

  return {
    orgId,
    tipo,
    monto: montoFirmado,
    referencia,
    nota,
    clienteNombre,
    cobradorNombre,
    fecha: new Date(),
  };
}

/**
 * Calcula el saldo de caja sumando una lista de movimientos.
 * Se usa tanto para el saldo del dia (movimientos de hoy) como
 * para recalcular a partir de un snapshot de daily_closings.
 */
export function calcularSaldo(movimientos) {
  return round2(movimientos.reduce((acc, m) => acc + m.monto, 0));
}

/**
 * Arma el snapshot detallado que se guarda en daily_closings al generar el reporte del día.
 * Enriquecido con datos adicionales para el reporte mejorado.
 */
export function construirCierreDiario(
  movimientosDelDia,
  nuevosClientes,
  nuevosCreditos,
  listaMora,
  fechaStr,
  datosCartera = {}
) {
  const entradas = movimientosDelDia.filter((m) => m.monto > 0);
  const salidas = movimientosDelDia.filter((m) => m.monto < 0);

  // Clasificamos movimientos
  const cobros = movimientosDelDia
    .filter((m) => m.tipo === TIPOS_MOVIMIENTO.COBRO)
    .map((m) => ({
      monto: m.monto,
      nota: m.nota || "",
      clienteNombre: m.clienteNombre || null,
      cobradorNombre: m.cobradorNombre || null,
      fecha: m.fecha ?? null,
      estado: m.estado || "",
      metodoPago: m.metodoPago || "efectivo",
    }));

  const recargos = movimientosDelDia
    .filter((m) => m.tipo === TIPOS_MOVIMIENTO.RECARGO_VENCIMIENTO)
    .map((m) => ({
      tipo: m.tipo,
      monto: m.montoRecargo || 0,
      nota: m.nota || "",
      clienteNombre: m.clienteNombre || null,
      cobradorNombre: m.cobradorNombre || null,
      fecha: m.fecha ?? null,
    }));

  const cajaMovements = movimientosDelDia
    .filter((m) => [TIPOS_MOVIMIENTO.GASTO, TIPOS_MOVIMIENTO.INGRESO_BASE, TIPOS_MOVIMIENTO.SEGURO].includes(m.tipo))
    .map((m) => ({
      tipo: m.tipo,
      monto: m.monto,
      nota: m.nota || "",
      cobradorNombre: m.cobradorNombre || null,
      fecha: m.fecha ?? null,
    }));

  return {
    fecha: fechaStr,
    totalEntradas: round2(entradas.reduce((acc, m) => acc + m.monto, 0)),
    totalSalidas: round2(Math.abs(salidas.reduce((acc, m) => acc + m.monto, 0))),
    saldoNeto: calcularSaldo(movimientosDelDia),
    cantidadMovimientos: movimientosDelDia.length,

    // Datos enriquecidos de cartera
    cartera: {
      capitalColocado: datosCartera.capitalColocado || 0,
      capitalRecuperado: datosCartera.capitalRecuperado || 0,
      saldoPendiente: datosCartera.saldoPendiente || 0,
      creditosActivos: datosCartera.creditosActivos || 0,
      creditosFinalizados: datosCartera.creditosFinalizados || 0,
      creditosVencidos: datosCartera.creditosVencidos || 0,
    },

    // Secciones para el PDF
    detalles: {
      cobros,
      recargos,
      caja: cajaMovements,
      nuevosClientes: nuevosClientes.map((c) => ({ nombre: c.nombre, telefono: c.telefono })),
      nuevosCreditos: nuevosCreditos.map((c) => ({ 
        cliente: c.clienteNombre || null,
        capital: c.capital, 
        total: c.montoTotalAPagar,
        cuotas: c.numeroCuotas,
        frecuencia: c.frecuencia,
        interes: c.interes,
      })),
      mora: listaMora.map((m) => ({ nombre: m.nombre, cuotasMora: m.cuotasMora, deficit: m.deficit })),
    },
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
