import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layout/Header";
import ClientRow from "../../components/ui/ClientRow";
import RouteProgress from "../../components/ui/RouteProgress";
import VisitActionSheet from "../../components/ui/VisitActionSheet";
import UndoToast from "../../components/ui/UndoToast";
import { useRutaHoy } from "../../hooks/useRutaHoy";
import { useMovements } from "../../hooks/useMovements";
import { RESULTADOS_VISITA } from "../../hooks/useVisits";
import { useAuth } from "../../context/AuthContext";
import { formatearMonto } from "../../logic/formato";
import { IconSearch, IconPlus, IconChevronDown } from "@tabler/icons-react";

const ETIQUETA_GESTION = {
  no_pago: "No pagó",
  no_encontrado: "No encontrado",
  promesa_pago: "Promesa de pago",
};

const DIAS_INICIALES = 2;
const DIAS_POR_CLIC = 3;

export default function RutaDelDia() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const {
    diasAgrupados,
    moraGeneral,
    moraHoy,
    visitasHoyPorLoan,
    cobradosHoyIds,
    pendientesHoy,
    enMoraCount,
    totalRuta,
    rutaOrdenada,
    loading,
    registrarVisita,
  } = useRutaHoy();
  const { movements } = useMovements();

  const [filtro, setFiltro] = useState(null); // null = todos los días | hoy | mora
  const [busqueda, setBusqueda] = useState("");
  const [diasVisibles, setDiasVisibles] = useState(DIAS_INICIALES);
  const [sheetItem, setSheetItem] = useState(null);
  // Gestión retenida 5 s antes de escribirse: las visitas son inmutables,
  // así que el "Deshacer" cancela la escritura en vez de borrarla.
  const [pendiente, setPendiente] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const cobradoHoy = useMemo(
    () => movements.filter((m) => m.tipo === "cobro").reduce((acc, m) => acc + m.monto, 0),
    [movements]
  );

  function coincide(item) {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return [item.client?.nombre, item.client?.cedula, item.client?.telefono].some((v) =>
      (v || "").toLowerCase().includes(q)
    );
  }

  const diasFiltrados = useMemo(
    () =>
      diasAgrupados
        .map((g) => ({ ...g, items: g.items.filter(coincide) }))
        .filter((g) => g.items.length > 0),
    [diasAgrupados, busqueda]
  );

  const hoyFiltrado = useMemo(
    () => (diasAgrupados.find((g) => g.offset === 0)?.items ?? []).filter(coincide),
    [diasAgrupados, busqueda]
  );
  const moraGeneralFiltrada = useMemo(() => moraGeneral.filter(coincide), [moraGeneral, busqueda]);
  const moraHoyFiltrada = useMemo(() => moraHoy.filter(coincide), [moraHoy, busqueda]);

  // Reinicia cuántos días se ven al cambiar de filtro o buscar, para no
  // quedarse con una lista larga expandida cuando se cambia de contexto.
  useEffect(() => setDiasVisibles(DIAS_INICIALES), [filtro, busqueda]);

  const diasMostrados = filtro === null ? diasFiltrados.slice(0, diasVisibles) : [];
  const hayMasDias = filtro === null && diasFiltrados.length > diasVisibles;

  const totalVisible =
    filtro === "hoy"
      ? hoyFiltrado.length
      : filtro === "mora"
      ? moraGeneralFiltrada.length + moraHoyFiltrada.length
      : diasMostrados.reduce((acc, g) => acc + g.items.length, 0);

  // Dos filtros: Hoy (la ruta del día actual) y Mora (todos los atrasados,
  // sin importar cuándo les toque la próxima cuota). Por defecto (ninguno
  // activo) se ve la lista completa agrupada por día.
  const chips = [
    { id: "hoy", label: "Hoy", count: pendientesHoy.length },
    { id: "mora", label: "Mora", count: enMoraCount },
  ];

  function cuotaDe(item) {
    return "$" + formatearMonto(Math.min(item.cuota, item.saldoPendiente ?? item.cuota));
  }

  function subtituloDe(item) {
    return item.mora.estado === "mora"
      ? "Mora · " + item.mora.cuotasMora + " cuotas · $" + formatearMonto(item.mora.deficit)
      : "Cuota · " + cuotaDe(item);
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

  function renderFila(item) {
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
            ? ETIQUETA_GESTION[pendiente.resultado] || "Gestión registrada"
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
  }

  return (
    <div>
      <Header title="Ruta de hoy" />

      <div className="py-4 flex flex-col gap-4">
        <RouteProgress
          gestionados={cobradosHoyIds.size}
          total={totalRuta}
          enMora={enMoraCount}
          montoCobrado={"$" + formatearMonto(cobradoHoy)}
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
            placeholder="Buscar nombre, cédula o teléfono"
            className="w-full h-12 rounded-2xl border border-line bg-surface pl-11 pr-4 text-sm text-primary placeholder:text-primary/40 focus:outline-none focus:border-primary transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-2 flex-1">
            {chips.map((chip) => {
              const activo = filtro === chip.id;
              const esMora = chip.id === "mora";
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFiltro((prev) => (prev === chip.id ? null : chip.id))}
                  className={
                    "flex-1 min-h-[46px] rounded-xl border flex flex-col items-center justify-center gap-0.5 transition " +
                    (activo
                      ? "bg-gold border-gold text-surface-1"
                      : esMora
                      ? "bg-surface border-mora/30 text-mora"
                      : "bg-surface border-line text-primary/60")
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
          {filtro && (
            <button
              type="button"
              onClick={() => setFiltro(null)}
              className="text-xs font-medium text-primary/60 underline underline-offset-4 shrink-0"
            >
              Ver todos
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-primary/40 py-10 text-center">Cargando ruta...</p>
        ) : rutaOrdenada.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center gap-3">
            <p className="text-sm text-primary/50">No hay créditos activos todavía</p>
            {!isAdmin && (
              <button
                onClick={() => navigate("/creditos/nuevo")}
                className="text-sm font-semibold text-primary underline underline-offset-4"
              >
                Crear primer crédito
              </button>
            )}
          </div>
        ) : totalVisible === 0 ? (
          <p className="text-sm text-primary/50 text-center py-12">
            {busqueda.trim()
              ? 'Sin resultados para "' + busqueda.trim() + '"'
              : filtro === "hoy"
              ? "No hay créditos programados para hoy"
              : filtro === "mora"
              ? "No hay créditos en mora"
              : "No hay créditos en esta sección"}
          </p>
        ) : filtro === "hoy" ? (
          <div className="flex flex-col gap-2">
            <p className="eyebrow">
              {hoyFiltrado.length} crédito{hoyFiltrado.length === 1 ? "" : "s"} hoy
            </p>
            {hoyFiltrado.map(renderFila)}
          </div>
        ) : filtro === "mora" ? (
          <div className="flex flex-col gap-5">
            {moraGeneralFiltrada.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="eyebrow flex items-center gap-2">
                  Mora
                  <span className="num text-[10.5px] opacity-50">{moraGeneralFiltrada.length}</span>
                </p>
                {moraGeneralFiltrada.map(renderFila)}
              </div>
            )}
            {moraHoyFiltrada.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="eyebrow flex items-center gap-2">
                  Mora · cobro hoy
                  <span className="num text-[10.5px] opacity-50">{moraHoyFiltrada.length}</span>
                </p>
                {moraHoyFiltrada.map(renderFila)}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {diasMostrados.map((grupo) => (
              <div
                key={grupo.offset}
                className="flex flex-col gap-2"
              >
                <p className="eyebrow flex items-center gap-2">
                  {grupo.titulo}
                  <span className="num text-[10.5px] opacity-50">{grupo.items.length}</span>
                </p>
                {grupo.items.map(renderFila)}
              </div>
            ))}
            {hayMasDias && (
              <button
                type="button"
                onClick={() => setDiasVisibles((v) => v + DIAS_POR_CLIC)}
                className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary/60 py-3 rounded-xl border border-line hover:bg-surface transition"
              >
                Ver más
                <IconChevronDown size={16} stroke={2} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Acción flotante: crear cobro rápido, sobre la barra inferior */}
      <button
        type="button"
        onClick={() => navigate("/creditos/nuevo")}
        aria-label="Nuevo crédito"
        className="lg:hidden fixed right-5 bottom-[92px] z-30 w-14 h-14 rounded-2xl bg-gold text-surface-1 flex items-center justify-center shadow-lg shadow-black/50 active:scale-95 transition"
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
            ? (ETIQUETA_GESTION[pendiente.resultado] || "Gestión") +
              " · " +
              (pendiente.item.client.nombre || "Cliente")
            : null
        }
        onUndo={deshacer}
      />
    </div>
  );
}
