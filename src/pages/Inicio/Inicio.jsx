import { useNavigate } from "react-router-dom";
import MetricCard from "../../components/ui/MetricCard";
import { useClients } from "../../hooks/useClients";
import { useLoans } from "../../hooks/useLoans";
import { useMovements } from "../../hooks/useMovements";
import { calcularCuotasVencidas } from "../../logic/frecuencia";
import { calcularEstadoMora } from "../../logic/mora";
import { toDate } from "../../firebase/firestore";
import {
  IconUserPlus,
  IconFileText,
  IconChartBar,
  IconSettings,
  IconMapPin,
} from "@tabler/icons-react";

export default function Inicio() {
  const navigate = useNavigate();
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
  const saludo = hoy.getHours() < 12 ? "Buenos días" : hoy.getHours() < 18 ? "Buenas tardes" : "Buenas noches";

  const acciones = [
    { label: "Nuevo cliente", Icon: IconUserPlus, to: "/clientes/nuevo" },
    { label: "Nuevo crédito", Icon: IconFileText, to: "/creditos/nuevo" },
    { label: "Reportes", Icon: IconChartBar, to: "/reportes" },
    { label: "Configuración", Icon: IconSettings, to: "/configuracion" },
  ];

  return (
    <div className="p-4 pb-24 space-y-5">
      {/* Saludo */}
      <div>
        <h2 className="text-xl font-medium text-gray-800">{saludo}</h2>
        <p className="text-sm text-gray-400 font-normal capitalize">
          {hoy.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Cobrado hoy"
          value={`$${cobradoHoy.toLocaleString()}`}
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
          value={`$${saldo.toLocaleString()}`}
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

      {/* CTA Principal — único botón con fondo sólido */}
      <button
        onClick={() => navigate("/ruta")}
        className="w-full bg-primary-light hover:bg-primary-light/90 text-white font-medium rounded-xl py-4 flex items-center justify-center gap-2 transition"
      >
        <IconMapPin size={20} stroke={1.5} />
        Ir a la ruta de hoy
      </button>

      {/* Acciones rápidas — tarjetas planas con iconos outline */}
      <div className="grid grid-cols-2 gap-3">
        {acciones.map((a) => (
          <button
            key={a.to}
            onClick={() => navigate(a.to)}
            className="bg-white rounded-xl p-4 text-left border-thin hover:bg-surface-1 transition"
          >
            <a.Icon size={22} stroke={1.5} className="text-gray-500 mb-2" />
            <span className="text-sm font-medium text-gray-700 block">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

