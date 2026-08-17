import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layout/Header";
import ClientRow from "../../components/ui/ClientRow";
import { useClients } from "../../hooks/useClients";
import { useLoans } from "../../hooks/useLoans";
import { useVisits, RESULTADOS_VISITA } from "../../hooks/useVisits";
import { useAuth } from "../../context/AuthContext";
import { calcularMoraGlobal, calcularMoraGlobalAlCierre } from "../../logic/mora";
import { esDiaDeCobro } from "../../logic/frecuencia";
import { formatearMonto } from "../../logic/formato";
import { IconCheck, IconX, IconUserOff, IconCalendarHeart, IconSearch } from "@tabler/icons-react";

const accionesVisita = [
  { resultado: RESULTADOS_VISITA.NO_PAGO, label: "No pagÃ³", Icon: IconX, clase: "text-mora hover:bg-mora/10" },
  { resultado: RESULTADOS_VISITA.NO_ENCONTRADO, label: "No encontrado", Icon: IconUserOff, clase: "text-primary-light/75 hover:bg-surface-1" },
  { resultado: RESULTADOS_VISITA.PROMESA_PAGO, label: "Promesa", Icon: IconCalendarHeart, clase: "text-gold hover:bg-amber-50" },
];

// Prioridad de visita: 1Âº mora, 2Âº cuota de hoy pendiente, 3Âº al dÃ­a, 4Âº adelantado
function prioridadDe(item) {
  if (item.mora.estado === "mora") return 0;
  if (item.faltaCobrarHoy) return 1;
  if (item.mora.estado === "al_dia") return 2;
  return 3;
}

export default function RutaDelDia() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { clients } = useClients();
  const { loans, loading } = useLoans();
  const { visits, registrarVisita } = useVisits();
  const [visitando, setVisitando] = useState(null); // loanId con visita en curso
  const [filtro, setFiltro] = useState("hoy"); // hoy | mora | cobrados | general
  const [busqueda, setBusqueda] = useState("");

  // Visitas de hoy indexadas por loanId para marcar gestiones ya realizadas
  const visitasHoyPorLoan = useMemo(() => {
    return Object.fromEntries(visits.map((v) => [v.loanId, v]));
  }, [visits]);

  // Enriquecer cada crÃ©dito con mora, cuota programada hoy y datos del cliente
  const rutaOrdenada = useMemo(() => {
    const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

    return loans
      .map((loan) => {
        const mora = calcularMoraGlobal(loan);
        // Deficit al cierre de hoy: incluye la cuota de hoy en lo esperado,
        // asÃ­ un adelanto que ya la cubre no genera visita innecesaria.
        const alCierre = calcularMoraGlobalAlCierre(loan);
        const programadoHoy = esDiaDeCobro(loan);
        const faltaCobrarHoy = programadoHoy && alCierre.deficit > 0;
        const client = clientMap[loan.clientId] || {};

        return { ...loan, mora, programadoHoy, faltaCobrarHoy, client };
      })
      .sort((a, b) => {
        const prioridad = prioridadDe(a) - prioridadDe(b);
        if (prioridad !== 0) return prioridad;
        // A igual prioridad, la mora mÃ¡s grande primero y luego por nombre
        if (a.mora.deficit !== b.mora.deficit) return b.mora.deficit - a.mora.deficit;
        return (a.client.nombre || "").localeCompare(b.client.nombre || "");
      });
  }, [loans, clients]);

  // CrÃ©ditos con cobro registrado hoy (visita resultado "cobro")
  const cobradosHoyIds = useMemo(
    () =>
      new Set(
        visits.filter((v) => v.resultado === RESULTADOS_VISITA.COBRO).map((v) => v.loanId)
      ),
    [visits]
  );

  // Lista segÃºn filtro activo + bÃºsqueda por nombre, cÃ©dula o telÃ©fono
  const rutaFiltrada = useMemo(() => {
    let lista = rutaOrdenada;
    if (filtro === "hoy") {
      // Ruta principal: cuota programada hoy, sin contar los ya cobrados
      lista = lista.filter((i) => i.faltaCobrarHoy && !cobradosHoyIds.has(i.id));
    } else if (filtro === "mora") {
      lista = lista.filter((i) => i.mora.estado === "mora");
    } else if (filtro === "cobrados") {
      lista = lista.filter((i) => cobradosHoyIds.has(i.id));
    }

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
    {
      id: "hoy",
      label: "Cobro hoy",
      count: rutaOrdenada.filter((i) => i.faltaCobrarHoy && !cobradosHoyIds.has(i.id)).length,
    },
    { id: "mora", label: "Mora", count: rutaOrdenada.filter((i) => i.mora.estado === "mora").length },
    { id: "cobrados", label: "Cobrados", count: rutaOrdenada.filter((i) => cobradosHoyIds.has(i.id)).length },
    { id: "general", label: "General", count: rutaOrdenada.length },
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
        {/* Buscador: nombre, cÃ©dula o telÃ©fono */}
        <div className="relative">
          <IconSearch
            size={18}
            stroke={1.5}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-light/70 pointer-events-none"
          />
          <input
            type="search"
            inputMode="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, cÃ©dula o telÃ©fono"
            className="w-full rounded-xl border border-[#E3DFD8] bg-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          />
        </div>

        {/* Filtros rÃ¡pidos */}
        <div className="flex gap-2">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFiltro(chip.id)}
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition border ${
                filtro === chip.id
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-primary-light/75 border-[#E3DFD8] hover:border-primary-light/50"
              }`}
            >
              {chip.label}
              <span className={`ml-1.5 ${filtro === chip.id ? "text-white/70" : "text-primary-light/70"}`}>
                {chip.count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-primary-light/70 py-10 text-center">Cargando ruta...</p>
        ) : rutaOrdenada.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-4xl block mb-3">ðŸ“‹</span>
            <p className="text-primary-light/75 text-sm">No hay crÃ©ditos activos todavÃ­a</p>
            {!isAdmin && (
              <button
                onClick={() => navigate("/creditos/nuevo")}
                className="mt-4 text-primary-light font-medium text-sm hover:underline"
              >
                Crear primer crÃ©dito â†’
              </button>
            )}
          </div>
        ) : rutaFiltrada.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl block mb-3">
              {filtro === "hoy"
                ? "ðŸ“…"
                : filtro === "mora"
                ? "ðŸŽ‰"
                : filtro === "cobrados"
                ? "ðŸ’¸"
                : "ðŸ”"}
            </span>
            <p className="text-primary-light/75 text-sm">
              {busqueda.trim()
                ? `Sin resultados para "${busqueda.trim()}"`
                : filtro === "hoy"
                ? rutaOrdenada.some((i) => cobradosHoyIds.has(i.id))
                  ? "Â¡Buen trabajo! Ya cobraste lo programado de hoy"
                  : "No hay cobros programados para hoy"
                : filtro === "mora"
                ? "No hay clientes en mora"
                : filtro === "cobrados"
                ? "AÃºn no hay cobros registrados hoy"
                : "Sin resultados"}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-primary-light/70">
              {rutaFiltrada.length} de {rutaOrdenada.length} crÃ©ditos Â· {visits.length} visitas hoy
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
                        ? `Debe ${item.mora.cuotasMora} cuotas â€” $${formatearMonto(item.mora.deficit)}`
                        : `Cuota: $${formatearMonto(Math.min(item.cuota, item.saldoPendiente ?? item.cuota))}`
                    }
                    ubicacion={item.client.ubicacion}
                    onClick={() => navigate(`/cobro/${item.id}`)}
                  />
                  {visita ? (
                    <p className="flex items-center gap-1 text-[11px] text-primary-light/70 pl-2">
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

