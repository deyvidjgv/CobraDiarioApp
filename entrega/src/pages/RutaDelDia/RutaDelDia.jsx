import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layout/Header";
import ClientRow from "../../components/ui/ClientRow";
import RouteProgress from "../../components/ui/RouteProgress";
import VisitActionSheet from "../../components/ui/VisitActionSheet";
import UndoToast from "../../components/ui/UndoToast";
import { useClients } from "../../hooks/useClients";
import { useLoans } from "../../hooks/useLoans";
import { useVisits, RESULTADOS_VISITA } from "../../hooks/useVisits";
import { useAuth } from "../../context/AuthContext";
import { calcularMoraGlobal, calcularMoraGlobalAlCierre } from "../../logic/mora";
import { esDiaDeCobro } from "../../logic/frecuencia";
import { formatearMonto } from "../../logic/formato";
import { IconSearch, IconPlus } from "@tabler/icons-react";

const ETIQUETA_GESTION = {
  no_pago: "No pag\u00f3",
  no_encontrado: "No encontrado",
  promesa_pago: "Promesa de pago",
};

// Prioridad de visita: 1º mora, 2º cuota de hoy pendiente, 3º al día, 4º adelantado
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

  const [filtro, setFiltro] = useState("hoy"); // hoy | mora | cobrados
  const [busqueda, setBusqueda] = useState("");
  const [sheetItem, setSheetItem] = useState(null);
  // Gestión retenida 5 s antes de escribirse: las visitas son inmutables,
  // así que el "Deshacer" cancela la escritura en vez de borrarla.
  const [pendiente, setPendiente] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const visitasHoyPorLoan = useMemo(
    () => Object.fromEntries(visits.map((v) => [v.loanId, v])),
    [visits]
  );

  const rutaOrdenada = useMemo(() => {
    const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));
    return loans
      .map((loan) => {
        const mora = calcularMoraGlobal(loan);
        const alCierre = calcularMoraGlobalAlCierre(loan);
        const programadoHoy = esDiaDeCobro(loan);
        const faltaCobrarHoy = programadoHoy && alCierre.deficit > 0;
        return { ...loan, mora, programadoHoy, faltaCobrarHoy, client: clientMap[loan.clientId] || {} };
      })
      .sort((a, b) => {
        const prioridad = prioridadDe(a) - prioridadDe(b);
        if (prioridad !== 0) return prioridad;
        if (a.mora.deficit !== b.mora.deficit) return b.mora.deficit - a.mora.deficit;
        return (a.client.nombre || "").localeCompare(b.client.nombre || "");
      });
  }, [loans, clients]);

  const cobradosHoyIds = useMemo(
    () =>
      new Set(
        visits.filter((v) => v.resultado === RESULTADOS_VISITA.COBRO).map((v) => v.loanId)
      ),
    [visits]
  );

  const pendientesHoy = useMemo(
    () => rutaOrdenada.filter((i) => i.faltaCobrarHoy && !cobradosHoyIds.has(i.id)),
    [rutaOrdenada, cobradosHoyIds]
  );
  const enMoraCount = useMemo(
    () => rutaOrdenada.filter((i) => i.mora.estado === "mora").length,
    [rutaOrdenada]
  );

  const rutaFiltrada = useMemo(() => {
    let lista = rutaOrdenada;
    if (filtro === "hoy") lista = pendientesHoy;
    else if (filtro === "mora") lista = lista.filter((i) => i.mora.estado === "mora");
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
  }, [rutaOrdenada, pendientesHoy, filtro, busqueda, cobradosHoyIds]);

  // Tres filtros: más de tres no caben legibles en 360px de ancho
  const chips = [
    { id: "hoy", label: "Hoy", count: pendientesHoy.length },
    { id: "mora", label: "Mora", count: enMoraCount },
    { id: "cobrados", label: "Cobrados", count: cobradosHoyIds.size },
  ];

  const totalRuta = pendientesHoy.length + cobradosHoyIds.size;

  function cuotaDe(item) {
    return "$" + formatearMonto(Math.min(item.cuota, item.saldoPendiente ?? item.cuota));
  }

  function subtituloDe(item) {
    return item.mora.estado === "mora"
      ? "Mora \u00b7 " + item.mora.cuotasMora + " cuotas \u00b7 $" + formatearMonto(item.mora.deficit)
      : "Cuota \u00b7 " + cuotaDe(item);
  }

  function programarGestion(item, resultado) {
    clearTimeout(timerRef.current);
    setSheetItem(null);
    setPendiente({ item, resultado });
    timerRef.current = setTimeout(async () => {
      try {
        await registrarVisita({ clientId: item.clientId, loanId: item.id, resultado });
      } catch (err) {
        alert("No se pudo registrar la visita: " + err.message);
      } finally {
        setPendiente(null);
      }
    }, 5000);
  }

  function deshacer() {
    clearTimeout(timerRef.current);
    setPendiente(null);
  }

  return (
    <div>
      <Header title="Ruta de hoy" />

      <div className="py-4 flex flex-col gap-4">
        <RouteProgress
          gestionados={cobradosHoyIds.size}
          total={totalRuta}
          enMora={enMoraCount}
        />

        <div className="relative">
          <IconSearch
            size={18}
            stroke={1.5}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/35 pointer-events-none"
          />
          <input
            type="search"
            inputMode="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar nombre, c\u00e9dula o tel\u00e9fono"
            className="w-full h-12 rounded-2xl border border-line bg-white pl-11 pr-4 text-sm text-primary placeholder:text-primary/40 focus:outline-none focus:border-primary transition"
          />
        </div>

        <div className="flex gap-2">
          {chips.map((chip) => {
            const activo = filtro === chip.id;
            const esMora = chip.id === "mora";
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFiltro(chip.id)}
                className={
                  "flex-1 min-h-[46px] rounded-xl border flex flex-col items-center justify-center gap-0.5 transition " +
                  (activo
                    ? "bg-primary border-primary text-surface-1"
                    : esMora
                    ? "bg-white border-mora/30 text-mora"
                    : "bg-white border-line text-primary/60")
                }
              >
                <span className="text-[12.5px] font-semibold">{chip.label}</span>
                <span className={"num text-[10.5px] " + (activo ? "text-surface-1/60" : "opacity-60")}>
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <p className="text-sm text-primary/40 py-10 text-center">Cargando ruta...</p>
        ) : rutaOrdenada.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center gap-3">
            <p className="text-sm text-primary/50">No hay cr\u00e9ditos activos todav\u00eda</p>
            {!isAdmin && (
              <button
                onClick={() => navigate("/creditos/nuevo")}
                className="text-sm font-semibold text-primary underline underline-offset-4"
              >
                Crear primer cr\u00e9dito
              </button>
            )}
          </div>
        ) : rutaFiltrada.length === 0 ? (
          <p className="text-sm text-primary/50 text-center py-12">
            {busqueda.trim()
              ? 'Sin resultados para "' + busqueda.trim() + '"'
              : filtro === "hoy"
              ? "No hay cobros pendientes para hoy"
              : filtro === "mora"
              ? "No hay clientes en mora"
              : "A\u00fan no hay cobros registrados hoy"}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="eyebrow">
              {rutaFiltrada.length} de {rutaOrdenada.length} cr\u00e9ditos
            </p>
            {rutaFiltrada.map((item) => {
              const visita = visitasHoyPorLoan[item.id];
              const retenida = pendiente?.item.id === item.id;
              const gestionada = Boolean(visita) || retenida;
              return (
                <ClientRow
                  key={item.id}
                  name={item.client.nombre || "Cliente"}
                  phone={item.client.telefono}
                  status={item.mora.estado}
                  done={gestionada}
                  subtitle={
                    retenida
                      ? ETIQUETA_GESTION[pendiente.resultado] || "Gesti\u00f3n registrada"
                      : visita
                      ? visita.resultado === RESULTADOS_VISITA.COBRO
                        ? "Cobro registrado hoy"
                        : "Visitado hoy"
                      : subtituloDe(item)
                  }
                  onClick={() => navigate("/cobro/" + item.id)}
                  onMore={gestionada ? null : () => setSheetItem({ ...item, subtitleSheet: subtituloDe(item) })}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Acción flotante: crear cobro rápido, sobre la barra inferior */}
      <button
        type="button"
        onClick={() => navigate("/creditos/nuevo")}
        aria-label="Nuevo cr\u00e9dito"
        className="md:hidden fixed right-5 bottom-[92px] z-30 w-14 h-14 rounded-2xl bg-primary text-surface-1 flex items-center justify-center shadow-lg active:scale-95 transition"
      >
        <IconPlus size={24} stroke={1.8} />
      </button>

      <VisitActionSheet
        open={Boolean(sheetItem)}
        item={sheetItem}
        montoCuota={sheetItem ? cuotaDe(sheetItem) : null}
        onClose={() => setSheetItem(null)}
        onCobrar={() => {
          const id = sheetItem.id;
          setSheetItem(null);
          navigate("/cobro/" + id);
        }}
        onGestion={(resultado) => programarGestion(sheetItem, resultado)}
      />

      <UndoToast
        mensaje={
          pendiente
            ? (ETIQUETA_GESTION[pendiente.resultado] || "Gesti\u00f3n") +
              " \u00b7 " +
              (pendiente.item.client.nombre || "Cliente")
            : null
        }
        onUndo={deshacer}
      />
    </div>
  );
}
