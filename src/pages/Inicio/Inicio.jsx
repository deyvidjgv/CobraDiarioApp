import { useNavigate } from "react-router-dom";
import Header from "../../components/layout/Header";
import MetricCard from "../../components/ui/MetricCard";
import { useClients } from "../../hooks/useClients";
import { useLoans } from "../../hooks/useLoans";
import { useMovements } from "../../hooks/useMovements";
import { calcularCuotasVencidas } from "../../logic/frecuencia";
import { calcularEstadoMora } from "../../logic/mora";
import { formatearMonto } from "../../logic/formato";
import { getColombiaHour } from "../../logic/dateUtils";
import { toDate } from "../../firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import {
  IconUserPlus,
  IconFileText,
  IconMapPin,
  IconUsers,
  IconChartBar,
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
  // Hora de Colombia, no la del dispositivo: un celular con la zona
  // horaria mal puesta saludaba "buenas noches" a media mañana.
  const horaCol = getColombiaHour(hoy);
  const saludo = horaCol < 12 ? "Buenos días" : horaCol < 18 ? "Buenas tardes" : "Buenas noches";

  // El Admin no opera préstamos ni clientes: sus accesos rápidos son de
  // gestión y control (Plan Maestro, sección 5). Reportes/Configuración
  // (cobrador) y Correcciones/Auditoría (admin) ya viven en "Más" —
  // aquí solo lo que no está en ningún otro menú. Cobradiarios y Créditos
  // pasaron a ser pestañas de la barra inferior, así que ceden el puesto.
  const acciones = isAdmin
    ? [
        { label: "Clientes", Icon: IconUsers, to: "/clientes" },
        { label: "Desempeño", Icon: IconChartBar, to: "/desempeno" },
      ]
    : [
        { label: "Nuevo cliente", Icon: IconUserPlus, to: "/clientes/nuevo" },
        { label: "Nuevo crédito", Icon: IconFileText, to: "/creditos/nuevo" },
      ];

  return (
    <div className="pb-8">
      <Header title="Inicio" />
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Saludo */}
      <div>
        <h2 className="text-2xl font-semibold text-primary">{saludo}</h2>
        <p className="text-sm text-primary-light/70 font-normal capitalize mt-0.5">
          {hoy.toLocaleDateString("es-CO", {
            timeZone: "America/Bogota",
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {/* Métricas */}
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
        className="w-full bg-gold hover:bg-gold/90 text-surface-1 font-medium rounded-2xl py-4 px-6 flex items-center justify-center gap-2 transition shadow-md shadow-black/40 text-base"
      >
        {isAdmin ? <IconLayoutDashboard size={22} stroke={1.5} /> : <IconMapPin size={22} stroke={1.5} />}
        {isAdmin ? "Ver dashboard de la organización" : "Ir a la ruta de hoy"}
      </button>

      {/* Acciones rápidas */}
      <div>
        <h3 className="text-sm font-semibold text-primary-light/75 uppercase tracking-wider mb-3">Acciones rápidas</h3>
        <div className="grid grid-cols-2 gap-4">
          {acciones.map((a) => (
            <button
              key={a.to}
              onClick={() => navigate(a.to)}
              className="bg-surface rounded-2xl p-5 text-left border border-line hover:border-primary-light/40 hover:shadow-md transition flex flex-col items-start justify-between min-h-[100px]"
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


