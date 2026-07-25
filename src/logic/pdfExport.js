import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

/**
 * Genera y descarga un PDF con tabla de datos.
 *
 * @param {string} titulo - titulo del reporte
 * @param {string[]} columnas - encabezados de columna
 * @param {Array<string[]>} filas - filas de datos
 * @param {string} [subtitulo] - linea de contexto (ej. rango de fechas)
 */
export function exportarPDF(titulo, columnas, filas, subtitulo = "") {
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
    theme: "grid",
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
      `Generado por Cobro Diario — ${new Date().toLocaleDateString()}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  const filename = `${titulo.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}

/**
 * Genera un PDF de cierre diario estilo factura/ticket (blanco y negro).
 */
export function exportarCierreDiarioPDF(cierre) {
  const doc = new jsPDF();
  
  // Estilos base (factura B/N)
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0); // negro
  doc.text(`Reporte de Cierre Diario`, 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Fecha: ${cierre.fecha}`, 14, 28);
  
  // Hora local robusta (Colombia)
  const formatter = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "medium",
    timeStyle: "short"
  });
  let timeStr = "";
  try {
    timeStr = formatter.format(new Date());
  } catch(e) {
    timeStr = new Date().toLocaleString(); // Fallback
  }
  
  doc.text(`Generado: ${timeStr}`, 14, 34);

  // Configuración de tablas B/N
  const tableStyles = {
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 2, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold" },
  };

  let currentY = 40;

  // 1. Resumen de Caja
  doc.setFontSize(12);
  doc.text("1. Resumen de Caja", 14, currentY);
  doc.autoTable({
    startY: currentY + 4,
    head: [["Concepto", "Monto"]],
    body: [
      ["Total Entradas", `$${cierre.totalEntradas.toLocaleString()}`],
      ["Total Salidas", `$${cierre.totalSalidas.toLocaleString()}`],
      ["Saldo Neto", `$${cierre.saldoNeto.toLocaleString()}`],
    ],
    ...tableStyles
  });
  currentY = doc.lastAutoTable.finalY + 10;

  // 2. Cobros del Día
  doc.text("2. Cobros Realizados", 14, currentY);
  const cobrosBody = cierre.detalles?.cobros?.length > 0 
    ? cierre.detalles.cobros.map(c => [c.nota || "Cobro crédito", `$${c.monto.toLocaleString()}`, c.estado])
    : [["No hubo cobros", "", ""]];
  doc.autoTable({
    startY: currentY + 4,
    head: [["Descripción", "Monto", "Estado"]],
    body: cobrosBody,
    ...tableStyles
  });
  currentY = doc.lastAutoTable.finalY + 10;

  // 3. Gastos e Ingresos Base
  doc.text("3. Movimientos de Caja (Gastos / Base)", 14, currentY);
  const cajaBody = cierre.detalles?.caja?.length > 0
    ? cierre.detalles.caja.map(m => [m.tipo === "gasto" ? "Gasto" : "Base", m.nota || "-", `$${m.monto.toLocaleString()}`])
    : [["No hubo movimientos", "", ""]];
  doc.autoTable({
    startY: currentY + 4,
    head: [["Tipo", "Descripción", "Monto"]],
    body: cajaBody,
    ...tableStyles
  });
  currentY = doc.lastAutoTable.finalY + 10;

  // 4. Clientes en Mora
  doc.text("4. Clientes en Mora", 14, currentY);
  const moraBody = cierre.detalles?.mora?.length > 0
    ? cierre.detalles.mora.map(m => [m.nombre, String(m.cuotasMora), `$${m.deficit.toLocaleString()}`])
    : [["Sin clientes en mora", "", ""]];
  doc.autoTable({
    startY: currentY + 4,
    head: [["Cliente", "Cuotas Atrasadas", "Déficit"]],
    body: moraBody,
    ...tableStyles
  });
  currentY = doc.lastAutoTable.finalY + 10;

  // 5. Nuevos Registros
  doc.text("5. Nuevos Registros del Día", 14, currentY);
  const nuevosBody = [];
  if (cierre.detalles?.nuevosClientes?.length > 0) {
    cierre.detalles.nuevosClientes.forEach(c => nuevosBody.push(["Cliente Nuevo", c.nombre, c.telefono]));
  }
  if (cierre.detalles?.nuevosCreditos?.length > 0) {
    cierre.detalles.nuevosCreditos.forEach(c => nuevosBody.push(["Crédito Nuevo", `Capital: $${c.capital.toLocaleString()}`, `Total: $${c.total.toLocaleString()}`]));
  }
  if (nuevosBody.length === 0) nuevosBody.push(["Sin registros nuevos", "", ""]);
  
  doc.autoTable({
    startY: currentY + 4,
    head: [["Tipo", "Detalle 1", "Detalle 2"]],
    body: nuevosBody,
    ...tableStyles
  });

  const filename = `Cierre_${cierre.fecha}.pdf`;
  doc.save(filename);
}
