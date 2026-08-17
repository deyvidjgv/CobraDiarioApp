import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { formatearMonto } from './formato';

/**
 * Genera y descarga un PDF con tabla de datos.
 *
 * @param {string} titulo - titulo del reporte
 * @param {string[]} columnas - encabezados de columna
 * @param {Array<string[]>} filas - filas de datos
 * @param {string} [subtitulo] - linea de contexto (ej. rango de fechas)
 */
export function exportarPDF(titulo, columnas, filas, subtitulo = '') {
  const doc = new jsPDF();

  // Encabezado
  doc.setFontSize(18);
  doc.setTextColor(38, 33, 92); // primary
  doc.text(titulo, 14, 20);

  if (subtitulo) {
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(subtitulo, 14, 28);
  }

  // Tabla
  doc.autoTable({
    startY: subtitulo ? 34 : 28,
    head: [columnas],
    body: filas,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [31, 58, 95], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 243, 237] },
  });

  // Pie
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(160);
    doc.text(
      `Generado por CrediDev — ${new Date().toLocaleDateString()}`,
      14,
      doc.internal.pageSize.height - 10,
    );
  }

  const filename = `${titulo.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

function ensurePageBreak(doc, currentY, minSpace, pageHeight, margin = 14) {
  if (currentY + minSpace > pageHeight - margin) {
    doc.addPage();
    return 15;
  }
  return currentY;
}

/**
 * Genera un PDF de cierre diario profesional y estructurado.
 * Reporte mejorado con 11 secciones claramente definidas.
 */
export function exportarCierreDiarioPDF(cierre, nombreNegocio = '') {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - 2 * margin;
  let currentY = 15;

  // Estilos consistentes
  const colors = {
    primary: [31, 58, 95],
    darkGray: [50, 50, 50],
    lightGray: [120, 120, 120],
    border: [200, 200, 200],
  };

  const tableStyles = {
    theme: 'plain',
    margin: { left: margin, right: margin, top: 0, bottom: 16 },
    pageBreak: 'auto',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 3,
      textColor: colors.darkGray,
      lineColor: colors.border,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: colors.primary,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
  };

  // ==================== 1. ENCABEZADO ====================
  if (nombreNegocio) {
    doc.setFontSize(12);
    doc.setTextColor(...colors.lightGray);
    doc.text(nombreNegocio, margin, currentY);
    currentY += 6;
  }
  doc.setFontSize(18);
  doc.setTextColor(...colors.primary);
  doc.text('Reporte de Cierre Diario', margin, currentY);
  currentY += 8;

  doc.setFontSize(10);
  doc.setTextColor(...colors.darkGray);
  doc.text(`Fecha del cierre: ${cierre.fecha}`, margin, currentY);
  currentY += 5;

  // Hora local formateada
  const formatter = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'short',
    timeStyle: 'short',
  });
  let timeStr = '';
  try {
    timeStr = formatter.format(new Date());
  } catch (e) {
    timeStr = new Date().toLocaleString();
  }
  doc.text(`Generado: ${timeStr}`, margin, currentY);
  currentY += 7;

  // Línea separadora
  doc.setDrawColor(...colors.border);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  // ==================== 2. RESUMEN GENERAL ====================
  currentY = ensurePageBreak(doc, currentY, 38, pageHeight, margin);
  doc.setFontSize(11);
  doc.setTextColor(...colors.primary);
  doc.text('2. Resumen General', margin, currentY);
  currentY += 5;

  const resumenData = [
    ['Total de entradas', `$${formatearMonto(cierre.totalEntradas)}`],
    ['Total de salidas', `$${formatearMonto(cierre.totalSalidas)}`],
    ['Saldo neto', `$${formatearMonto(cierre.saldoNeto)}`],
    ['Cobros realizados', `${cierre.detalles?.cobros?.length || 0}`],
    ['Créditos creados', `${cierre.detalles?.nuevosCreditos?.length || 0}`],
    ['Clientes en mora', `${cierre.detalles?.mora?.length || 0}`],
  ];

  doc.autoTable({
    startY: currentY,
    head: [['Indicador', 'Valor']],
    body: resumenData,
    ...tableStyles,
  });
  currentY = doc.lastAutoTable.finalY + 8;

  // ==================== 3. EFECTIVIDAD DE COBRO DEL DÍA ====================
  currentY = ensurePageBreak(doc, currentY, 38, pageHeight, margin);
  doc.setFontSize(11);
  doc.setTextColor(...colors.primary);
  doc.text('3. Efectividad de Cobro del Día', margin, currentY);
  currentY += 5;

  const efe = cierre.efectividad || {};
  const efectividadData = [
    [
      'Valor esperado (cuotas del día)',
      `$${formatearMonto(efe.esperadoHoy || 0)}`,
    ],
    ['Valor cobrado', `$${formatearMonto(efe.cobradoHoy || 0)}`],
    ['No cobrado', `$${formatearMonto(efe.noCobrado || 0)}`],
    [
      'Efectividad (cobrado / esperado)',
      efe.porcentaje != null ? `${efe.porcentaje.toFixed(1)}%` : '—',
    ],
  ];

  doc.autoTable({
    startY: currentY,
    head: [['Indicador', 'Valor']],
    body: efectividadData,
    ...tableStyles,
  });
  currentY = doc.lastAutoTable.finalY + 8;

  // ==================== 4. ARQUEO DE CAJA ====================
  currentY = ensurePageBreak(doc, currentY, 50, pageHeight, margin);
  doc.setFontSize(11);
  doc.setTextColor(...colors.primary);
  doc.text('4. Arqueo de Caja (Cuadre del Día)', margin, currentY);
  currentY += 5;

  const arq = cierre.arqueo || {};
  const diferenciaTxt =
    arq.diferencia !== null && arq.diferencia !== undefined
      ? `$${formatearMonto(arq.diferencia)}${Math.abs(arq.diferencia) >= 1 ? ' ⚠ revisar' : ' ✓ cuadrado'}`
      : 'No reportado';
  const arqueoData = [
    ['Base inicial', `$${formatearMonto(arq.baseInicial || 0)}`],
    ['Total entradas', `$${formatearMonto(cierre.totalEntradas)}`],
    ['Total salidas', `$${formatearMonto(cierre.totalSalidas)}`],
    [
      'Saldo esperado en caja',
      `$${formatearMonto(arq.saldoEsperado ?? cierre.saldoNeto)}`,
    ],
    [
      'Efectivo contado (arqueo físico)',
      arq.saldoContado !== null && arq.saldoContado !== undefined
        ? `$${formatearMonto(arq.saldoContado)}`
        : 'No reportado',
    ],
    ['Diferencia', diferenciaTxt],
  ];

  doc.autoTable({
    startY: currentY,
    head: [['Concepto', 'Valor']],
    body: arqueoData,
    ...tableStyles,
  });
  currentY = doc.lastAutoTable.finalY + 8;

  // ==================== 5. RESUMEN POR MÉTODO DE PAGO ====================
  currentY = ensurePageBreak(doc, currentY, 38, pageHeight, margin);
  doc.setFontSize(11);
  doc.setTextColor(...colors.primary);
  doc.text('5. Resumen por Método de Pago', margin, currentY);
  currentY += 5;

  // Calcular totales por método de pago
  const efectivo =
    cierre.detalles?.cobros
      ?.filter((c) => c.metodoPago === 'efectivo' || !c.metodoPago)
      .reduce((acc, c) => acc + (c.monto || 0), 0) || 0;
  const transferencia =
    cierre.detalles?.cobros
      ?.filter((c) => c.metodoPago === 'transferencia')
      .reduce((acc, c) => acc + (c.monto || 0), 0) || 0;

  const metodosPagoData = [
    ['Efectivo', `$${formatearMonto(efectivo)}`],
    ['Transferencia', `$${formatearMonto(transferencia)}`],
  ];

  doc.autoTable({
    startY: currentY,
    head: [['Método', 'Valor Total']],
    body: metodosPagoData,
    ...tableStyles,
  });
  currentY = doc.lastAutoTable.finalY + 8;

  // ==================== 4. COBROS REALIZADOS ====================
  currentY = ensurePageBreak(doc, currentY, 38, pageHeight, margin);
  doc.setFontSize(11);
  doc.setTextColor(...colors.primary);
  doc.text('6. Cobros Realizados', margin, currentY);
  currentY += 5;

  if (cierre.detalles?.cobros?.length > 0) {
    const cobrosBody = cierre.detalles.cobros.map((c) => [
      formatearHoraPDF(c.fecha),
      c.clienteNombre || '—',
      `$${formatearMonto(c.monto)}`,
      c.metodoPago === 'transferencia' ? 'Transferencia' : 'Efectivo',
      c.estado || '—',
      c.cobradorNombre || '—',
    ]);

    doc.autoTable({
      startY: currentY,
      head: [['Hora', 'Cliente', 'Valor', 'Método', 'Estado', 'Cobrador']],
      body: cobrosBody,
      ...tableStyles,
    });
    currentY = doc.lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...colors.lightGray);
    doc.text(
      'No se registraron cobros durante este período.',
      margin,
      currentY,
    );
    currentY += 6;
  }

  // ==================== 5. MOVIMIENTOS DE CAJA ====================
  currentY = ensurePageBreak(doc, currentY, 38, pageHeight, margin);
  doc.setFontSize(11);
  doc.setTextColor(...colors.primary);
  doc.text('7. Movimientos de Caja', margin, currentY);
  currentY += 5;

  if (cierre.detalles?.caja?.length > 0) {
    const cajaBody = cierre.detalles.caja.map((m) => {
      const tipoLabel = getTipoMovimientoLabel(m.tipo);
      return [
        formatearHoraPDF(m.fecha),
        tipoLabel,
        m.nota || '—',
        `$${formatearMonto(m.monto)}`,
        m.cobradorNombre || '—',
      ];
    });

    doc.autoTable({
      startY: currentY,
      head: [['Hora', 'Tipo', 'Concepto', 'Valor', 'Usuario']],
      body: cajaBody,
      ...tableStyles,
    });
    currentY = doc.lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...colors.lightGray);
    doc.text(
      'No se registraron movimientos de caja durante este período.',
      margin,
      currentY,
    );
    currentY += 6;
  }

  // ==================== 6. CLIENTES EN MORA ====================
  currentY = ensurePageBreak(doc, currentY, 38, pageHeight, margin);
  doc.setFontSize(11);
  doc.setTextColor(...colors.primary);
  doc.text('8. Clientes en Mora', margin, currentY);
  currentY += 5;

  if (cierre.detalles?.mora?.length > 0) {
    const moraBody = cierre.detalles.mora.map((m) => [
      m.nombre,
      String(m.cuotasMora || 0),
      `$${formatearMonto(m.deficit || 0)}`,
    ]);

    doc.autoTable({
      startY: currentY,
      head: [['Cliente', 'Cuotas Vencidas', 'Saldo Pendiente']],
      body: moraBody,
      ...tableStyles,
    });
    currentY = doc.lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...colors.lightGray);
    doc.text('No existen clientes en mora.', margin, currentY);
    currentY += 6;
  }

  // ==================== 9. MORA POR ANTIGÜEDAD (AGING) ====================
  if (cierre.moraAging && cierre.moraAging.length > 0) {
    currentY = ensurePageBreak(doc, currentY, 38, pageHeight, margin);
    doc.setFontSize(11);
    doc.setTextColor(...colors.primary);
    doc.text('9. Mora por Antigüedad', margin, currentY);
    currentY += 5;

    const agingBody = cierre.moraAging.map((t) => [
      t.tramo,
      String(t.clientes),
      `$${formatearMonto(t.deficit)}`,
    ]);

    doc.autoTable({
      startY: currentY,
      head: [['Tramo de días', 'Clientes', 'Déficit']],
      body: agingBody,
      ...tableStyles,
    });
    currentY = doc.lastAutoTable.finalY + 8;
  }

  // ==================== 7. CRÉDITOS CREADOS ====================
  currentY = ensurePageBreak(doc, currentY, 38, pageHeight, margin);
  doc.setFontSize(11);
  doc.setTextColor(...colors.primary);
  doc.text('10. Créditos Creados Durante el Día', margin, currentY);
  currentY += 5;

  if (cierre.detalles?.nuevosCreditos?.length > 0) {
    const creditosBody = cierre.detalles.nuevosCreditos.map((c) => [
      c.cliente || '—',
      `$${formatearMonto(c.capital || 0)}`,
      `$${formatearMonto(c.total || 0)}`,
      String(c.cuotas || 0),
      c.frecuencia?.toUpperCase() || '—',
    ]);

    doc.autoTable({
      startY: currentY,
      head: [['Cliente', 'Capital', 'Total a Cobrar', 'Cuotas', 'Frecuencia']],
      body: creditosBody,
      ...tableStyles,
    });
    currentY = doc.lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...colors.lightGray);
    doc.text('No se registraron créditos nuevos.', margin, currentY);
    currentY += 6;
  }

  // ==================== 8. ESTADO GENERAL DE LA CARTERA ====================
  currentY = ensurePageBreak(doc, currentY, 38, pageHeight, margin);
  doc.setFontSize(11);
  doc.setTextColor(...colors.primary);
  doc.text('11. Estado General de la Cartera', margin, currentY);
  currentY += 5;

  const carteraData = [
    [
      'Capital colocado',
      `$${formatearMonto(cierre.cartera?.capitalColocado || 0)}`,
    ],
    [
      'Capital recuperado',
      `$${formatearMonto(cierre.cartera?.capitalRecuperado || 0)}`,
    ],
    [
      'Saldo pendiente',
      `$${formatearMonto(cierre.cartera?.saldoPendiente || 0)}`,
    ],
    ['Créditos activos', String(cierre.cartera?.creditosActivos || 0)],
    ['Créditos finalizados', String(cierre.cartera?.creditosFinalizados || 0)],
    ['Créditos vencidos', String(cierre.cartera?.creditosVencidos || 0)],
  ];

  doc.autoTable({
    startY: currentY,
    head: [['Concepto', 'Valor']],
    body: carteraData,
    ...tableStyles,
  });
  currentY = doc.lastAutoTable.finalY + 8;

  // ==================== 9. PENALIDADES APLICADAS ====================
  currentY = ensurePageBreak(doc, currentY, 38, pageHeight, margin);
  doc.setFontSize(11);
  doc.setTextColor(...colors.primary);
  doc.text('12. Penalidades Aplicadas', margin, currentY);
  currentY += 5;

  if (cierre.detalles?.recargos?.length > 0) {
    const recargosBody = cierre.detalles.recargos.map((r) => [
      r.clienteNombre || '—',
      formatearHoraPDF(r.fecha),
      r.nota || '—',
      `$${formatearMonto(r.monto || 0)}`,
      r.cobradorNombre || '—',
    ]);

    doc.autoTable({
      startY: currentY,
      head: [['Cliente', 'Fecha', 'Concepto', 'Monto', 'Usuario']],
      body: recargosBody,
      ...tableStyles,
    });
    currentY = doc.lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...colors.lightGray);
    doc.text(
      'No se aplicaron penalidades durante este período.',
      margin,
      currentY,
    );
    currentY += 6;
  }

  // ==================== 10. NUEVOS CLIENTES ====================
  currentY = ensurePageBreak(doc, currentY, 38, pageHeight, margin);
  doc.setFontSize(11);
  doc.setTextColor(...colors.primary);
  doc.text('13. Nuevos Clientes Registrados', margin, currentY);
  currentY += 5;

  if (cierre.detalles?.nuevosClientes?.length > 0) {
    const clientesBody = cierre.detalles.nuevosClientes.map((c) => [
      c.nombre || '—',
      c.telefono || '—',
    ]);

    doc.autoTable({
      startY: currentY,
      head: [['Nombre', 'Teléfono']],
      body: clientesBody,
      ...tableStyles,
    });
    currentY = doc.lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...colors.lightGray);
    doc.text('No se registraron nuevos clientes.', margin, currentY);
    currentY += 6;
  }

  // ==================== 11. OBSERVACIONES ====================
  currentY = ensurePageBreak(doc, currentY, 38, pageHeight, margin);
  currentY += 4;
  doc.setFontSize(11);
  doc.setTextColor(...colors.primary);
  doc.text('14. Observaciones', margin, currentY);
  currentY += 5;

  doc.setFontSize(9);
  doc.setTextColor(...colors.darkGray);

  const observaciones = [];
  if ((cierre.detalles?.recargos?.length || 0) > 0) {
    observaciones.push(
      `• Se aplicaron ${cierre.detalles.recargos.length} penalidad(es) por vencimiento.`,
    );
  }
  if ((cierre.detalles?.nuevosCreditos?.length || 0) > 0) {
    observaciones.push(
      `• Se registraron ${cierre.detalles.nuevosCreditos.length} nuevo(s) crédito(s).`,
    );
  }
  if ((cierre.detalles?.nuevosClientes?.length || 0) > 0) {
    observaciones.push(
      `• Se registraron ${cierre.detalles.nuevosClientes.length} nuevo(s) cliente(s).`,
    );
  }
  if ((cierre.detalles?.mora?.length || 0) > 0) {
    observaciones.push(
      `• Hay ${cierre.detalles.mora.length} cliente(s) en mora.`,
    );
  }

  if (observaciones.length === 0) {
    observaciones.push('Sin observaciones relevantes.');
  }

  observaciones.forEach((obs) => {
    doc.text(obs, margin + 2, currentY);
    currentY += 5;
  });

  // ==================== 15. FIRMAS DE RESPONSABILIDAD ====================
  currentY = ensurePageBreak(doc, currentY, 48, pageHeight, margin);
  currentY += 6;
  doc.setFontSize(11);
  doc.setTextColor(...colors.primary);
  doc.text('15. Firmas de Responsabilidad', margin, currentY);
  currentY += 16;

  const firmaWidth = (contentWidth - 20) / 2;
  const firmaY = currentY + 10;

  // Líneas de firma (cobrador izquierda, administrador derecha)
  doc.setDrawColor(...colors.darkGray);
  doc.setLineWidth(0.4);
  doc.line(margin, firmaY, margin + firmaWidth, firmaY);
  doc.line(margin + firmaWidth + 20, firmaY, pageWidth - margin, firmaY);

  doc.setFontSize(8);
  doc.setTextColor(...colors.lightGray);
  doc.text('Elaborado por (Cobrador)', margin, firmaY + 5);
  doc.text(
    'Revisado por (Administrador)',
    margin + firmaWidth + 20,
    firmaY + 5,
  );
  currentY = firmaY + 12;

  // ==================== PIE DE DOCUMENTO ====================
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...colors.lightGray);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.text(
      'CrediDev — Sistema de Gestión de Créditos y Cobros',
      margin,
      pageHeight - 8,
    );
    doc.text(
      `${timeStr} | Página ${i} de ${pageCount}`,
      pageWidth - margin - 40,
      pageHeight - 8,
    );
  }

  // Descargar
  const filename = `Cierre_${cierre.fecha}.pdf`;
  doc.save(filename);
}

/**
 * Formatea una hora para el PDF
 */
function formatearHoraPDF(fecha) {
  if (!fecha) return '—';
  const d = fecha?.toDate ? fecha.toDate() : new Date(fecha);
  try {
    return new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch (e) {
    return '—';
  }
}

/**
 * Obtiene etiqueta legible del tipo de movimiento
 */
function getTipoMovimientoLabel(tipo) {
  const labels = {
    gasto: 'Gasto',
    ingreso_base: 'Base Diaria',
    seguro: 'Seguro',
    recargo_vencimiento: 'Penalidad',
  };
  return labels[tipo] || tipo;
}

/**
 * Genera un PDF profesional de Cartera Global
 * Reporte gerencial con análisis estratégico de la cartera
 */
export function exportarCarteraGlobalPDF(datosCartera, nombreNegocio = '') {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = 15;

  // Estilos consistentes
  const colors = {
    primary: [31, 58, 95],
    darkGray: [50, 50, 50],
    lightGray: [120, 120, 120],
    border: [200, 200, 200],
  };

  const tableStyles = {
    theme: 'plain',
    margin: { left: margin, right: margin, top: 0, bottom: 16 },
    pageBreak: 'auto',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 3,
      textColor: colors.darkGray,
      lineColor: colors.border,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: colors.primary,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
  };

  // ==================== 1. ENCABEZADO ====================
  if (nombreNegocio) {
    doc.setFontSize(12);
    doc.setTextColor(...colors.lightGray);
    doc.text(nombreNegocio, margin, currentY);
    currentY += 6;
  }
  doc.setFontSize(18);
  doc.setTextColor(...colors.primary);
  doc.text('Reporte de Cartera Global', margin, currentY);
  currentY += 8;

  doc.setFontSize(10);
  doc.setTextColor(...colors.darkGray);
  doc.text(`Fecha de corte: ${datosCartera.fecha}`, margin, currentY);
  currentY += 5;

  const formatter = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'short',
    timeStyle: 'short',
  });
  let timeStr = '';
  try {
    timeStr = formatter.format(new Date());
  } catch (e) {
    timeStr = new Date().toLocaleString();
  }
  doc.text(`Generado: ${timeStr}`, margin, currentY);
  currentY += 7;

  doc.setDrawColor(...colors.border);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  // ==================== 2. RESUMEN GENERAL ====================
  currentY = ensurePageBreak(doc, currentY, 38, pageHeight, margin);
  doc.setFontSize(11);
  doc.setTextColor(...colors.primary);
  doc.text('2. Resumen General de la Cartera', margin, currentY);
  currentY += 5;

  const {
    totalCreditos,
    creditosActivos,
    creditosCompletados,
    creditosAnulados,
    capitalColocado,
    totalProyectado,
    totalRecuperado,
    saldoPendiente,
    porcentajeRecuperacion,
  } = datosCartera.resumenGeneral;

  const resumenData = [
    ['Total de créditos', String(totalCreditos)],
    ['Créditos activos', String(creditosActivos)],
    ['Créditos completados', String(creditosCompletados)],
    ['Créditos anulados', String(creditosAnulados)],
    ['Capital colocado', `$${formatearMonto(capitalColocado)}`],
    ['Total proyectado a cobrar', `$${formatearMonto(totalProyectado)}`],
    ['Total recuperado', `$${formatearMonto(totalRecuperado)}`],
    ['Saldo pendiente por recuperar', `$${formatearMonto(saldoPendiente)}`],
    ['Porcentaje de recuperación', `${porcentajeRecuperacion.toFixed(1)}%`],
  ];

  doc.autoTable({
    startY: currentY,
    head: [['Indicador', 'Valor']],
    body: resumenData,
    ...tableStyles,
  });
  currentY = doc.lastAutoTable.finalY + 8;

  // ==================== 3. ÍNDICE DE MORA (PAR) Y ANTIGÜEDAD ====================
  if (datosCartera.indiceMora) {
    currentY = ensurePageBreak(doc, currentY, 38, pageHeight, margin);
    doc.setFontSize(11);
    doc.setTextColor(...colors.primary);
    doc.text('3. Índice de Mora (Cartera en Riesgo)', margin, currentY);
    currentY += 5;

    const im = datosCartera.indiceMora;
    const parData = [
      ['Cartera activa total', `$${formatearMonto(im.carteraActiva || 0)}`],
      [
        'Cartera en riesgo (créditos con mora)',
        `$${formatearMonto(im.carteraEnRiesgo || 0)}`,
      ],
      ['Índice de mora — PAR', `${(im.porcentaje || 0).toFixed(1)}%`],
      ['Clientes en mora', String(im.clientesEnMora || 0)],
    ];

    doc.autoTable({
      startY: currentY,
      head: [['Indicador', 'Valor']],
      body: parData,
      ...tableStyles,
    });
    currentY = doc.lastAutoTable.finalY + 8;

    if (datosCartera.moraAging && datosCartera.moraAging.length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(...colors.primary);
      doc.text('Antigüedad de la mora', margin, currentY);
      currentY += 5;

      const agingBody = datosCartera.moraAging.map((t) => [
        t.tramo,
        String(t.clientes),
        `$${formatearMonto(t.deficit)}`,
      ]);

      doc.autoTable({
        startY: currentY,
        head: [['Tramo de días', 'Clientes', 'Déficit']],
        body: agingBody,
        ...tableStyles,
      });
      currentY = doc.lastAutoTable.finalY + 8;
    }
  }

  // ==================== 4. DISTRIBUCIÓN POR FRECUENCIA ====================
  currentY = ensurePageBreak(doc, currentY, 38, pageHeight, margin);
  doc.setFontSize(11);
  doc.setTextColor(...colors.primary);
  doc.text('4. Distribución por Frecuencia', margin, currentY);
  currentY += 5;

  const frecuenciaBody = Object.entries(
    datosCartera.distribucionFrecuencia,
  ).map(([freq, data]) => [
    freq.charAt(0).toUpperCase() + freq.slice(1),
    String(data.cantidad),
    `$${formatearMonto(data.capital)}`,
    `$${formatearMonto(data.saldo)}`,
    `$${formatearMonto(data.recuperado)}`,
  ]);

  doc.autoTable({
    startY: currentY,
    head: [
      ['Frecuencia', 'Cantidad', 'Capital', 'Saldo Pendiente', 'Recuperado'],
    ],
    body: frecuenciaBody,
    ...tableStyles,
  });
  currentY = doc.lastAutoTable.finalY + 8;

  // ==================== 4. DISTRIBUCIÓN POR ESTADO ====================
  currentY = ensurePageBreak(doc, currentY, 38, pageHeight, margin);
  doc.setFontSize(11);
  doc.setTextColor(...colors.primary);
  doc.text('5. Distribución por Estado', margin, currentY);
  currentY += 5;

  const estadoBody = [
    ['Activos', String(datosCartera.distribucionEstado.activos)],
    ['Completados', String(datosCartera.distribucionEstado.completados)],
    ['Anulados', String(datosCartera.distribucionEstado.anulados)],
  ];

  doc.autoTable({
    startY: currentY,
    head: [['Estado', 'Cantidad']],
    body: estadoBody,
    ...tableStyles,
  });
  currentY = doc.lastAutoTable.finalY + 8;

  // ==================== 5. TOP 10 CLIENTES CON MAYOR SALDO ====================
  currentY = ensurePageBreak(doc, currentY, 38, pageHeight, margin);
  doc.setFontSize(11);
  doc.setTextColor(...colors.primary);
  doc.text('6. Clientes con Mayor Saldo Pendiente', margin, currentY);
  currentY += 5;

  if (datosCartera.top10Clientes && datosCartera.top10Clientes.length > 0) {
    const top10Body = datosCartera.top10Clientes.map((c) => [
      c.nombre,
      String(c.cantidad),
      `$${formatearMonto(c.saldo)}`,
    ]);

    doc.autoTable({
      startY: currentY,
      head: [['Cliente', 'Créditos Activos', 'Saldo Pendiente']],
      body: top10Body,
      ...tableStyles,
    });
    currentY = doc.lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...colors.lightGray);
    doc.text('No hay datos disponibles.', margin, currentY);
    currentY += 6;
  }

  // ==================== 6. RESUMEN POR CLIENTE ====================
  currentY = ensurePageBreak(doc, currentY, 38, pageHeight, margin);
  doc.setFontSize(11);
  doc.setTextColor(...colors.primary);
  doc.text('7. Resumen Consolidado por Cliente', margin, currentY);
  currentY += 5;

  if (datosCartera.resumenClientes && datosCartera.resumenClientes.length > 0) {
    const resumenClientesBody = datosCartera.resumenClientes
      .sort((a, b) => b.saldoPendiente - a.saldoPendiente)
      .map((c) => [
        c.nombre,
        String(c.cantidad),
        `$${formatearMonto(c.capitalPrestado)}`,
        `$${formatearMonto(c.totalRecuperado)}`,
        `$${formatearMonto(c.saldoPendiente)}`,
      ]);

    doc.autoTable({
      startY: currentY,
      head: [
        [
          'Cliente',
          'Créditos',
          'Capital Prestado',
          'Total Recuperado',
          'Saldo Pendiente',
        ],
      ],
      body: resumenClientesBody,
      ...tableStyles,
    });
    currentY = doc.lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...colors.lightGray);
    doc.text('No hay datos disponibles.', margin, currentY);
    currentY += 6;
  }

  // ==================== 7. TABLA COMPLETA DE CRÉDITOS ====================
  currentY = ensurePageBreak(doc, currentY, 38, pageHeight, margin);
  doc.setFontSize(11);
  doc.setTextColor(...colors.primary);
  doc.text('8. Detalle Completo de Créditos', margin, currentY);
  currentY += 5;

  if (datosCartera.filas && datosCartera.filas.length > 0) {
    const creditosBody = datosCartera.filas.map((fila) => [
      fila.cliente,
      fila.credito,
      fila.frecuencia,
      `$${formatearMonto(fila.capital)}`,
      `$${formatearMonto(fila.totalPagar)}`,
      `$${formatearMonto(fila.pagado)}`,
      `$${formatearMonto(fila.saldo)}`,
      fila.estado,
    ]);

    doc.autoTable({
      startY: currentY,
      head: [
        [
          'Cliente',
          'Crédito',
          'Frecuencia',
          'Capital',
          'Total',
          'Pagado',
          'Saldo',
          'Estado',
        ],
      ],
      body: creditosBody,
      ...tableStyles,
    });
    currentY = doc.lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...colors.lightGray);
    doc.text('No hay créditos registrados.', margin, currentY);
    currentY += 6;
  }

  // ==================== 8. TOTALES ====================
  currentY = ensurePageBreak(doc, currentY, 28, pageHeight, margin);
  const sumCapital =
    datosCartera.filas?.reduce((acc, f) => acc + f.capital, 0) || 0;
  const sumTotal =
    datosCartera.filas?.reduce((acc, f) => acc + f.totalPagar, 0) || 0;
  const sumPagado =
    datosCartera.filas?.reduce((acc, f) => acc + f.pagado, 0) || 0;
  const sumSaldo =
    datosCartera.filas?.reduce((acc, f) => acc + f.saldo, 0) || 0;

  doc.setFontSize(10);
  doc.setTextColor(...colors.primary);
  doc.setFont(undefined, 'bold');
  doc.text('TOTALES DE CARTERA', margin, currentY);
  currentY += 5;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);

  const totalesData = [
    [
      `Total: ${datosCartera.filas?.length || 0} créditos`,
      '—',
      '—',
      `$${formatearMonto(sumCapital)}`,
      `$${formatearMonto(sumTotal)}`,
      `$${formatearMonto(sumPagado)}`,
      `$${formatearMonto(sumSaldo)}`,
      '—',
    ],
  ];

  doc.autoTable({
    startY: currentY,
    head: [
      [
        'Cliente',
        'Crédito',
        'Frecuencia',
        'Capital',
        'Total',
        'Pagado',
        'Saldo',
        'Estado',
      ],
    ],
    body: totalesData,
    ...tableStyles,
  });

  // ==================== PIE DE DOCUMENTO ====================
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...colors.lightGray);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.text(
      'CrediDev — Sistema de Gestión de Créditos y Cobros',
      margin,
      pageHeight - 8,
    );
    doc.text(
      `${timeStr} | Página ${i} de ${pageCount}`,
      pageWidth - margin - 40,
      pageHeight - 8,
    );
  }

  const filename = `Cartera_Global_${datosCartera.fecha}.pdf`;
  doc.save(filename);
}
