import { useState, useEffect, useMemo } from "react";
import Header from "../../components/layout/Header";
import { useClients } from "../../hooks/useClients";
import { useLoans } from "../../hooks/useLoans";
import { useMovements } from "../../hooks/useMovements";
import { calcularCuotasVencidas } from "../../logic/frecuencia";
import { calcularEstadoMora } from "../../logic/mora";
import { toDate, getDocument, setDocument } from "../../firebase/firestore";
import { exportarPDF, exportarCierreDiarioPDF } from "../../logic/pdfExport";
import { getColombiaDateKey } from "../../logic/dateUtils";
import { construirCierreDiario } from "../../logic/caja";
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

  // Ranking de mora (general)
  const rankingMora = useMemo(() => {
    const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

    return loans
      .filter((l) => l.estado === "activo")
      .map((loan) => {
        const cuotasVencidas = calcularCuotasVencidas({
          ...loan,
          fechaInicio: toDate(loan.fechaInicio),
        });
        const pagado = loan.montoTotalAPagar - (loan.saldoPendiente ?? 0);
        const mora = calcularEstadoMora(cuotasVencidas, loan.cuota, pagado);
        return { loan, mora, client: clientMap[loan.clientId] || {} };
      })
      .filter((item) => item.mora.estado === "mora")
      .sort((a, b) => b.mora.deficit - a.mora.deficit);
  }, [loans, clients]);

  // Totales
  const totalPrestado = loans.reduce((acc, l) => acc + (l.capital || 0), 0);
  const totalPorCobrar = loans
    .filter((l) => l.estado === "activo")
    .reduce((acc, l) => acc + (l.saldoPendiente || 0), 0);
  const cobradoFecha = movements
    .filter((m) => m.tipo === "cobro")
    .reduce((acc, m) => acc + m.monto, 0);

  // Enriquecer movimientos de cobro para el cierre
  const movimientosEnriquecidos = useMemo(() => {
    const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));
    return movements.map((m) => {
      if (m.tipo !== "cobro") return m;
      
      const loan = loans.find((l) => l.id === m.referencia);
      const client = loan ? clientMap[loan.clientId] : null;
      let estadoStr = "";
      
      if (loan) {
        const cuotasVencidas = calcularCuotasVencidas({
          ...loan,
          fechaInicio: toDate(loan.fechaInicio),
        });
        const pagado = loan.montoTotalAPagar - (loan.saldoPendiente ?? 0);
        const mora = calcularEstadoMora(cuotasVencidas, loan.cuota, pagado);
        const estadoLabels = { mora: "En mora", al_dia: "Al día", adelantado: "Adelanto", completado: "Completado" };
        estadoStr = estadoLabels[mora.estado] || mora.estado;
      }
      
      return {
        ...m,
        nota: client ? `Cobro: ${client.nombre}` : (m.nota || "Cobro crédito"),
        estado: estadoStr
      };
    });
  }, [movements, loans, clients]);

  async function handleGenerarCierre() {
    if (!confirm(`¿Generar reporte definitivo para el ${selectedDate}?`)) return;
    setGenerating(true);
    try {
      // Filtrar nuevos de ese día
      const nuevosClientes = clients.filter((c) => {
        const d = toDate(c.createdAt);
        return d && d.toISOString().startsWith(selectedDate);
      });
      const nuevosCreditos = loans.filter((l) => {
        const d = toDate(l.fechaInicio); // Usamos fecha de inicio como referencia
        return d && d.toISOString().startsWith(selectedDate);
      });
      const listaMora = rankingMora.map(item => ({
        nombre: item.client.nombre || "—",
        cuotasMora: item.mora.cuotasMora,
        deficit: item.mora.deficit
      }));

      const cierreObj = construirCierreDiario(
        movimientosEnriquecidos,
        nuevosClientes,
        nuevosCreditos,
        listaMora,
        selectedDate
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
    const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));
    const columnas = ["Cliente", "Capital", "Total", "Pagado", "Saldo", "Estado"];
    const filas = loans.map((l) => {
      const pagado = l.montoTotalAPagar - (l.saldoPendiente ?? 0);
      return [
        clientMap[l.clientId]?.nombre || "—",
        `$${(l.capital || 0).toLocaleString()}`,
        `$${(l.montoTotalAPagar || 0).toLocaleString()}`,
        `$${pagado.toLocaleString()}`,
        `$${(l.saldoPendiente || 0).toLocaleString()}`,
        l.estado,
      ];
    });
    exportarPDF("Reporte_de_Cartera", columnas, filas, `Fecha: ${getColombiaDateKey()}`);
  }

  const formatMoney = (val) => {
    if (val === undefined || val === null) return "$0";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(val);
  };

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
                <span className="font-medium" translate="no">Saldo: {formatMoney(cierreGuardado.saldoNeto)}</span>
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

        {/* Resumen Global */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Resumen Global</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-4 border-thin">
              <p className="text-xs text-gray-400">Total prestado</p>
              <p className="text-lg font-medium text-primary mt-1" translate="no">{formatMoney(totalPrestado)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border-thin">
              <p className="text-xs text-gray-400">Por cobrar</p>
              <p className="text-lg font-medium text-red-600 mt-1" translate="no">{formatMoney(totalPorCobrar)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border-thin">
              <p className="text-xs text-gray-400">Cobrado ({selectedDate})</p>
              <p className="text-lg font-medium text-emerald-600 mt-1" translate="no">{formatMoney(cobradoFecha)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border-thin">
              <p className="text-xs text-gray-400">Saldo caja ({selectedDate})</p>
              <p className="text-lg font-medium text-primary mt-1" translate="no">{formatMoney(saldo)}</p>
            </div>
          </div>
        </div>

        {/* Exportar cartera */}
        <button
          onClick={exportarCartera}
          className="w-full bg-white border-thin text-primary font-medium rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-surface-1 transition"
        >
          <IconChartPie size={20} stroke={1.5} />
          Exportar cartera global
        </button>
      </div>
    </div>
  );
}

