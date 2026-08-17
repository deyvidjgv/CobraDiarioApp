import { useMemo } from "react";
import { useClients } from "./useClients";
import { useLoans } from "./useLoans";
import { useVisits, RESULTADOS_VISITA } from "./useVisits";
import { calcularMoraGlobal, calcularMoraGlobalAlCierre } from "../logic/mora";
import { esDiaDeCobro } from "../logic/frecuencia";

// 35 días cubre incluso el ciclo de créditos mensuales (intervalo de 30 días)
// sin que un crédito al día "desaparezca" de la lista por no caber en el horizonte.
const HORIZONTE_DIAS = 35;
const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

/** Dentro de un mismo día: mora primero, luego al día/adelantado; empate por mayor déficit, luego nombre */
function compararPrioridad(a, b) {
  const rango = (i) => (i.mora.estado === "mora" ? 0 : i.mora.estado === "al_dia" ? 1 : 2);
  const diff = rango(a) - rango(b);
  if (diff !== 0) return diff;
  if (a.mora.deficit !== b.mora.deficit) return b.mora.deficit - a.mora.deficit;
  return (a.client.nombre || "").localeCompare(b.client.nombre || "");
}

/** Ordena por "más atrasado": más cuotas en mora primero, luego mayor déficit */
function compararMasAtrasado(a, b) {
  if (a.mora.cuotasMora !== b.mora.cuotasMora) return b.mora.cuotasMora - a.mora.cuotasMora;
  if (a.mora.deficit !== b.mora.deficit) return b.mora.deficit - a.mora.deficit;
  return (a.client.nombre || "").localeCompare(b.client.nombre || "");
}

/**
 * Próximo desfase en días (0 = hoy) en que el crédito tiene cuota
 * programada, escaneando hacia adelante hasta `horizonte` días.
 * Devuelve null si no encuentra ninguna dentro del horizonte (por
 * ejemplo créditos con las cuotas ya agotadas).
 */
function proximoOffsetDeCobro(loan, hoy, horizonte) {
  for (let d = 1; d <= horizonte; d++) {
    if (esDiaDeCobro(loan, sumarDias(hoy, d))) return d;
  }
  return null;
}

function tituloDelDia(offset, fecha) {
  if (offset === 0) return "Hoy";
  if (offset === 1) return "Mañana";
  return DIAS_SEMANA[fecha.getDay()];
}

/**
 * Ruta del día: une clientes + créditos + visitas, calcula mora y arma
 * dos vistas sobre los mismos créditos:
 *  - `diasAgrupados`: la lista principal, agrupada por el próximo día en
 *    que a cada crédito le toca cobrar (Hoy, Mañana, y así sucesivamente),
 *    y dentro de cada día ordenada por prioridad (mora primero).
 *  - `moraGeneral` / `moraHoy`: todos los créditos en mora sin importar si
 *    su próxima cuota programada es hoy o no, para el filtro "Mora".
 *
 * Trae TODOS los créditos activos (no solo los que vencen hoy) más los que
 * se completaron hoy mismo — un crédito pagado por completo pasa a
 * estado "completado" y `useLoans` con filtro activo lo habría hecho
 * desaparecer de inmediato, incluso del día de hoy.
 */
export function useRutaHoy() {
  const { clients } = useClients();
  const { loans, loading } = useLoans(false);
  const { visits, registrarVisita } = useVisits();

  const visitasHoyPorLoan = useMemo(
    () => Object.fromEntries(visits.map((v) => [v.loanId, v])),
    [visits]
  );

  const cobradosHoyIds = useMemo(
    () =>
      new Set(
        visits.filter((v) => v.resultado === RESULTADOS_VISITA.COBRO).map((v) => v.loanId)
      ),
    [visits]
  );

  const rutaOrdenada = useMemo(() => {
    const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));
    const hoy = new Date();
    return loans
      .filter((loan) => loan.estado === "activo" || cobradosHoyIds.has(loan.id))
      .map((loan) => {
        const mora = calcularMoraGlobal(loan);
        const alCierre = calcularMoraGlobalAlCierre(loan);
        const programadoHoy = esDiaDeCobro(loan, hoy);
        const faltaCobrarHoy = programadoHoy && alCierre.deficit > 0;
        return {
          ...loan,
          mora,
          programadoHoy,
          faltaCobrarHoy,
          client: clientMap[loan.clientId] || {},
        };
      })
      .sort(compararPrioridad);
  }, [loans, clients, cobradosHoyIds]);

  // Lo de hoy: programado para hoy (con o sin déficit real) o ya cobrado hoy mismo.
  const itemsHoy = useMemo(
    () => rutaOrdenada.filter((i) => i.faltaCobrarHoy || cobradosHoyIds.has(i.id)),
    [rutaOrdenada, cobradosHoyIds]
  );

  const pendientesHoy = useMemo(
    () => itemsHoy.filter((i) => !cobradosHoyIds.has(i.id)),
    [itemsHoy, cobradosHoyIds]
  );

  const enMoraCount = useMemo(
    () => rutaOrdenada.filter((i) => i.mora.estado === "mora" && !cobradosHoyIds.has(i.id)).length,
    [rutaOrdenada, cobradosHoyIds]
  );

  // Lista principal agrupada por próximo día de cobro (Hoy, Mañana, ...).
  const diasAgrupados = useMemo(() => {
    const hoy = new Date();
    const resto = rutaOrdenada.filter((i) => !i.faltaCobrarHoy && !cobradosHoyIds.has(i.id));

    const grupos = new Map();
    grupos.set(0, [...itemsHoy].sort(compararPrioridad));

    for (const item of resto) {
      const offset = proximoOffsetDeCobro(item, hoy, HORIZONTE_DIAS);
      if (offset == null) continue;
      if (!grupos.has(offset)) grupos.set(offset, []);
      grupos.get(offset).push(item);
    }

    return Array.from(grupos.entries())
      .filter(([, items]) => items.length > 0)
      .sort(([a], [b]) => a - b)
      .map(([offset, items]) => ({
        offset,
        titulo: tituloDelDia(offset, sumarDias(hoy, offset)),
        items: items.sort(compararPrioridad),
      }));
  }, [rutaOrdenada, itemsHoy, cobradosHoyIds]);

  // Todos los créditos en mora, separados según si su cuota programada es hoy.
  const moraGeneral = useMemo(
    () =>
      rutaOrdenada
        .filter((i) => i.mora.estado === "mora" && !i.faltaCobrarHoy && !cobradosHoyIds.has(i.id))
        .sort(compararMasAtrasado),
    [rutaOrdenada, cobradosHoyIds]
  );
  const moraHoy = useMemo(
    () =>
      rutaOrdenada
        .filter((i) => i.mora.estado === "mora" && (i.faltaCobrarHoy || cobradosHoyIds.has(i.id)))
        .sort(compararMasAtrasado),
    [rutaOrdenada, cobradosHoyIds]
  );

  const totalRuta = pendientesHoy.length + cobradosHoyIds.size;

  return {
    rutaOrdenada,
    diasAgrupados,
    moraGeneral,
    moraHoy,
    visitasHoyPorLoan,
    cobradosHoyIds,
    pendientesHoy,
    enMoraCount,
    totalRuta,
    loading,
    registrarVisita,
  };
}
