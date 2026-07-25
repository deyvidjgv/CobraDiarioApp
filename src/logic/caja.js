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
};

/**
 * Construye un movimiento listo para guardar en Firestore.
 */
export function construirMovimiento({ tipo, monto, orgId, referencia = null, nota = null }) {
  const signo = (tipo === TIPOS_MOVIMIENTO.COBRO || tipo === TIPOS_MOVIMIENTO.INGRESO_BASE) ? 1 : -1;
  const montoFirmado = tipo === TIPOS_MOVIMIENTO.AJUSTE ? monto : signo * Math.abs(monto);

  return {
    orgId,
    tipo,
    monto: montoFirmado,
    referencia,
    nota,
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
 */
export function construirCierreDiario(
  movimientosDelDia,
  nuevosClientes,
  nuevosCreditos,
  listaMora,
  fechaStr
) {
  const entradas = movimientosDelDia.filter((m) => m.monto > 0);
  const salidas = movimientosDelDia.filter((m) => m.monto < 0);

  // Clasificamos movimientos
  const cobros = movimientosDelDia
    .filter((m) => m.tipo === TIPOS_MOVIMIENTO.COBRO)
    .map((m) => ({
      monto: m.monto,
      nota: m.nota || "",
      // Si enviamos el estado enriquecido al generar el cierre, lo guardamos.
      estado: m.estado || "", 
    }));

  const cajaMovements = movimientosDelDia
    .filter((m) => m.tipo === TIPOS_MOVIMIENTO.GASTO || m.tipo === TIPOS_MOVIMIENTO.INGRESO_BASE)
    .map((m) => ({
      tipo: m.tipo,
      monto: m.monto,
      nota: m.nota || "",
    }));

  return {
    fecha: fechaStr,
    totalEntradas: round2(entradas.reduce((acc, m) => acc + m.monto, 0)),
    totalSalidas: round2(Math.abs(salidas.reduce((acc, m) => acc + m.monto, 0))),
    saldoNeto: calcularSaldo(movimientosDelDia),
    cantidadMovimientos: movimientosDelDia.length,

    // Secciones para el PDF
    detalles: {
      cobros,
      caja: cajaMovements,
      nuevosClientes: nuevosClientes.map((c) => ({ nombre: c.nombre, telefono: c.telefono })),
      nuevosCreditos: nuevosCreditos.map((c) => ({ capital: c.capital, total: c.montoTotalAPagar })),
      mora: listaMora.map((m) => ({ nombre: m.nombre, cuotasMora: m.cuotasMora, deficit: m.deficit })),
    },
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
