import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layout/Header";
import ClientRow from "../../components/ui/ClientRow";
import { useClients } from "../../hooks/useClients";
import { useLoans } from "../../hooks/useLoans";
import { useVisits, RESULTADOS_VISITA } from "../../hooks/useVisits";
import { useAuth } from "../../context/AuthContext";
import { calcularMoraGlobal } from "../../logic/mora";
import { formatearMonto } from "../../logic/formato";
import { IconCheck, IconX, IconUserOff, IconCalendarHeart, IconSearch } from "@tabler/icons-react";

const accionesVisita = [
  { resultado: RESULTADOS_VISITA.NO_PAGO, label: "No pagó", Icon: IconX, clase: "text-red-500 hover:bg-red-50" },
  { resultado: RESULTADOS_VISITA.NO_ENCONTRADO, label: "No encontrado", Icon: IconUserOff, clase: "text-gray-500 hover:bg-gray-50" },
  { resultado: RESULTADOS_VISITA.PROMESA_PAGO, label: "Promesa", Icon: IconCalendarHeart, clase: "text-amber-600 hover:bg-amber-50" },
];

export default function RutaDelDia() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { clients } = useClients();
  const { loans, loading } = useLoans();
  const { visits, registrarVisita } = useVisits();
  const [visitando, setVisitando] = useState(null); // loanId con visita en curso
  const [filtro, setFiltro] = useState("general"); // general | mora | cobrados
  const [busqueda, setBusqueda] = useState("");

  // Visitas de hoy indexadas por loanId para marcar gestiones ya realizadas
  const visitasHoyPorLoan = useMemo(() => {
    return Object.fromEntries(visits.map((v) => [v.loanId, v]));
  }, [visits]);

  // Enriquecer cada crédito activo con su estado de mora y datos del cliente
  const rutaOrdenada = useMemo(() => {
    const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

    return loans
      .map((loan) => {
        const mora = calcularMoraGlobal(loan);
        const client = clientMap[loan.clientId] || {};

        return { ...loan, mora, client };
      })
      .sort((a, b) => {
        // mora primero, luego al_dia, luego adelantado
        const order = { mora: 0, al_dia: 1, adelantado: 2 };
        return (order[a.mora.estado] ?? 3) - (order[b.mora.estado] ?? 3);
      });
  }, [loans, clients]);

  // Créditos con cobro registrado hoy (visita resultado "cobro")
  const cobradosHoyIds = useMemo(
    () =>
      new Set(
        visits.filter((v) => v.resultado === RESULTADOS_VISITA.COBRO).map((v) => v.loanId)
      ),
    [visits]
  );

  // Lista según filtro activo + búsqueda por nombre, cédula o teléfono
  const rutaFiltrada = useMemo(() => {
    let lista = rutaOrdenada;
    if (filtro === "mora") lista = lista.filter((i) => i.mora.estado === "mora");
    else if (filtro === "cobrados") lista = lista.filter((i) => cobradosHoyIds.has(i.id));

    const q = busqueda.trim().toLowerCase();
    if (q) {
      lista = lista.filter((i) =>
        [i.client?.nombre, i.client?.cedula, i.client?.telefono].some((v) =>
          (v || "").toLowerCase().includes(q)
        )
      );
    }
    return lista;
  }, [rutaOrdenada, filtro, busqueda, cobradosHoyIds]);

  const chips = [
    { id: "general", label: "General", count: rutaOrdenada.length },
    { id: "mora", label: "En mora", count: rutaOrdenada.filter((i) => i.mora.estado === "mora").length },
    { id: "cobrados", label: "Cobrados hoy", count: rutaOrdenada.filter((i) => cobradosHoyIds.has(i.id)).length },
  ];

  async function handleRegistrarVisita(item, resultado) {
    setVisitando(item.id);
    try {
      await registrarVisita({
        clientId: item.clientId,
        loanId: item.id,
        resultado,
      });
    } catch (err) {
      alert("No se pudo registrar la visita: " + err.message);
    } finally {
      setVisitando(null);
    }
  }

  return (
    <div className="pb-24">
      <Header title="Ruta de hoy" />

      <div className="p-4 space-y-3">
        {/* Buscador: nombre, cédula o teléfono */}
        <div className="relative">
          <IconSearch
            size={18}
            stroke={1.5}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="search"
            inputMode="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, cédula o teléfono"
            className="w-full rounded-xl border border-[#E5E5EA] bg-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          />
        </div>

        {/* Filtros rápidos */}
        <div className="flex gap-2">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFiltro(chip.id)}
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition border ${
                filtro === chip.id
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-gray-500 border-[#E5E5EA] hover:border-primary-light/50"
              }`}
            >
              {chip.label}
              <span className={`ml-1.5 ${filtro === chip.id ? "text-white/70" : "text-gray-400"}`}>
                {chip.count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Cargando ruta...</p>
        ) : rutaOrdenada.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-4xl block mb-3">📋</span>
            <p className="text-gray-500 text-sm">No hay créditos activos todavía</p>
            {!isAdmin && (
              <button
                onClick={() => navigate("/creditos/nuevo")}
                className="mt-4 text-primary-light font-medium text-sm hover:underline"
              >
                Crear primer crédito →
              </button>
            )}
          </div>
        ) : rutaFiltrada.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl block mb-3">
              {filtro === "mora" ? "🎉" : filtro === "cobrados" ? "💸" : "🔍"}
            </span>
            <p className="text-gray-500 text-sm">
              {busqueda.trim()
                ? `Sin resultados para "${busqueda.trim()}"`
                : filtro === "mora"
                ? "No hay clientes en mora"
                : filtro === "cobrados"
                ? "Aún no hay cobros registrados hoy"
                : "Sin resultados"}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400">
              {rutaFiltrada.length} de {rutaOrdenada.length} créditos · {visits.length} visitas hoy
            </p>
            {rutaFiltrada.map((item) => {
              const visita = visitasHoyPorLoan[item.id];
              return (
                <div key={item.id} className="space-y-1">
                  <ClientRow
                    name={item.client.nombre || "Cliente"}
                    phone={item.client.telefono}
                    status={item.mora.estado}
                    subtitle={
                      item.mora.estado === "mora"
                        ? `Debe ${item.mora.cuotasMora} cuotas — $${formatearMonto(item.mora.deficit)}`
                        : `Cuota: $${formatearMonto(Math.min(item.cuota, item.saldoPendiente ?? item.cuota))}`
                    }
                    ubicacion={item.client.ubicacion}
                    onClick={() => navigate(`/cobro/${item.id}`)}
                  />
                  {visita ? (
                    <p className="flex items-center gap-1 text-[11px] text-gray-400 pl-2">
                      <IconCheck size={12} stroke={2.5} className="text-emerald-500" />
                      {visita.resultado === RESULTADOS_VISITA.COBRO
                        ? "Cobro registrado hoy"
                        : `Visitado hoy (${visita.resultado.replace("_", " ")})`}
                    </p>
                  ) : (
                    <div className="flex gap-1 pl-1">
                      {accionesVisita.map(({ resultado, label, Icon, clase }) => (
                        <button
                          key={resultado}
                          type="button"
                          disabled={visitando === item.id}
                          onClick={() => handleRegistrarVisita(item, resultado)}
                          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition disabled:opacity-50 ${clase}`}
                        >
                          <Icon size={13} stroke={2} />
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
