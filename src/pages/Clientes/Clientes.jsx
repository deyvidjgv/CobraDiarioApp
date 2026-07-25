import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layout/Header";
import ClientRow from "../../components/ui/ClientRow";
import { useClients } from "../../hooks/useClients";
import { useLoans } from "../../hooks/useLoans";
import { calcularCuotasVencidas } from "../../logic/frecuencia";
import { calcularEstadoMora } from "../../logic/mora";
import { toDate } from "../../firebase/firestore";
import { IconUsersGroup, IconPlus } from "@tabler/icons-react";

export default function Clientes() {
  const navigate = useNavigate();
  const { clients, loading } = useClients();
  const { loans } = useLoans();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");

  // Calcular el estado de mora de cada cliente basado en sus créditos activos
  const clientsWithStatus = useMemo(() => {
    return clients.map((client) => {
      const clientLoans = loans.filter((l) => l.clientId === client.id);
      let worstStatus = "al_dia";

      for (const loan of clientLoans) {
        const cuotasVencidas = calcularCuotasVencidas({
          ...loan,
          fechaInicio: toDate(loan.fechaInicio),
        });
        const pagado = loan.montoTotalAPagar - (loan.saldoPendiente ?? 0);
        const mora = calcularEstadoMora(cuotasVencidas, loan.cuota, pagado);
        if (mora.estado === "mora") {
          worstStatus = "mora";
          break;
        }
      }

      return {
        ...client,
        status: clientLoans.length === 0 ? null : worstStatus,
        loanCount: clientLoans.length,
      };
    });
  }, [clients, loans]);

  const filtered = clientsWithStatus.filter((c) => {
    const matchesSearch =
      !search ||
      c.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      c.telefono?.includes(search);

    const matchesFilter =
      filter === "todos" ||
      (filter === "mora" && c.status === "mora") ||
      (filter === "al_dia" && c.status === "al_dia");

    return matchesSearch && matchesFilter;
  });

  const filters = [
    { key: "todos", label: "Todos" },
    { key: "mora", label: "En mora" },
    { key: "al_dia", label: "Al día" },
  ];

  return (
    <div className="pb-24">
      <Header title="Clientes" />

      <div className="p-4 space-y-4">
        {/* Buscador */}
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-[#E5E5EA] text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          />
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                filter === f.key
                  ? "bg-primary text-white"
                  : "bg-white text-gray-500 border border-[#E5E5EA] hover:border-gray-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Cargando clientes...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <IconUsersGroup size={48} stroke={1.5} className="text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">
              {search ? "Sin resultados" : "No hay clientes registrados"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((client) => (
              <ClientRow
                key={client.id}
                name={client.nombre}
                phone={client.telefono}
                status={client.status}
                subtitle={`${client.loanCount} crédito(s) · ${client.direccion || "Sin dirección"}`}
                ubicacion={client.ubicacion}
                onClick={() => navigate(`/clientes/${client.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate("/clientes/nuevo")}
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary-light text-white rounded-full flex items-center justify-center hover:scale-105 transition z-30"
        aria-label="Nuevo cliente"
      >
        <IconPlus size={28} stroke={2} />
      </button>
    </div>
  );
}
