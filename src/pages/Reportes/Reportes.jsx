import { useState, useEffect, useMemo } from "react";
import Header from "../../components/layout/Header";
import { useClients } from "../../hooks/useClients";
import { useLoans } from "../../hooks/useLoans";
import { useMovements } from "../../hooks/useMovements";
import { calcularMoraGlobal } from "../../logic/mora";
import { toDate, getDocument, setDocument } from "../../firebase/firestore";
import { exportarPDF, exportarCierreDiarioPDF, exportarCarteraGlobalPDF } from "../../logic/pdfExport";
import { getColombiaDateKey } from "../../logic/dateUtils";
import { construirCierreDiario } from "../../logic/caja";
import { formatearMonto } from "../../logic/formato";
import { useAuth } from "../../context/AuthContext";
import {
  IconCheck,
  IconFileTypePdf,
  IconRefresh,
  IconDownload,
  IconChartPie,
} from "@tabler/icons-react";

export default function Reportes() {
  const { orgId } = useAuth();
  const [selectedDate, setSelectedDate] = useState(getColombiaDateKey());
  const [cierreGuardado, setCierreGuardado] = useState(null);
  const [loadingCierre, setLoadingCierre] = useState(true);
  const [generating, setGenerating] = useState(false);

  const { clients } = useClients();
  const { loans } = useLoans(false); 
  const { movements, saldo } = useMovements(selectedDate);

  // Cargar si ya existe un cierre para esa fecha
  useEffect(() => {
    if (!orgId) return;
    setLoadingCierre(true);
    getDocument(orgId, "daily_closings", selectedDate).then((doc) => {
      setCierreGuardado(doc);
      setLoadingCierre(false);
    });
  }, [orgId, selectedDate]);

  const clientMap = useMemo(() => {
    return Object.fromEntries(clients.map((c) => [c.id, c]));
  }, [clients]);

  // Ranking de mora (general)
  const rankingMora = useMemo(() => {
    return loans
      .filter((l) => l.estado === "activo")
      .map((loan) => {
        const mora = calcularMoraGlobal(loan);
        return { loan, mora, client: clientMap[loan.clientId] || {} };
      })
      .filter((item) => item.mora.estado === "mora")
      .sort((a, b) => b.mora.deficit - a.mora.deficit);
  }, [loans, clientMap]);

  // Totales
  const totalPrestado = loans.reduce((acc, l) => acc + (l.capital || 0), 0);
  const totalPorCobrar = loans
    .filter((l) => l.estado === "activo")
    .reduce((acc, l) => acc + (l.saldoPendiente || 0), 0);
  const cobradoFecha = movements
    .filter((m) => m.tipo === "cobro")
    .reduce((acc, m) => acc + m.monto, 0);

  // Enriquecer movimientos de cobro para el cierre y para el historial visible
  const movimientosEnriquecidos = useMemo(() => {
    return movements.map((m) => {
      if (m.tipo !== "cobro") return m;

      const loan = loans.find((l) => l.id === m.referencia);
      const client = loan ? clientMap[loan.clientId] : null;
      const nombreCliente = m.clienteNombre || client?.nombre || null;
      let estadoStr = "";

      if (loan) {
        const mora = calcularMoraGlobal(loan);
        const estadoLabels = { mora: "En mora", al_dia: "Al día", adelantado: "Adelanto", completado: "Completado" };
        estadoStr = estadoLabels[mora.estado] || mora.estado;
      }

      return {
        ...m,
        clienteNombre: nombreCliente,
        nota: nombreCliente ? `Cobro: ${nombreCliente}` : (m.nota || "Cobro crédito"),
        estado: estadoStr,
      };
    });
  }, [movements, loans, clientMap]);



  function formatearHora(fecha) {
    if (!fecha) return "";
    const d = fecha?.toDate ? fecha.toDate() : new Date(fecha);
    return new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit" }).format(d);
  }

  async function handleGenerarCierre() {
    if (!confirm(`¿Generar reporte definitivo para el ${selectedDate}?`)) return;
    setGenerating(true);
    try {
      const nuevosClientes = clients.filter((c) => {
        return getColombiaDateKey(toDate(c.createdAt)) === selectedDate;
      });
      const nuevosCreditos = loans.filter((l) => {
        return getColombiaDateKey(toDate(l.createdAt)) === selectedDate;
      });
      const listaMora = rankingMora.map(item => ({
        nombre: item.client.nombre || "—",
        cuotasMora: item.mora.cuotasMora,
        deficit: item.mora.deficit
      }));

      // Calcular datos de cartera
      const datosCartera = {
        capitalColocado: loans.reduce((acc, l) => acc + (l.capital || 0), 0),
        capitalRecuperado: movements
          .filter((m) => m.tipo === "cobro")
          .reduce((acc, m) => acc + m.monto, 0),
        saldoPendiente: loans
          .filter((l) => l.estado === "activo")
          .reduce((acc, l) => acc + (l.saldoPendiente || 0), 0),
        creditosActivos: loans.filter((l) => l.estado === "activo").length,
        creditosFinalizados: loans.filter((l) => l.estado === "completado").length,
        creditosVencidos: rankingMora.length,
      };

      // Enriquecer nuevosCreditos con nombre del cliente
      const nuevosCreditosEnriquecidos = nuevosCreditos.map((l) => ({
        ...l,
        clienteNombre: clientMap[l.clientId]?.nombre || "—",
      }));

      const cierreObj = construirCierreDiario(
        movimientosEnriquecidos,
        nuevosClientes,
        nuevosCreditosEnriquecidos,
        listaMora,
        selectedDate,
        datosCartera
      );

      await setDocument(orgId, "daily_closings", selectedDate, cierreObj);
      setCierreGuardado(cierreObj);
      alert("Cierre generado exitosamente.");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setGenerating(false);
    }
  }

  function handleDescargarCierre() {
    if (!cierreGuardado) return;
    exportarCierreDiarioPDF(cierreGuardado);
  }

  function exportarCartera() {
    // Calcular todos los datos necesarios para el reporte gerencial
    const totalCreditos = loans.length;
    const creditosActivos = loans.filter((l) => l.estado === "activo").length;
    const creditosCompletados = loans.filter((l) => l.estado === "completado").length;
    const creditosAnulados = loans.filter((l) => l.estado === "anulado").length;

    // Totales financieros
    const capitalColocado = loans.reduce((acc, l) => acc + (l.capital || 0), 0);
    const totalProyectado = loans.reduce((acc, l) => acc + (l.montoTotalAPagar || 0), 0);
    const totalRecuperado = loans.reduce((acc, l) => {
      const pagado = (l.montoTotalAPagar || 0) - (l.saldoPendiente ?? 0);
      return acc + pagado;
    }, 0);
    const saldoPendiente = loans.reduce((acc, l) => acc + (l.saldoPendiente || 0), 0);
    const porcentajeRecuperacion = capitalColocado > 0 ? (totalRecuperado / capitalColocado) * 100 : 0;

    // Distribución por frecuencia
    const distribucionFrecuencia = {};
    loans.forEach((l) => {
      const freq = l.frecuencia || "Sin definir";
      if (!distribucionFrecuencia[freq]) {
        distribucionFrecuencia[freq] = {
          cantidad: 0,
          capital: 0,
          saldo: 0,
          recuperado: 0,
        };
      }
      distribucionFrecuencia[freq].cantidad++;
      distribucionFrecuencia[freq].capital += l.capital || 0;
      distribucionFrecuencia[freq].saldo += l.saldoPendiente || 0;
      const pagado = (l.montoTotalAPagar || 0) - (l.saldoPendiente ?? 0);
      distribucionFrecuencia[freq].recuperado += pagado;
    });

    // Distribución por estado
    const distribucionEstado = {
      activos: creditosActivos,
      completados: creditosCompletados,
      anulados: creditosAnulados,
    };

    // Top 10 clientes con mayor saldo pendiente
    const clientesSaldo = {};
    loans.forEach((l) => {
      const clientId = l.clientId;
      if (!clientesSaldo[clientId]) {
        clientesSaldo[clientId] = {
          nombre: clientMap[clientId]?.nombre || "—",
          cantidad: 0,
          saldo: 0,
        };
      }
      clientesSaldo[clientId].cantidad++;
      clientesSaldo[clientId].saldo += l.saldoPendiente || 0;
    });

    const top10Clientes = Object.values(clientesSaldo)
      .sort((a, b) => b.saldo - a.saldo)
      .slice(0, 10);

    // Resumen por cliente (consolidado)
    const resumenClientes = Object.entries(clientesSaldo).map(([clientId, data]) => {
      const clientLoans = loans.filter((l) => l.clientId === clientId);
      const capitalPrestado = clientLoans.reduce((acc, l) => acc + (l.capital || 0), 0);
      const totalRecuperadoCliente = clientLoans.reduce((acc, l) => {
        const pagado = (l.montoTotalAPagar || 0) - (l.saldoPendiente ?? 0);
        return acc + pagado;
      }, 0);

      return {
        nombre: data.nombre,
        cantidad: data.cantidad,
        capitalPrestado,
        totalRecuperado: totalRecuperadoCliente,
        saldoPendiente: data.saldo,
      };
    });

    // Enriquecer tabla de créditos con datos necesarios
    const clientLoanCounts = {};
    const filas = loans.map((l) => {
      const clientId = l.clientId;
      clientLoanCounts[clientId] = (clientLoanCounts[clientId] || 0) + 1;
      const numCredito = `#${clientLoanCounts[clientId]}`;

      const pagado = (l.montoTotalAPagar || 0) - (l.saldoPendiente ?? 0);
      const clienteNombre = clientMap[l.clientId]?.nombre || "—";

      return {
        cliente: clienteNombre,
        credito: numCredito,
        frecuencia: l.frecuencia ? l.frecuencia.toUpperCase() : "—",
        capital: l.capital || 0,
        totalPagar: l.montoTotalAPagar || 0,
        pagado,
        saldo: l.saldoPendiente || 0,
        estado: l.estado === "activo" ? "Activo" : l.estado === "completado" ? "Completado" : "Anulado",
      };
    });

    // Llamar la nueva función mejorada
    exportarCarteraGlobalPDF({
      fecha: getColombiaDateKey(),
      resumenGeneral: {
        totalCreditos,
        creditosActivos,
        creditosCompletados,
        creditosAnulados,
        capitalColocado,
        totalProyectado,
        totalRecuperado,
        saldoPendiente,
        porcentajeRecuperacion,
      },
      distribucionFrecuencia,
      distribucionEstado,
      top10Clientes,
      resumenClientes,
      filas,
    });
  }


  return (
    <div className="pb-24">
      <Header title="Reportes y Cierres" />

      <div className="p-4 space-y-5">
        {/* Selector de fecha */}
        <div className="bg-white rounded-xl p-4 border-thin">
          <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Fecha de Cierre</label>
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          />
        </div>

        {/* Resumen Global (Arriba) */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Resumen Global</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-4 border-thin">
              <p className="text-xs text-gray-400">Total prestado</p>
              <p className="text-lg font-medium text-primary mt-1" translate="no">${formatearMonto(totalPrestado)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border-thin">
              <p className="text-xs text-gray-400">Por cobrar</p>
              <p className="text-lg font-medium text-red-600 mt-1" translate="no">${formatearMonto(totalPorCobrar)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border-thin">
              <p className="text-xs text-gray-400">Cobrado ({selectedDate})</p>
              <p className="text-lg font-medium text-emerald-600 mt-1" translate="no">${formatearMonto(cobradoFecha)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border-thin">
              <p className="text-xs text-gray-400">Saldo caja ({selectedDate})</p>
              <p className="text-lg font-medium text-primary mt-1" translate="no">${formatearMonto(saldo)}</p>
            </div>
          </div>
        </div>

        {/* Cierre diario */}
        <div className="bg-white rounded-xl p-4 border-thin">
          <h3 className="text-sm font-medium text-primary mb-3">Reporte Diario ({selectedDate})</h3>
          
          {loadingCierre ? (
            <p className="text-sm text-gray-400">Cargando estado...</p>
          ) : cierreGuardado ? (
            <div className="space-y-3">
              <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm border-thin border-emerald-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <IconCheck size={18} stroke={2} />
                  <span>Guardado</span>
                </div>
                <span className="font-medium" translate="no">Saldo: ${formatearMonto(cierreGuardado.saldoNeto)}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDescargarCierre}
                  className="flex-1 bg-surface-1 border-thin text-primary font-medium rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-surface-2 transition"
                >
                  <IconFileTypePdf size={20} stroke={1.5} />
                  Descargar PDF
                </button>
                <button
                  onClick={handleGenerarCierre}
                  disabled={generating}
                  className="bg-surface-1 border-thin text-gray-600 font-medium rounded-xl px-4 py-3 hover:bg-surface-2 transition disabled:opacity-50"
                  title="Volver a generar reporte para capturar cambios recientes"
                >
                  <IconRefresh size={20} stroke={1.5} />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border-thin border-amber-100">
                Aún no has generado el reporte de este día.
              </p>
              <button
                onClick={handleGenerarCierre}
                disabled={generating}
                className="w-full bg-primary text-white font-medium rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-primary-light transition disabled:opacity-50"
              >
                <IconDownload size={20} stroke={1.5} />
                {generating ? "Guardando..." : "Generar y Guardar Reporte"}
              </button>
            </div>
          )}
        </div>

        {/* Exportar cartera */}
        <button
          onClick={exportarCartera}
          className="w-full bg-white border-thin text-primary font-medium rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-surface-1 transition"
        >
          <IconChartPie size={20} stroke={1.5} />
          Exportar cartera global (PDF)
        </button>
      </div>
    </div>
  );
}
