import * as XLSX from "xlsx";
import { formatearMonto } from "./formato";

/**
 * Exporta la cartera global a Excel (.xlsx) para análisis: el admin o el
 * contador puede filtrar, ordenar y hacer tablas dinámicas sobre los
 * datos. Usa la misma estructura que exportaCarteraGlobalPDF.
 *
 * Hojas: Resumen · Créditos · Mora
 */
export function exportarCarteraExcel(datosCartera, nombreNegocio = "") {
  const wb = XLSX.utils.book_new();

  // ─── Hoja 1: Resumen ───
  const rg = datosCartera.resumenGeneral || {};
  const im = datosCartera.indiceMora || {};
  const resumenRows = [
    ["REPORTE DE CARTERA GLOBAL"],
    [nombreNegocio ? `Negocio: ${nombreNegocio}` : null],
    [`Fecha de corte: ${datosCartera.fecha}`],
    [],
    ["INDICADOR", "VALOR"],
    ["Total de créditos", rg.totalCreditos ?? 0],
    ["Créditos activos", rg.creditosActivos ?? 0],
    ["Créditos completados", rg.creditosCompletados ?? 0],
    ["Créditos anulados", rg.creditosAnulados ?? 0],
    ["Capital colocado", rg.capitalColocado ?? 0],
    ["Total proyectado a cobrar", rg.totalProyectado ?? 0],
    ["Total recuperado", rg.totalRecuperado ?? 0],
    ["Saldo pendiente", rg.saldoPendiente ?? 0],
    ["% recuperación", rg.porcentajeRecuperacion ?? 0],
    [],
    ["ÍNDICE DE MORA"],
    ["Cartera activa", im.carteraActiva ?? 0],
    ["Cartera en riesgo (PAR)", im.carteraEnRiesgo ?? 0],
    ["% PAR", im.porcentaje ?? 0],
    ["Clientes en mora", im.clientesEnMora ?? 0],
  ].filter((row) => row[0] !== null);

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
  wsResumen["!cols"] = [{ wch: 34 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

  // ─── Hoja 2: Créditos ───
  const creditosHead = [
    ["NEGOCIO", nombreNegocio || "—"],
    [`CARTERA AL ${datosCartera.fecha}`],
    [],
  ];
  const creditosCols = [
    "Cliente",
    "Crédito",
    "Frecuencia",
    "Capital",
    "Total a pagar",
    "Pagado",
    "Saldo pendiente",
    "Estado",
  ];
  const creditosBody = (datosCartera.filas || []).map((f) => [
    f.cliente,
    f.credito,
    f.frecuencia,
    f.capital,
    f.totalPagar,
    f.pagado,
    f.saldo,
    f.estado,
  ]);
  const sumCapital = (datosCartera.filas || []).reduce((a, f) => a + f.capital, 0);
  const sumTotal = (datosCartera.filas || []).reduce((a, f) => a + f.totalPagar, 0);
  const sumPagado = (datosCartera.filas || []).reduce((a, f) => a + f.pagado, 0);
  const sumSaldo = (datosCartera.filas || []).reduce((a, f) => a + f.saldo, 0);
  const creditosRows = [
    ...creditosHead,
    creditosCols,
    ...creditosBody,
    [],
    ["TOTALES", "", "", sumCapital, sumTotal, sumPagado, sumSaldo, ""],
  ];

  const wsCreditos = XLSX.utils.aoa_to_sheet(creditosRows);
  wsCreditos["!cols"] = [
    { wch: 28 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, wsCreditos, "Créditos");

  // ─── Hoja 3: Mora ───
  const moraCols = ["Tramo de días", "Clientes", "Déficit"];
  const agingBody = (datosCartera.moraAging || []).map((t) => [t.tramo, t.clientes, t.deficit]);
  const resumenClientes = (datosCartera.resumenClientes || [])
    .filter((c) => c.saldoPendiente > 0)
    .sort((a, b) => b.saldoPendiente - a.saldoPendiente);
  const clientesMoraBody = resumenClientes.map((c) => [
    c.nombre,
    c.cantidad,
    c.capitalPrestado,
    c.totalRecuperado,
    c.saldoPendiente,
  ]);
  const moraRows = [
    ["MORA POR ANTIGÜEDAD"],
    [],
    moraCols,
    ...agingBody,
    [],
    [],
    ["CLIENTES CON SALDO (ordenado por saldo)"],
    [],
    ["Cliente", "Créditos", "Capital prestado", "Recuperado", "Saldo pendiente"],
    ...clientesMoraBody,
  ];

  const wsMora = XLSX.utils.aoa_to_sheet(moraRows);
  wsMora["!cols"] = [{ wch: 28 }, { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsMora, "Mora");

  const filename = `Cartera_${nombreNegocio ? nombreNegocio.replace(/\s+/g, "_") + "_" : ""}${datosCartera.fecha}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Exporta el cierre diario a Excel: hoja de cobros y hoja de caja para
 * cuadre operativo. El PDF sigue siendo el comprobante oficial (firmas);
 * este archivo es para trabajar los números.
 */
export function exportarCierreExcel(cierre, nombreNegocio = "") {
  const wb = XLSX.utils.book_new();

  const d = cierre.detalles || {};

  // ─── Hoja 1: Resumen del día ───
  const resumenRows = [
    ["CIERRE DIARIO"],
    [nombreNegocio ? `Negocio: ${nombreNegocio}` : null],
    [`Fecha: ${cierre.fecha}`],
    [],
    ["CONCEPTO", "VALOR"],
    ["Base inicial", cierre.arqueo?.baseInicial ?? 0],
    ["Total entradas", cierre.totalEntradas ?? 0],
    ["Total salidas", cierre.totalSalidas ?? 0],
    ["Saldo neto del día", cierre.saldoNeto ?? 0],
    [],
    ["EFECTIVIDAD DE COBRO"],
    ["Esperado hoy", cierre.efectividad?.esperadoHoy ?? 0],
    ["Cobrado hoy", cierre.efectividad?.cobradoHoy ?? 0],
    ["No cobrado", cierre.efectividad?.noCobrado ?? 0],
    ["Efectividad %", cierre.efectividad?.porcentaje ?? "—"],
    [],
    ["ARQUEO DE CAJA"],
    ["Saldo esperado", cierre.arqueo?.saldoEsperado ?? cierre.saldoNeto ?? 0],
    ["Efectivo contado", cierre.arqueo?.saldoContado ?? "No reportado"],
    ["Diferencia", cierre.arqueo?.diferencia ?? "No reportado"],
  ].filter((row) => row[0] !== null);

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
  wsResumen["!cols"] = [{ wch: 26 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

  // ─── Hoja 2: Cobros ───
  const horaDe = (fecha) => {
    if (!fecha) return "";
    const dt = fecha?.toDate ? fecha.toDate() : new Date(fecha);
    return dt instanceof Date && !isNaN(dt)
      ? dt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" })
      : "";
  };
  const cobrosRows = [
    ["HORA", "CLIENTE", "VALOR", "MÉTODO", "ESTADO", "COBRADOR"],
    ...(d.cobros || []).map((c) => [
      horaDe(c.fecha),
      c.clienteNombre || "",
      c.monto ?? 0,
      c.metodoPago === "transferencia" ? "Transferencia" : "Efectivo",
      c.estado || "",
      c.cobradorNombre || "",
    ]),
  ];
  const wsCobros = XLSX.utils.aoa_to_sheet(cobrosRows);
  wsCobros["!cols"] = [{ wch: 8 }, { wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsCobros, "Cobros");

  // ─── Hoja 3: Caja y mora ───
  const cajaRows = [
    ["MOVIMIENTOS DE CAJA"],
    ["HORA", "TIPO", "CONCEPTO", "VALOR", "USUARIO"],
    ...(d.caja || []).map((m) => [
      horaDe(m.fecha),
      m.tipo || "",
      m.nota || "",
      m.monto ?? 0,
      m.cobradorNombre || "",
    ]),
    [],
    ["CLIENTES EN MORA"],
    ["CLIENTE", "CUOTAS VENCIDAS", "DÉFICIT"],
    ...(d.mora || []).map((m) => [m.nombre, m.cuotasMora ?? 0, m.deficit ?? 0]),
  ];
  const wsCaja = XLSX.utils.aoa_to_sheet(cajaRows);
  wsCaja["!cols"] = [{ wch: 8 }, { wch: 16 }, { wch: 30 }, { wch: 12 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsCaja, "Caja y Mora");

  const filename = `Cierre_${cierre.fecha}${nombreNegocio ? "_" + nombreNegocio.replace(/\s+/g, "_") : ""}.xlsx`;
  XLSX.writeFile(wb, filename);
}
