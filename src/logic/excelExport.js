/**
 * Exportación a Excel (.xlsx) con formato profesional: banner del negocio,
 * encabezados con color de marca, moneda con formato, filas cebra, paneles
 * congelados, autofiltro y totales resaltados.
 *
 * exceljs se importa dinámicamente: es pesada y solo se carga al exportar.
 */

// Paleta de la app (RGB)
const MARCA = "FF3B348C"; // primary oscuro (banner)
const MARCA_CLARA = "FF7F77DD"; // primary-light
const HEADER_FILL = "FF443E9E";
const ZEBRA = "FFF4F4FB";
const GRIS = "FF6B7280";
const BORDE = "FFE5E5EA";
const VERDE = "FFDCF5E7";
const VERDE_TXT = "FF157347";
const ROJO = "FFFDE4E6";
const ROJO_TXT = "FFB02A37";
const AMBAR = "FFFFF4D6";
const AMBAR_TXT = "FF997A00";

const MONEDA = '"$"#,##0';
const PORCENTAJE = '0.0"%"';

async function crearWorkbook() {
  const mod = await import("exceljs");
  // exceljs es UMD/CJS: según el bundler, Workbook viene en .default o directo
  const ExcelJS = mod.default ?? mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = "CobraDiario";
  wb.created = new Date();
  return wb;
}

function descargar(wb, filename) {
  return wb.xlsx.writeBuffer().then((buf) => {
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  });
}

/** Banner superior: negocio + tipo de reporte + fecha, ocupando el ancho. */
function banner(ws, { negocio, titulo, fecha, columnas }) {
  ws.mergeCells(1, 1, 1, columnas);
  const c1 = ws.getCell(1, 1);
  c1.value = negocio || "Cobro Diario";
  c1.font = { bold: true, size: 10, color: { argb: "FF9E9AC8" } };
  c1.alignment = { horizontal: "left", vertical: "middle" };

  ws.mergeCells(2, 1, 2, columnas);
  const c2 = ws.getCell(2, 1);
  c2.value = titulo;
  c2.font = { bold: true, size: 15, color: { argb: "FFFFFFFF" } };
  c2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: MARCA } };
  c2.alignment = { horizontal: "left", vertical: "middle" };
  ws.getRow(2).height = 26;

  ws.mergeCells(3, 1, 3, columnas);
  const c3 = ws.getCell(3, 1);
  c3.value = `${fecha}  ·  Generado ${new Date().toLocaleString("es-CO")}`;
  c3.font = { size: 9, color: { argb: GRIS } };
}

/** Fila de encabezados con estilo de marca. */
function filaHeader(ws, numFila, columnas) {
  const fila = ws.getRow(numFila);
  columnas.forEach((texto, i) => {
    const c = fila.getCell(i + 1);
    c.value = texto;
    c.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    c.alignment = { horizontal: "left", vertical: "middle" };
    c.border = {
      top: { style: "thin", color: { argb: HEADER_FILL } },
      bottom: { style: "thin", color: { argb: HEADER_FILL } },
    };
  });
  fila.height = 18;
}

/** Borde fino + cebra para filas de datos. */
function estiloFila(fila, zebra) {
  fila.eachCell((c) => {
    c.border = {
      top: { style: "hair", color: { argb: BORDE } },
      bottom: { style: "hair", color: { argb: BORDE } },
    };
    if (zebra) {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
    }
    c.font = { size: 10 };
  });
}

/** Fila de totales destacada. */
function filaTotales(ws, numFila, valores, columnasConFormato = []) {
  const fila = ws.getRow(numFila);
  valores.forEach((v, i) => {
    const c = fila.getCell(i + 1);
    c.value = v;
    c.font = { bold: true, size: 10 };
    c.border = { top: { style: "thin", color: { argb: MARCA_CLARA } } };
    if (columnasConFormato.includes(i)) c.numFmt = MONEDA;
  });
}

/** Título de sección dentro de una hoja. */
function tituloSeccion(ws, fila, texto, columnas) {
  ws.mergeCells(fila, 1, fila, columnas);
  const c = ws.getCell(fila, 1);
  c.value = texto;
  c.font = { bold: true, size: 11, color: { argb: MARCA } };
}

function aplicarAnchos(ws, anchos) {
  anchos.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
}

function nombreArchivo(tipo, negocio, fecha) {
  const limpia = (s) => (s || "").trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
  return `${tipo}${limpia(negocio) ? "_" + limpia(negocio) : ""}_${fecha}.xlsx`;
}

// ═══════════════════════════════════════════════════════════════════
// CARTERA GLOBAL
// ═══════════════════════════════════════════════════════════════════

export async function exportarCarteraExcel(datosCartera, nombreNegocio = "") {
  const wb = await crearWorkbook();
  const rg = datosCartera.resumenGeneral || {};
  const im = datosCartera.indiceMora || {};

  // ─── Hoja: Resumen ───
  const ws = wb.addWorksheet("Resumen", { properties: { tabColor: { argb: MARCA } } });
  aplicarAnchos(ws, [38, 20]);
  banner(ws, { negocio: nombreNegocio, titulo: "REPORTE DE CARTERA GLOBAL", fecha: `Fecha de corte: ${datosCartera.fecha}`, columnas: 2 });

  let f = 5;
  tituloSeccion(ws, f, "Indicadores generales", 2);
  f += 1;
  filaHeader(ws, f, ["Indicador", "Valor"]);
  const kpis = [
    ["Créditos totales", rg.totalCreditos ?? 0, null],
    ["Créditos activos", rg.creditosActivos ?? 0, null],
    ["Créditos completados", rg.creditosCompletados ?? 0, null],
    ["Créditos anulados", rg.creditosAnulados ?? 0, null],
    ["Capital colocado", rg.capitalColocado ?? 0, MONEDA],
    ["Total proyectado a cobrar", rg.totalProyectado ?? 0, MONEDA],
    ["Total recuperado", rg.totalRecuperado ?? 0, MONEDA],
    ["Saldo pendiente", rg.saldoPendiente ?? 0, MONEDA],
    ["% de recuperación", rg.porcentajeRecuperacion ?? 0, PORCENTAJE],
  ];
  kpis.forEach(([label, val, fmt], idx) => {
    const fila = ws.getRow(f + 1 + idx);
    fila.getCell(1).value = label;
    const c2 = fila.getCell(2);
    c2.value = val;
    if (fmt) c2.numFmt = fmt;
    c2.font = { bold: !!fmt, size: 10 };
    estiloFila(fila, idx % 2 === 1);
  });
  f += kpis.length + 2;

  tituloSeccion(ws, f, "Índice de mora (cartera en riesgo)", 2);
  f += 1;
  filaHeader(ws, f, ["Indicador", "Valor"]);
  const par = im.porcentaje ?? 0;
  const parFill = par <= 10 ? VERDE : par <= 25 ? AMBAR : ROJO;
  const parTxt = par <= 10 ? VERDE_TXT : par <= 25 ? AMBAR_TXT : ROJO_TXT;
  const moraKpis = [
    ["Cartera activa", im.carteraActiva ?? 0, MONEDA, null],
    ["Cartera en riesgo (PAR)", im.carteraEnRiesgo ?? 0, MONEDA, null],
    ["Índice de mora — PAR", im.porcentaje ?? 0, PORCENTAJE, [parFill, parTxt]],
    ["Clientes en mora", im.clientesEnMora ?? 0, null, null],
  ];
  moraKpis.forEach(([label, val, fmt, color], idx) => {
    const fila = ws.getRow(f + 1 + idx);
    fila.getCell(1).value = label;
    const c2 = fila.getCell(2);
    c2.value = val;
    if (fmt) c2.numFmt = fmt;
    if (color) {
      c2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color[0] } };
      c2.font = { bold: true, size: 10, color: { argb: color[1] } };
    } else {
      c2.font = { size: 10 };
    }
    estiloFila(fila, idx % 2 === 1 && !color);
  });

  // ─── Hoja: Créditos ───
  const wsC = wb.addWorksheet("Créditos", { properties: { tabColor: { argb: MARCA_CLARA } } });
  aplicarAnchos(wsC, [30, 10, 13, 15, 15, 15, 17, 12]);
  banner(wsC, { negocio: nombreNegocio, titulo: "DETALLE DE CRÉDITOS", fecha: `Cartera al ${datosCartera.fecha}`, columnas: 8 });

  const headC = ["Cliente", "Crédito", "Frecuencia", "Capital", "Total a pagar", "Pagado", "Saldo pendiente", "Estado"];
  filaHeader(wsC, 5, headC);

  const filas = datosCartera.filas || [];
  filas.forEach((d, idx) => {
    const fila = wsC.getRow(6 + idx);
    fila.getCell(1).value = d.cliente;
    fila.getCell(2).value = d.credito;
    fila.getCell(3).value = d.frecuencia;
    [4, 5, 6, 7].forEach((col) => (fila.getCell(col).numFmt = MONEDA));
    fila.getCell(4).value = d.capital;
    fila.getCell(5).value = d.totalPagar;
    fila.getCell(6).value = d.pagado;
    fila.getCell(7).value = d.saldo;
    const est = fila.getCell(8);
    est.value = d.estado;
    est.font = { bold: true, size: 10 };
    if (d.estado === "Activo") est.font = { bold: true, size: 10, color: { argb: "FF1D4ED8" } };
    else if (d.estado === "Completado") est.font = { bold: true, size: 10, color: { argb: VERDE_TXT } };
    else est.font = { bold: true, size: 10, color: { argb: ROJO_TXT } };
    estiloFila(fila, idx % 2 === 1);
  });

  const sum = (k) => filas.reduce((a, x) => a + (x[k] || 0), 0);
  filaTotales(
    wsC,
    6 + filas.length + 1,
    [`TOTALES — ${filas.length} créditos`, "", "", sum("capital"), sum("totalPagar"), sum("pagado"), sum("saldo"), ""],
    [3, 4, 5, 6]
  );

  wsC.views = [{ state: "frozen", ySplit: 5 }];
  if (filas.length > 0) {
    wsC.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5 + filas.length, column: 8 } };
  }

  // ─── Hoja: Mora ───
  const wsM = wb.addWorksheet("Mora", { properties: { tabColor: { argb: "FFDC2626" } } });
  aplicarAnchos(wsM, [30, 12, 18, 16, 18]);
  banner(wsM, { negocio: nombreNegocio, titulo: "MORA Y ANTIGÜEDAD", fecha: `Corte ${datosCartera.fecha}`, columnas: 5 });

  let fm = 5;
  tituloSeccion(wsM, fm, "Por tramos de días", 5);
  fm += 1;
  filaHeader(wsM, fm, ["Tramo", "Clientes", "Déficit"]);
  const aging = datosCartera.moraAging || [];
  aging.forEach((t, idx) => {
    const fila = wsM.getRow(fm + 1 + idx);
    fila.getCell(1).value = t.tramo;
    fila.getCell(2).value = t.clientes;
    fila.getCell(3).value = t.deficit;
    fila.getCell(3).numFmt = MONEDA;
    estiloFila(fila, idx % 2 === 1);
  });
  fm += aging.length + 2;

  tituloSeccion(wsM, fm, "Clientes con saldo pendiente (mayor primero)", 5);
  fm += 1;
  filaHeader(wsM, fm, ["Cliente", "Créditos", "Capital prestado", "Recuperado", "Saldo pendiente"]);
  const conSaldo = (datosCartera.resumenClientes || [])
    .filter((c) => c.saldoPendiente > 0)
    .sort((a, b) => b.saldoPendiente - a.saldoPendiente);
  conSaldo.forEach((c, idx) => {
    const fila = wsM.getRow(fm + 1 + idx);
    fila.getCell(1).value = c.nombre;
    fila.getCell(2).value = c.cantidad;
    [3, 4, 5].forEach((col) => (fila.getCell(col).numFmt = MONEDA));
    fila.getCell(3).value = c.capitalPrestado;
    fila.getCell(4).value = c.totalRecuperado;
    fila.getCell(5).value = c.saldoPendiente;
    estiloFila(fila, idx % 2 === 1);
  });
  const sumaSaldo = conSaldo.reduce((a, c) => a + c.saldoPendiente, 0);
  filaTotales(wsM, fm + conSaldo.length + 1, ["TOTALES", "", "", "", sumaSaldo], [4]);

  await descargar(wb, nombreArchivo("Cartera", nombreNegocio, datosCartera.fecha));
}

// ═══════════════════════════════════════════════════════════════════
// CIERRE DIARIO
// ═══════════════════════════════════════════════════════════════════

export async function exportarCierreExcel(cierre, nombreNegocio = "") {
  const wb = await crearWorkbook();
  const d = cierre.detalles || {};
  const efe = cierre.efectividad || {};
  const arq = cierre.arqueo || {};

  // ─── Hoja: Resumen ───
  const ws = wb.addWorksheet("Resumen", { properties: { tabColor: { argb: MARCA } } });
  aplicarAnchos(ws, [30, 20]);
  banner(ws, { negocio: nombreNegocio, titulo: "CIERRE DIARIO", fecha: `Fecha: ${cierre.fecha}`, columnas: 2 });

  let f = 5;
  tituloSeccion(ws, f, "Caja del día", 2);
  f += 1;
  filaHeader(ws, f, ["Concepto", "Valor"]);
  const cajaKpis = [
    ["Base inicial", arq.baseInicial ?? 0, MONEDA],
    ["Total entradas", cierre.totalEntradas ?? 0, MONEDA],
    ["Total salidas", cierre.totalSalidas ?? 0, MONEDA],
    ["Saldo neto del día", cierre.saldoNeto ?? 0, MONEDA],
  ];
  cajaKpis.forEach(([label, val, fmt], idx) => {
    const fila = ws.getRow(f + 1 + idx);
    fila.getCell(1).value = label;
    const c2 = fila.getCell(2);
    c2.value = val;
    if (fmt) c2.numFmt = fmt;
    c2.font = { bold: !!fmt, size: 10 };
    estiloFila(fila, idx % 2 === 1);
  });
  f += cajaKpis.length + 2;

  tituloSeccion(ws, f, "Efectividad de cobro", 2);
  f += 1;
  filaHeader(ws, f, ["Concepto", "Valor"]);
  const ef = efe.porcentaje;
  const efFill = ef == null ? null : ef >= 80 ? VERDE : ef >= 50 ? AMBAR : ROJO;
  const efTxt = ef == null ? null : ef >= 80 ? VERDE_TXT : ef >= 50 ? AMBAR_TXT : ROJO_TXT;
  const efeKpis = [
    ["Esperado hoy", efe.esperadoHoy ?? 0, MONEDA, null],
    ["Cobrado hoy", efe.cobradoHoy ?? 0, MONEDA, null],
    ["No cobrado", efe.noCobrado ?? 0, MONEDA, null],
    ["Efectividad", ef ?? "—", PORCENTAJE, efFill ? [efFill, efTxt] : null],
  ];
  efeKpis.forEach(([label, val, fmt, color], idx) => {
    const fila = ws.getRow(f + 1 + idx);
    fila.getCell(1).value = label;
    const c2 = fila.getCell(2);
    c2.value = val;
    if (fmt && typeof val === "number") c2.numFmt = fmt;
    if (color) {
      c2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color[0] } };
      c2.font = { bold: true, size: 10, color: { argb: color[1] } };
    }
    estiloFila(fila, idx % 2 === 1 && !color);
  });
  f += efeKpis.length + 2;

  tituloSeccion(ws, f, "Arqueo de caja", 2);
  f += 1;
  filaHeader(ws, f, ["Concepto", "Valor"]);
  const dif = arq.diferencia;
  const difOk = dif !== null && dif !== undefined && Math.abs(dif) < 1;
  const arqKpis = [
    ["Saldo esperado en caja", arq.saldoEsperado ?? cierre.saldoNeto ?? 0, MONEDA, null],
    [
      "Efectivo contado",
      arq.saldoContado !== null && arq.saldoContado !== undefined ? arq.saldoContado : "No reportado",
      MONEDA,
      null,
    ],
    [
      "Diferencia",
      dif !== null && dif !== undefined ? dif : "No reportado",
      MONEDA,
      dif === null || dif === undefined ? null : difOk ? [VERDE, VERDE_TXT] : [ROJO, ROJO_TXT],
    ],
  ];
  arqKpis.forEach(([label, val, fmt, color], idx) => {
    const fila = ws.getRow(f + 1 + idx);
    fila.getCell(1).value = label;
    const c2 = fila.getCell(2);
    c2.value = val;
    if (fmt && typeof val === "number") c2.numFmt = fmt;
    if (color) {
      c2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color[0] } };
      c2.font = { bold: true, size: 10, color: { argb: color[1] } };
    }
    estiloFila(fila, idx % 2 === 1 && !color);
  });

  // ─── Hoja: Cobros ───
  const wsCo = wb.addWorksheet("Cobros", { properties: { tabColor: { argb: VERDE_TXT } } });
  aplicarAnchos(wsCo, [10, 30, 14, 15, 14, 20]);
  banner(wsCo, { negocio: nombreNegocio, titulo: "COBROS DEL DÍA", fecha: `Fecha: ${cierre.fecha}`, columnas: 6 });

  filaHeader(wsCo, 5, ["Hora", "Cliente", "Valor", "Método", "Estado", "Cobrador"]);
  const horaDe = (fecha) => {
    if (!fecha) return "";
    const dt = fecha?.toDate ? fecha.toDate() : new Date(fecha);
    return dt instanceof Date && !isNaN(dt)
      ? dt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" })
      : "";
  };
  const cobros = d.cobros || [];
  cobros.forEach((c, idx) => {
    const fila = wsCo.getRow(6 + idx);
    fila.getCell(1).value = horaDe(c.fecha);
    fila.getCell(2).value = c.clienteNombre || "";
    fila.getCell(3).value = c.monto ?? 0;
    fila.getCell(3).numFmt = MONEDA;
    fila.getCell(4).value = c.metodoPago === "transferencia" ? "Transferencia" : "Efectivo";
    fila.getCell(5).value = c.estado || "";
    fila.getCell(6).value = c.cobradorNombre || "";
    estiloFila(fila, idx % 2 === 1);
  });
  const totalCobros = cobros.reduce((a, c) => a + (c.monto || 0), 0);
  filaTotales(wsCo, 6 + cobros.length + 1, ["", `TOTAL — ${cobros.length} cobros`, totalCobros, "", "", ""], [2]);

  wsCo.views = [{ state: "frozen", ySplit: 5 }];
  if (cobros.length > 0) {
    wsCo.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5 + cobros.length, column: 6 } };
  }

  // ─── Hoja: Caja y Mora ───
  const wsCm = wb.addWorksheet("Caja y Mora", { properties: { tabColor: { argb: "FFB45309" } } });
  aplicarAnchos(wsCm, [10, 18, 32, 14, 20]);
  banner(wsCm, { negocio: nombreNegocio, titulo: "MOVIMIENTOS DE CAJA Y MORA", fecha: `Fecha: ${cierre.fecha}`, columnas: 5 });

  let fc = 5;
  tituloSeccion(wsCm, fc, "Movimientos de caja", 5);
  fc += 1;
  filaHeader(wsCm, fc, ["Hora", "Tipo", "Concepto", "Valor", "Usuario"]);
  const cajaMovs = d.caja || [];
  cajaMovs.forEach((m, idx) => {
    const fila = wsCm.getRow(fc + 1 + idx);
    fila.getCell(1).value = horaDe(m.fecha);
    fila.getCell(2).value = m.tipo || "";
    fila.getCell(3).value = m.nota || "";
    fila.getCell(4).value = m.monto ?? 0;
    fila.getCell(4).numFmt = MONEDA;
    fila.getCell(5).value = m.cobradorNombre || "";
    estiloFila(fila, idx % 2 === 1);
  });
  fc += cajaMovs.length + 2;

  tituloSeccion(wsCm, fc, "Clientes en mora", 5);
  fc += 1;
  filaHeader(wsCm, fc, ["", "Cliente", "", "Cuotas vencidas", "Déficit"]);
  const moraLista = d.mora || [];
  moraLista.forEach((m, idx) => {
    const fila = wsCm.getRow(fc + 1 + idx);
    fila.getCell(2).value = m.nombre;
    fila.getCell(4).value = m.cuotasMora ?? 0;
    fila.getCell(5).value = m.deficit ?? 0;
    fila.getCell(5).numFmt = MONEDA;
    fila.getCell(5).font = { size: 10, color: { argb: ROJO_TXT } };
    estiloFila(fila, idx % 2 === 1);
  });

  await descargar(wb, nombreArchivo("Cierre", nombreNegocio, cierre.fecha));
}
