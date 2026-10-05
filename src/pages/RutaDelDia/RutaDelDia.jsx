import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layout/Header";
import ClientRow from "../../components/ui/ClientRow";
import RouteProgress from "../../components/ui/RouteProgress";
import VisitActionSheet from "../../components/ui/VisitActionSheet";
import UndoToast from "../../components/ui/UndoToast";
import PosicionRutaSheet from "../../components/ui/PosicionRutaSheet";
import { ListaOrdenable, FilaOrdenable } from "../../components/ui/ListaOrdenable";
import { useRutaHoy } from "../../hooks/useRutaHoy";
import { useOrdenRuta } from "../../hooks/useOrdenRuta";
import { useMovements } from "../../hooks/useMovements";
import { RESULTADOS_VISITA } from "../../hooks/useVisits";
import { useAuth } from "../../context/AuthContext";
import { formatearMonto } from "../../logic/formato";
import { MODOS_ORDEN, claveDeOrden, vecinoVisible } from "../../logic/ordenRuta";
import { IconSearch, IconPlus, IconChevronDown } from "@tabler/icons-react";

const ETIQUETA_GESTION = {
  no_pago: "No pagó",
  no_encontrado: "No encontrado",
  promesa_pago: "Promesa de pago",
};

const DIAS_INICIALES = 2;
const DIAS_POR_CLIC = 3;

// Etiqueta de los créditos sin cuota en el horizonte de la ruta (cuotas
// ya agotadas): en orden automático no aparecen en la lista por días,
// pero la lista manual muestra todos.
const SIN_FECHA = { texto: "Sin fecha", destacado: false };

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

  // Lo que se ve en orden automático, aplanado: día por día (Hoy, Mañana,
  // ...) y al final los créditos sin fecha. Es el punto de partida del
  // orden manual, para que al cambiar de modo nada salte de lugar.
  const ordenAutomatico = useMemo(() => {
    const porDias = diasAgrupados.flatMap((grupo) => grupo.items);
    const enDias = new Set(porDias.map((item) => item.id));
    return [...porDias, ...rutaOrdenada.filter((item) => !enDias.has(item.id))];
  }, [diasAgrupados, rutaOrdenada]);

  // Orden de la ruta: "automático" (mora primero, decide el sistema) o
  // "manual" (el cobrador arma su propio recorrido, que se aplica a todas
  // las vistas). Ver hooks/useOrdenRuta.js y logic/ordenRuta.js.
  const orden = useOrdenRuta(ordenAutomatico, loading);
  const [posicionItem, setPosicionItem] = useState(null);

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
  // Orden manual: una sola lista con TODOS los créditos, sin agrupar por
  // día — el cobrador puede poner un crédito del lunes arriba de todo.
  const listaManual = useMemo(() => ordenAutomatico.filter(coincide), [ordenAutomatico, busqueda]);

  // Día de cobro de cada crédito, como etiqueta de su fila en la lista
  // manual (el día viaja con la fila al moverla). Pasada una semana el
  // nombre del día solo es ambiguo, así que se agrega la fecha.
  const diaPorCredito = useMemo(() => {
    const hoy = new Date();
    const dias = new Map();
    for (const grupo of diasAgrupados) {
      let texto = grupo.titulo;
      if (grupo.offset >= 7) {
        const fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() + grupo.offset);
        texto = grupo.titulo.slice(0, 3) + " " + fecha.getDate() + "/" + (fecha.getMonth() + 1);
      }
      for (const item of grupo.items) dias.set(item.id, { texto, destacado: grupo.offset === 0 });
    }
    return dias;
  }, [diasAgrupados]);
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
      : orden.esManual
      ? listaManual.length
      : diasMostrados.reduce((acc, g) => acc + g.items.length, 0);

  // Dos filtros: Hoy (la ruta del día actual) y Mora (todos los atrasados,
  // sin importar cuándo les toque la próxima cuota). Por defecto (ninguno
  // activo) se ve la lista completa: agrupada por día en orden automático,
  // o una sola lista en el orden del cobrador en manual.
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

  function renderFila(item, reorder = null, tag = null) {
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
        tag={tag}
        reorder={reorder}
      />
    );
  }

  function esGestionadoHoy(item) {
    return Boolean(visitasHoyPorLoan[item.id]) || pendiente?.item.id === item.id;
  }

  /**
   * Renderiza una sección de la ruta (la lista manual completa, un día,
   * pendientes/cobrados de hoy, mora). En modo manual la ordena según el
   * recorrido del cobrador y la vuelve arrastrable, con flechas y número
   * de posición por fila. Arrastre y flechas se mueven respecto a las
   * filas VISIBLES en la sección, pero el cambio se guarda en el orden de
   * toda la ruta, así que se refleja en las demás vistas.
   * @param {string} key - identifica la sección (una lista arrastrable por sección)
   * @param {boolean} conDia - etiqueta cada fila con su día de cobro
   */
  function renderSeccion(items, key, conDia = false) {
    const lista = orden.ordenar(items);
    const tagDe = (item) => (conDia ? diaPorCredito.get(item.id) ?? SIN_FECHA : null);
    if (!orden.esManual) return lista.map((item) => renderFila(item, null, tagDe(item)));
    const claves = lista.map(claveDeOrden);
    return (
      <ListaOrdenable
        key={key}
        ids={lista.map((item) => item.id)}
        onMover={(desde, hasta) => orden.moverArrastrando(claves, desde, hasta)}
      >
        {lista.map((item, idx) => {
          const clave = claves[idx];
          const arriba = vecinoVisible(claves, idx, -1);
          const abajo = vecinoVisible(claves, idx, 1);
          return (
            <FilaOrdenable key={item.id} id={item.id}>
              {(drag) =>
                renderFila(
                  item,
                  {
                    posicion: orden.posicionDe(clave),
                    canUp: arriba != null,
                    canDown: abajo != null,
                    onUp: () => orden.moverJuntoA(clave, arriba, -1),
                    onDown: () => orden.moverJuntoA(clave, abajo, 1),
                    onPosicion: () => setPosicionItem(item),
                    drag,
                  },
                  tagDe(item)
                )
              }
            </FilaOrdenable>
          );
        })}
      </ListaOrdenable>
    );
  }

  function restablecerOrden() {
    if (!confirm("¿Descartar tu orden y volver a empezar desde el orden del sistema (mora primero)?")) return;
    orden.restablecer();
  }

  return (
    <div>
      <Header
        title="Ruta de hoy"
        modalOpen={Boolean(sheetItem || posicionItem)}
        closeModal={() => {
          setSheetItem(null);
          setPosicionItem(null);
        }}
      />

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
            className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/58 pointer-events-none"
          />
          <input
            type="search"
            inputMode="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar nombre, cédula o teléfono"
            className="w-full h-12 rounded-2xl border border-line bg-surface pl-11 pr-4 text-sm text-primary placeholder:text-primary/60 focus:outline-none focus:border-primary transition"
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

        {/* Orden de la ruta: decide el sistema (mora primero) o el
            cobrador arma su propio recorrido con flechas por fila. */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow shrink-0">Orden de ruta</span>
            <div className="flex rounded-xl border border-line bg-surface p-1 gap-1">
              {[
                { modo: MODOS_ORDEN.AUTOMATICO, label: "Automático" },
                { modo: MODOS_ORDEN.MANUAL, label: "Manual" },
              ].map((op) => (
                <button
                  key={op.modo}
                  type="button"
                  aria-pressed={orden.modo === op.modo}
                  onClick={() => orden.cambiarModo(op.modo)}
                  className={
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition " +
                    (orden.modo === op.modo
                      ? "bg-gold text-surface-1"
                      : "text-primary/65 hover:text-primary")
                  }
                >
                  {op.label}
                </button>
              ))}
            </div>
            {orden.esManual && rutaOrdenada.length > 0 && (
              <button
                type="button"
                onClick={restablecerOrden}
                className="ml-auto text-xs font-medium text-primary/60 underline underline-offset-4 shrink-0"
              >
                Reiniciar
              </button>
            )}
          </div>
          <p className="text-[11.5px] text-primary/60 leading-snug">
            {orden.esManual
              ? "Todos tus créditos en una sola lista. Arrastra el número de cada cliente para moverlo, usa las flechas, o toca el número (o ···) para elegir su posición. Se guarda en este celular."
              : "El sistema ordena cada día: primero los clientes en mora, luego los que están al día."}
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-primary/60 py-10 text-center">Cargando ruta...</p>
        ) : rutaOrdenada.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center gap-3">
            <p className="text-sm text-primary/70">No hay créditos activos todavía</p>
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
          <p className="text-sm text-primary/70 text-center py-12">
            {busqueda.trim()
              ? 'Sin resultados para "' + busqueda.trim() + '"'
              : filtro === "hoy"
              ? "No hay créditos programados para hoy"
              : filtro === "mora"
              ? "No hay créditos en mora"
              : "No hay créditos en esta sección"}
          </p>
        ) : filtro === "hoy" ? (
          (() => {
            // Mismo criterio que renderFila para decidir "gestionado" —
            // separados en dos secciones para no confundir lo que ya se
            // cobró/visitó hoy con lo que todavía falta.
            const pendientesDeHoy = hoyFiltrado.filter((item) => !esGestionadoHoy(item));
            const cobradosDeHoy = hoyFiltrado.filter(esGestionadoHoy);
            return (
              <div className="flex flex-col gap-5">
                {pendientesDeHoy.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="eyebrow flex items-center gap-2">
                      Pendientes
                      <span className="num text-[10.5px] opacity-50">{pendientesDeHoy.length}</span>
                    </p>
                    {renderSeccion(pendientesDeHoy, "pendientes")}
                  </div>
                )}
                {cobradosDeHoy.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="eyebrow flex items-center gap-2">
                      Cobrados hoy
                      <span className="num text-[10.5px] opacity-50">{cobradosDeHoy.length}</span>
                    </p>
                    {renderSeccion(cobradosDeHoy, "cobrados")}
                  </div>
                )}
              </div>
            );
          })()
        ) : filtro === "mora" ? (
          <div className="flex flex-col gap-5">
            {moraGeneralFiltrada.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="eyebrow flex items-center gap-2">
                  Mora
                  <span className="num text-[10.5px] opacity-50">{moraGeneralFiltrada.length}</span>
                </p>
                {renderSeccion(moraGeneralFiltrada, "mora")}
              </div>
            )}
            {moraHoyFiltrada.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="eyebrow flex items-center gap-2">
                  Mora · cobro hoy
                  <span className="num text-[10.5px] opacity-50">{moraHoyFiltrada.length}</span>
                </p>
                {renderSeccion(moraHoyFiltrada, "mora-hoy")}
              </div>
            )}
          </div>
        ) : orden.esManual ? (
          <div className="flex flex-col gap-2">
            <p className="eyebrow flex items-center gap-2">
              Mi ruta
              <span className="num text-[10.5px] opacity-50">{listaManual.length}</span>
            </p>
            {renderSeccion(listaManual, "ruta", true)}
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
                {grupo.offset === 0 ? (
                  <>
                    {renderSeccion(grupo.items.filter((item) => !esGestionadoHoy(item)), "pendientes")}
                    {renderSeccion(grupo.items.filter(esGestionadoHoy), "gestionados")}
                  </>
                ) : (
                  renderSeccion(grupo.items, "dia")
                )}
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

      {/* Acción flotante: crear crédito, sobre la barra inferior.
          Solo para el cobrador: el Admin no presta, y sin este guard el
          botón lo mandaba a NuevoCredito, que lo rebota a Inicio. */}
      {!isAdmin && (
        <button
          type="button"
          onClick={() => navigate("/creditos/nuevo")}
          aria-label="Nuevo crédito"
          className="lg:hidden fixed right-5 bottom-nav-safe z-30 w-14 h-14 rounded-2xl bg-gold text-surface-1 flex items-center justify-center shadow-lg shadow-black/50 active:scale-95 transition"
        >
          <IconPlus size={24} stroke={1.8} />
        </button>
      )}

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
        onOrdenar={() => {
          const item = sheetItem;
          setSheetItem(null);
          setPosicionItem(item);
        }}
        posicionRuta={
          orden.esManual && sheetItem ? orden.posicionDe(claveDeOrden(sheetItem)) : null
        }
      />

      <PosicionRutaSheet
        open={Boolean(posicionItem)}
        nombre={posicionItem?.client.nombre}
        posicion={posicionItem ? orden.posicionDe(claveDeOrden(posicionItem)) : null}
        total={orden.totalPosiciones}
        aviso={
          orden.esManual
            ? null
            : "Tu ruta está en orden automático. Al mover a este cliente pasa a orden manual, partiendo del orden actual."
        }
        onClose={() => setPosicionItem(null)}
        onMover={(destino) => {
          if (!orden.esManual) orden.cambiarModo(MODOS_ORDEN.MANUAL);
          orden.moverAPosicion(claveDeOrden(posicionItem), destino);
        }}
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
