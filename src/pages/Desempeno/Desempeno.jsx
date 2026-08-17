import { useMemo } from "react";
import Header from "../../components/layout/Header";
import { useLoans } from "../../hooks/useLoans";
import { useClients } from "../../hooks/useClients";
import { useCobradiarios } from "../../hooks/useCobradiarios";
import { useMovements } from "../../hooks/useMovements";
import { calcularMoraGlobal } from "../../logic/mora";
import { TIPOS_MOVIMIENTO } from "../../logic/caja";
import { formatearMonto, round2 } from "../../logic/formato";
import { IconChartBar } from "@tabler/icons-react";

/**
 * Rendimiento por cobradiario (Plan Maestro, secciÃ³n 14).
 * FÃ³rmula base: efectividad = (cobrado / esperado) Ã— 100
 */
export default function Desempeno() {
  const { cobradiarios, loading: usersLoading } = useCobradiarios();
  const { loans, loading: loansLoading } = useLoans(false);
  const { clients, loading: clientsLoading } = useClients();
  const { movements, loading: movsLoading } = useMovements(); // movimientos de hoy

  const loading = usersLoading || loansLoading || clientsLoading || movsLoading;

  const filas = useMemo(() => {
    const cobrosHoy = movements.filter((m) => m.tipo === TIPOS_MOVIMIENTO.COBRO);

    return cobradiarios.map((cob) => {
      const uid = cob.uid;
      const misClientes = clients.filter((c) => c.cobradiarioId === uid);
      const misLoans = loans.filter((l) => l.cobradiarioId === uid);
      const activos = misLoans.filter((l) => l.estado === "activo");

      // Valor esperado hoy: una cuota por crÃ©dito activo
      const esperado = round2(
        activos.reduce((acc, l) => acc + Math.min(l.cuota ?? 0, l.saldoPendiente ?? l.cuota ?? 0), 0)
      );

      // Valor cobrado hoy por este cobradiario
      const cobrado = round2(
        cobrosHoy.filter((m) => m.cobradiarioId === uid).reduce((acc, m) => acc + (m.monto ?? 0), 0)
      );

      const efectividad = esperado > 0 ? round2((cobrado / esperado) * 100) : null;

      const enMora = activos.filter((l) => calcularMoraGlobal(l).estado === "mora");
      const moraTotal = round2(enMora.reduce((acc, l) => acc + calcularMoraGlobal(l).deficit, 0));

      return {
        uid,
        nombre: cob.nombre || cob.email || uid,
        estado: cob.estado,
        clientes: misClientes.length,
        creditosActivos: activos.length,
        creditosNuevos: misLoans.filter((l) => {
          const creado = l.createdAt?.toDate ? l.createdAt.toDate() : null;
          if (!creado) return false;
          const hoy = new Date();
          return creado.toDateString() === hoy.toDateString();
        }).length,
        esperado,
        cobrado,
        efectividad,
        creditosEnMora: enMora.length,
        moraTotal,
      };
    });
  }, [cobradiarios, clients, loans, movements]);

  return (
    <div className="pb-24">
      <Header title="DesempeÃ±o" />

      <div className="p-4 space-y-4">
        <p className="text-xs text-primary-light/70">
          Efectividad de hoy = (cobrado / esperado) Ã— 100. El valor esperado es una cuota por
          crÃ©dito activo.
        </p>

        {loading ? (
          <p className="text-sm text-primary-light/70 py-10 text-center">Cargando desempeÃ±o...</p>
        ) : filas.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <IconChartBar size={48} stroke={1.5} className="text-primary-light/50 mb-3" />
            <p className="text-primary-light/75 text-sm">No hay cobradiarios registrados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filas.map((f) => (
              <div key={f.uid} className="bg-white rounded-xl border border-[#E3DFD8] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-primary">{f.nombre}</p>
                  {f.efectividad !== null ? (
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        f.efectividad >= 80
                          ? "bg-emerald-50 text-al-dia"
                          : f.efectividad >= 50
                          ? "bg-amber-50 text-gold"
                          : "bg-mora/10 text-mora"
                      }`}
                    >
                      {f.efectividad}% efectividad
                    </span>
                  ) : (
                    <span className="text-[11px] text-primary-light/70 px-2 py-1 rounded-full bg-surface-2">
                      Sin cartera
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-primary-light/70">Clientes</span>
                    <span className="text-primary font-medium">{f.clientes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-primary-light/70">CrÃ©ditos activos</span>
                    <span className="text-primary font-medium">{f.creditosActivos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-primary-light/70">Esperado hoy</span>
                    <span className="text-primary font-medium">${formatearMonto(f.esperado)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-primary-light/70">Cobrado hoy</span>
                    <span className="text-al-dia font-medium">${formatearMonto(f.cobrado)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-primary-light/70">CrÃ©ditos nuevos hoy</span>
                    <span className="text-primary font-medium">{f.creditosNuevos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-primary-light/70">En mora</span>
                    <span className={f.creditosEnMora > 0 ? "text-mora font-medium" : "text-primary font-medium"}>
                      {f.creditosEnMora} Â· ${formatearMonto(f.moraTotal)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

