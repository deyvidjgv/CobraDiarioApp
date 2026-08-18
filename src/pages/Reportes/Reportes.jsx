import { useState, useEffect, useMemo } from "react";
import Header from "../../components/layout/Header";
import { useClients } from "../../hooks/useClients";
import { useLoans } from "../../hooks/useLoans";
import { useMovements } from "../../hooks/useMovements";
import { calcularMoraGlobal } from "../../logic/mora";
import { toDate, getDocument, setDocument, getSettings } from "../../firebase/firestore";
import { exportarCierreDiarioPDF, exportarCarteraGlobalPDF } from "../../logic/pdfExport";
import { exportarCarteraExcel, exportarCierreExcel } from "../../logic/excelExport";
import { getColombiaDateKey } from "../../logic/dateUtils";
import { construirCierreDiario } from "../../logic/caja";
import { formatearMonto, round2 } from "../../logic/formato";
import { useAuth } from "../../context/AuthContext";
import {
  IconCheck,
  IconFileTypePdf,
  IconFileSpreadsheet,
  IconRefresh,
  IconDownload,
  IconChartPie,
} from "@tabler/icons-react";

export default function Reportes() {
  const { orgId, usuario } = useAuth();
  const [selectedDate, setSelectedDate] = useState(getColombiaDateKey());
  const [cierreGuardado, setCierreGuardado] = useState(null);
  const [loadingCierre, setLoadingCierre] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saldoContado, setSaldoContado] = useState("");
  const [nombreNegocio, setNombreNegocio] = useState("");

  const { clients } = useClients();
  const { loans } = useLoans(false); 
  const { movements, saldo } = useMovements(selectedDate);

  // El cierre es POR PERSONA, no por organización. Antes el id era solo la
  // fecha: dos cobradores del mismo día se pisaban el cierre entre ellos
  // (y con merge:true se mezclaban en silencio), y encima las reglas solo
  // dejaban escribirlo al Admin, así que a un cobrador le salía "no tienes
  // permiso" al generarlo. Cada quien cierra lo suyo.
  const cierreId = usuario ? `${selectedDate}_${usuario.uid}` : null;

  // Cargar si ya existe un cierre para esa fecha
  useEffect(() => {
    if (!orgId || !cierreId) return;
    setLoadingCierre(true);
    getDocument(orgId, "daily_closings", cierreId).then((doc) => {
      setCierreGuardado(doc);
      setLoadingCierre(false);
    });
  }, [orgId, cierreId]);

  // Nombre del negocio para los encabezados de los reportes
  useEffect(() => {
    if (!orgId) return;
    getSettings(orgId).then((s) => setNombreNegocio(s?.nombreNegocio || ""));
  }, [orgId]);

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

  // Esperado del día: una cuota por crédito activo (tope al saldo)
  const esperadoHoy = loans
    .filter((l) => l.estado === "activo")
    .reduce((acc, l) => acc + Math.min(l.cuota || 0, l.saldoPendiente ?? (l.cuota ?? 0)), 0);
  const noCobradoHoy = Math.max(0, esperadoHoy - cobradoFecha);
  const efectividadDia = esperadoHoy > 0 ? round2((cobradoFecha / esperadoHoy) * 100) : null;

  // Mora por antigüedad (aging): aproxima días de mora según frecuencia
  const DIAS_POR_CUOTA = { diario: 1, semanal: 7, quincenal: 15, mensual: 30 };
  const tramosAging = useMemo(() => {
    const tramos = [
      { tramo: "1-15 días", min: 1, max: 15, clientes: 0, deficit: 0 },
      { tramo: "16-30 días", min: 16, max: 30, clientes: 0, deficit: 0 },
      { tramo: "31-60 días", min: 31, max: 60, clientes: 0, deficit: 0 },
      { tramo: "Más de 60 días", min: 61, max: Infinity, clientes: 0, deficit: 0 },
    ];
    rankingMora.forEach(({ loan, mora }) => {
      const dias = Math.round((mora.cuotasMora || 0) * (DIAS_POR_CUOTA[loan.frecuencia] || 1));
      const tramo = tramos.find((t) => dias >= t.min && dias <= t.max);
      if (tramo) {
        tramo.clientes++;
        tramo.deficit += mora.deficit || 0;
      }
    });
    return tramos.filter((t) => t.clientes > 0);
  }, [rankingMora]);

  // Índice de mora (PAR): saldo de créditos con mora / cartera activa
  const indiceMora = useMemo(() => {
    const carteraEnRiesgo = rankingMora.reduce(
      (acc, item) => acc + (item.loan.saldoPendiente || 0),
      0
    );
    return {
      carteraActiva: totalPorCobrar,
      carteraEnRiesgo,
      porcentaje: totalPorCobrar > 0 ? round2((carteraEnRiesgo / totalPorCobrar) * 100) : 0,
      clientesEnMora: rankingMora.length,
    };
  }, [rankingMora, totalPorCobrar]);

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
        // Efectividad, arqueo y aging para el reporte
        efectividad: {
          esperadoHoy,
          cobradoHoy: cobradoFecha,
          noCobrado: noCobradoHoy,
          porcentaje: efectividadDia,
        },
        saldoContado: saldoContado !== "" ? Number(saldoContado) || 0 : null,
        moraAging: tramosAging,
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

      // cobradiarioId es lo que usan las reglas (ownsRecord) para dejar que
      // cada quien lea y escriba únicamente su propio cierre.
      const cierreConDueno = { ...cierreObj, cobradiarioId: usuario.uid };
      await setDocument(orgId, "daily_closings", cierreId, cierreConDueno);
      setCierreGuardado(cierreConDueno);
      alert("Cierre generado exitosamente.");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setGenerating(false);
    }
  }

  function handleDescargarCierre() {
    if (!cierreGuardado) return;
    exportarCierreDiarioPDF(cierreGuardado, nombreNegocio);
  }

  function handleDescargarCierreExcel() {
    if (!cierreGuardado) return;
    exportarCierreExcel(cierreGuardado, nombreNegocio);
  }

  function exportarCartera(formato = "pdf") {
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
    const datos = {
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
      indiceMora,
      moraAging: tramosAging,
      distribucionFrecuencia,
      distribucionEstado,
      top10Clientes,
      resumenClientes,
      filas,
    };

    if (formato === "excel") {
      exportarCarteraExcel(datos, nombreNegocio);
    } else {
      exportarCarteraGlobalPDF(datos, nombreNegocio);
    }
  }


  return (
    <div className="pb-24">
      <Header title="Reportes y Cierres" />

      <div className="p-4 space-y-5">
        {/* Selector de fecha */}
        <div className="card p-4">
          <label className="section-title mb-2">Fecha de cierre</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full rounded-xl border border-line px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          />
        </div>

        {/* Resumen Global */}
        <div>
          <h3 className="section-title mb-3">Resumen del día</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4">
              <p className="text-xs text-primary-light/70">Esperado hoy</p>
              <p className="text-lg font-semibold text-primary mt-1" translate="no">${formatearMonto(esperadoHoy)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-primary-light/70">Cobrado ({selectedDate})</p>
              <p className="text-lg font-semibold text-al-dia mt-1" translate="no">${formatearMonto(cobradoFecha)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-primary-light/70">Efectividad</p>
              <p className={`text-lg font-semibold mt-1 ${efectividadDia >= 80 ? "text-al-dia" : efectividadDia >= 50 ? "text-gold" : "text-mora"}`}>
                {efectividadDia !== null ? `${efectividadDia.toFixed(1)}%` : "—"}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-primary-light/70">Saldo caja</p>
              <p className="text-lg font-semibold text-primary mt-1" translate="no">${formatearMonto(saldo)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-primary-light/70">Total prestado</p>
              <p className="text-lg font-semibold text-primary mt-1" translate="no">${formatearMonto(totalPrestado)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-primary-light/70">Por cobrar (cartera)</p>
              <p className="text-lg font-semibold text-mora mt-1" translate="no">${formatearMonto(totalPorCobrar)}</p>
            </div>
          </div>
        </div>

        {/* Índice de mora + aging */}
        <div className="card p-4 space-y-3">
          <h3 className="section-title">Índice de mora (PAR)</h3>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-primary-light/75">Cartera en riesgo</span>
            <span className="font-semibold text-primary" translate="no">
              ${formatearMonto(indiceMora.carteraEnRiesgo)} / ${formatearMonto(indiceMora.carteraActiva)}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-surface-2 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all ${indiceMora.porcentaje <= 10 ? "bg-al-dia" : indiceMora.porcentaje <= 25 ? "bg-gold" : "bg-mora/100"}`}
              style={{ width: `${Math.min(100, indiceMora.porcentaje)}%` }}
            />
          </div>
          <p className="text-xs text-primary-light/70">
            {indiceMora.porcentaje.toFixed(1)}% de la cartera activa está en riesgo ·{" "}
            {indiceMora.clientesEnMora} cliente(s) en mora
          </p>
          {tramosAging.length > 0 && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {tramosAging.map((t) => (
                <div key={t.tramo} className="rounded-xl bg-surface-1 px-3 py-2">
                  <p className="text-[11px] text-primary-light/70">{t.tramo}</p>
                  <p className="text-sm font-medium text-primary">
                    {t.clientes} · ${formatearMonto(t.deficit)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cierre diario */}
        <div className="card p-4 space-y-3">
          <h3 className="section-title">Reporte diario ({selectedDate})</h3>

          {/* Arqueo de caja */}
          <div className="rounded-xl bg-surface-1 p-3 space-y-2">
            <p className="text-xs font-medium text-primary-light">
              Arqueo de caja — efectivo contado (opcional)
            </p>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="Conteo físico del efectivo ($)"
              value={saldoContado}
              onChange={(e) => setSaldoContado(e.target.value)}
              className="w-full rounded-xl border border-line px-4 py-2.5 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
            />
            {saldoContado !== "" && (
              <p className={`text-xs ${Math.abs(Number(saldoContado) - saldo) < 1 ? "text-al-dia" : "text-gold"}`}>
                Esperado ${formatearMonto(saldo)} ·{" "}
                {Math.abs(Number(saldoContado) - saldo) < 1
                  ? "cuadrado ✓"
                  : `diferencia ${formatearMonto(Number(saldoContado) - saldo)}`}
              </p>
            )}
          </div>

          {loadingCierre ? (
            <p className="text-sm text-primary-light/70">Cargando estado...</p>
          ) : cierreGuardado ? (
            <div className="space-y-3">
              <div className="bg-al-dia/10 text-al-dia p-3 rounded-lg text-sm border-thin border-al-dia/25 flex justify-between items-center">
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
                  onClick={handleDescargarCierreExcel}
                  title="Excel para trabajar los números (el PDF con firmas es el comprobante)"
                  className="bg-surface-1 border-thin text-al-dia font-medium rounded-xl px-4 py-3 hover:bg-surface-2 transition"
                >
                  <IconFileSpreadsheet size={20} stroke={1.5} />
                </button>
                <button
                  onClick={handleGenerarCierre}
                  disabled={generating}
                  className="bg-surface-1 border-thin text-primary-light font-medium rounded-xl px-4 py-3 hover:bg-surface-2 transition disabled:opacity-50"
                  title="Volver a generar reporte para capturar cambios recientes"
                >
                  <IconRefresh size={20} stroke={1.5} />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gold bg-gold/10 p-3 rounded-lg border-thin border-gold/25">
                Aún no has generado el reporte de este día.
              </p>
              <button
                onClick={handleGenerarCierre}
                disabled={generating}
                className="w-full bg-gold text-surface-1 font-medium rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-gold/90 transition disabled:opacity-50"
              >
                <IconDownload size={20} stroke={1.5} />
                {generating ? "Guardando..." : "Generar y Guardar Reporte"}
              </button>
            </div>
          )}
        </div>

        {/* Exportar cartera */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => exportarCartera("pdf")}
            className="w-full bg-surface border-thin text-primary font-medium rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-surface-1 transition shadow-[0_1px_3px_rgba(38,33,92,0.05)]"
          >
            <IconChartPie size={20} stroke={1.5} />
            Cartera en PDF
          </button>
          <button
            onClick={() => exportarCartera("excel")}
            className="w-full bg-surface border-thin text-al-dia font-medium rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-surface-1 transition shadow-[0_1px_3px_rgba(38,33,92,0.05)]"
          >
            <IconFileSpreadsheet size={20} stroke={1.5} />
            Cartera en Excel
          </button>
        </div>
      </div>
    </div>
  );
}

