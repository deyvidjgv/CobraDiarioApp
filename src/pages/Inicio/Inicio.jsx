import { useNavigate } from "react-router-dom";
import Header from "../../components/layout/Header";
import MetricCard from "../../components/ui/MetricCard";
import { useClients } from "../../hooks/useClients";
import { useLoans } from "../../hooks/useLoans";
import { useMovements } from "../../hooks/useMovements";
import { calcularCuotasVencidas } from "../../logic/frecuencia";
import { calcularEstadoMora } from "../../logic/mora";
import { formatearMonto } from "../../logic/formato";
import { toDate } from "../../firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import {
  IconUserPlus,
  IconFileText,
  IconChartBar,
  IconSettings,
  IconMapPin,
  IconUserCog,
  IconClipboardCheck,
  IconHistory,
  IconLayoutDashboard,
} from "@tabler/icons-react";

export default function Inicio() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { clients } = useClients();
  const { loans } = useLoans();
  const { saldo, movements } = useMovements();

  // Cobrado hoy = suma de movimientos tipo cobro de hoy
  const cobradoHoy = movements
    .filter((m) => m.tipo === "cobro")
    .reduce((acc, m) => acc + m.monto, 0);

  // Clientes en mora
  const enMora = loans.filter((loan) => {
    const cuotasVencidas = calcularCuotasVencidas({
      ...loan,
      fechaInicio: toDate(loan.fechaInicio),
    });
    const pagadoAcumulado = loan.montoTotalAPagar - (loan.saldoPendiente ?? 0);
    const estado = calcularEstadoMora(cuotasVencidas, loan.cuota, pagadoAcumulado);
    return estado.estado === "mora";
  });

  const hoy = new Date();
  const saludo = hoy.getHours() < 12 ? "Buenos dÃ­as" : hoy.getHours() < 18 ? "Buenas tardes" : "Buenas noches";

  // El Admin no opera prÃ©stamos ni clientes: sus accesos rÃ¡pidos son de
  // gestiÃ³n y control (Plan Maestro, secciÃ³n 5).
  const acciones = isAdmin
    ? [
        { label: "Dashboard", Icon: IconLayoutDashboard, to: "/dashboard" },
        { label: "Cobradiarios", Icon: IconUserCog, to: "/cobradiarios" },
        { label: "Correcciones", Icon: IconClipboardCheck, to: "/correcciones" },
        { label: "AuditorÃ­a", Icon: IconHistory, to: "/auditoria" },
      ]
    : [
        { label: "Nuevo cliente", Icon: IconUserPlus, to: "/clientes/nuevo" },
        { label: "Nuevo crÃ©dito", Icon: IconFileText, to: "/creditos/nuevo" },
        { label: "Reportes", Icon: IconChartBar, to: "/reportes" },
        { label: "ConfiguraciÃ³n", Icon: IconSettings, to: "/configuracion" },
      ];

  return (
    <div className="pb-8">
      <Header title="Inicio" />
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Saludo */}
      <div>
        <h2 className="text-2xl font-semibold text-primary">{saludo}</h2>
        <p className="text-sm text-primary-light/70 font-normal capitalize mt-0.5">
          {hoy.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* MÃ©tricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          label="Cobrado hoy"
          value={`$${formatearMonto(cobradoHoy)}`}
          color="green"
        />
        <MetricCard
          label="En mora"
          value={enMora.length}
          color="red"
          onClick={() => navigate("/clientes")}
        />
        <MetricCard
          label="Saldo caja"
          value={`$${formatearMonto(saldo)}`}
          color="primary"
          onClick={() => navigate("/caja")}
        />
        <MetricCard
          label="Clientes activos"
          value={clients.length}
          color="blue"
          onClick={() => navigate("/clientes")}
        />
      </div>

      {/* CTA Principal */}
      <button
        onClick={() => navigate(isAdmin ? "/dashboard" : "/ruta")}
        className="w-full bg-primary-light hover:bg-primary-light/90 text-white font-medium rounded-2xl py-4 px-6 flex items-center justify-center gap-2 transition shadow-md shadow-primary-light/20 text-base"
      >
        {isAdmin ? <IconLayoutDashboard size={22} stroke={1.5} /> : <IconMapPin size={22} stroke={1.5} />}
        {isAdmin ? "Ver dashboard de la organizaciÃ³n" : "Ir a la ruta de hoy"}
      </button>

      {/* Acciones rÃ¡pidas */}
      <div>
        <h3 className="text-sm font-semibold text-primary-light/75 uppercase tracking-wider mb-3">Acciones rÃ¡pidas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {acciones.map((a) => (
            <button
              key={a.to}
              onClick={() => navigate(a.to)}
              className="bg-white rounded-2xl p-5 text-left border border-[#E3DFD8] hover:border-primary-light/40 hover:shadow-md transition flex flex-col items-start justify-between min-h-[100px]"
            >
              <a.Icon size={26} stroke={1.5} className="text-primary-light mb-3" />
              <span className="text-sm font-semibold text-primary block">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}


