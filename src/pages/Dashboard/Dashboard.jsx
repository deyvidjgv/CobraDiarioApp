import { useEffect, useMemo, useState } from "react";
import { where, orderBy } from "firebase/firestore";
import Header from "../../components/layout/Header";
import { useLoans } from "../../hooks/useLoans";
import { useClients } from "../../hooks/useClients";
import { useCobradiarios } from "../../hooks/useCobradiarios";
import { subscribeToCollection } from "../../firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { calcularMoraGlobal } from "../../logic/mora";
import { esCreditoVencido } from "../../logic/vencimiento";
import { TIPOS_MOVIMIENTO } from "../../logic/caja";
import { formatearMonto } from "../../logic/formato";
import { getColombiaDateKey } from "../../logic/dateUtils";
import {
  IconCoins,
  IconWallet,
  IconCash,
  IconCalendarMonth,
  IconAlertOctagon,
  IconUsersGroup,
  IconUsers,
  IconFileText,
  IconTrendingUp,
} from "@tabler/icons-react";

function KpiCard({ label, valor, Icon, tono = "primary" }) {
  const tonos = {
    primary: "bg-primary-bg text-primary",
    emerald: "bg-al-dia/10 text-al-dia",
    red: "bg-mora/10 text-mora",
    amber: "bg-gold/10 text-gold",
    blue: "bg-adelanto/10 text-adelanto",
  };
  return (
    <div className="bg-surface rounded-xl p-4 border border-line flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${tonos[tono]} flex items-center justify-center shrink-0`}>
        <Icon size={20} stroke={1.5} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-primary-light/70 uppercase tracking-wide">{label}</p>
        <p className="text-lg font-semibold text-primary truncate">{valor}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { orgId } = useAuth();
  const { loans, loading: loansLoading } = useLoans(false);
  const { clients, loading: clientsLoading } = useClients();
  const { cobradiarios, loading: usersLoading } = useCobradiarios();
  const [cobrosMes, setCobrosMes] = useState([]);
  const hoyKey = getColombiaDateKey();

  // Cobros del mes en curso (para "cobrado hoy" y "cobrado este mes")
  useEffect(() => {
    if (!orgId) return;
    const [y, m] = hoyKey.split("-").map(Number);
    const inicioMes = new Date(y, m - 1, 1);
    const unsub = subscribeToCollection(
      orgId,
      "movements",
      [
        where("tipo", "==", TIPOS_MOVIMIENTO.COBRO),
        where("fecha", ">=", inicioMes),
        orderBy("fecha", "desc"),
      ],
      (docs) => setCobrosMes(docs)
    );
    return unsub;
  }, [orgId, hoyKey]);

  const kpis = useMemo(() => {
    const activos = loans.filter((l) => l.estado === "activo");
    const dineroColocado = loans.reduce((acc, l) => acc + (l.capital ?? 0), 0);
    const carteraPendiente = activos.reduce((acc, l) => acc + (l.saldoPendiente ?? 0), 0);

    const hoyStr = hoyKey;
    const cobradoHoy = cobrosMes
      .filter((mov) => getColombiaDateKey(new Date(mov.fecha?.toDate ? mov.fecha.toDate() : new Date(mov.fecha))) === hoyStr)
      .reduce((acc, m) => acc + (m.monto ?? 0), 0);
    const cobradoMes = cobrosMes.reduce((acc, m) => acc + (m.monto ?? 0), 0);

    const vencidos = activos.filter((l) => esCreditoVencido(l));
    const carteraVencida = vencidos.reduce((acc, l) => acc + (l.saldoPendiente ?? 0), 0);

    const enMora = activos.filter((l) => calcularMoraGlobal(l).estado === "mora");
    const moraTotal = enMora.reduce((acc, l) => acc + calcularMoraGlobal(l).deficit, 0);

    return {
      dineroColocado,
      carteraPendiente,
      cobradoHoy,
      cobradoMes,
      carteraVencida,
      creditosVencidos: vencidos.length,
      moraTotal,
      creditosEnMora: enMora.length,
      cobradiariosActivos: cobradiarios.filter((c) => c.estado === "activo").length,
      clientes: clients.length,
      creditosActivos: activos.length,
    };
  }, [loans, clients, cobradiarios, cobrosMes, hoyKey]);

  const loading = loansLoading || clientsLoading || usersLoading;

  return (
    <div className="pb-24">
      <Header title="Dashboard" />

      <div className="p-4 space-y-4">
        {loading ? (
          <p className="text-sm text-primary-light/70 py-10 text-center">Cargando indicadores...</p>
        ) : (
          <>
            {/* Dinero */}
            <section className="grid grid-cols-2 gap-3">
              <KpiCard label="Dinero colocado" valor={`$${formatearMonto(kpis.dineroColocado)}`} Icon={IconCoins} />
              <KpiCard label="Cartera pendiente" valor={`$${formatearMonto(kpis.carteraPendiente)}`} Icon={IconWallet} tono="blue" />
              <KpiCard label="Cobrado hoy" valor={`$${formatearMonto(kpis.cobradoHoy)}`} Icon={IconCash} tono="emerald" />
              <KpiCard label="Cobrado este mes" valor={`$${formatearMonto(kpis.cobradoMes)}`} Icon={IconCalendarMonth} tono="emerald" />
            </section>

            {/* Riesgo */}
            <section className="grid grid-cols-2 gap-3">
              <KpiCard label="Cartera vencida" valor={`$${formatearMonto(kpis.carteraVencida)}`} Icon={IconAlertOctagon} tono="red" />
              <KpiCard label="Déficit de mora" valor={`$${formatearMonto(kpis.moraTotal)}`} Icon={IconTrendingUp} tono="amber" />
            </section>

            {/* Operación */}
            <section className="grid grid-cols-2 gap-3">
              <KpiCard label="Cobradiarios activos" valor={String(kpis.cobradiariosActivos)} Icon={IconUsersGroup} />
              <KpiCard label="Clientes" valor={String(kpis.clientes)} Icon={IconUsers} tono="blue" />
              <KpiCard label="Créditos activos" valor={String(kpis.creditosActivos)} Icon={IconFileText} tono="blue" />
              <KpiCard label="Créditos en mora" valor={String(kpis.creditosEnMora)} Icon={IconAlertOctagon} tono="red" />
            </section>

            {(kpis.creditosVencidos > 0 || kpis.creditosEnMora > 0) && (
              <div className="rounded-xl bg-gold/10 border border-gold/30 p-4 text-sm text-gold">
                <p className="font-medium">Atención</p>
                <p className="mt-1">
                  {kpis.creditosVencidos} créditos vencidos y {kpis.creditosEnMora} en mora
                  requieren gestión de cobro.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

