import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  MODOS_ORDEN,
  claveDeOrden,
  aplicarRenovaciones,
  construirOrdenVigente,
  fusionarConGuardado,
  ordenarSegunPreferencia,
  moverJuntoA,
  moverArrastrando,
  moverAPosicion,
} from "../logic/ordenRuta";

// El orden se guarda por crédito (ver logic/ordenRuta.js). La primera
// versión guardaba solo la cola de hoy en claveOrdenLegado: se usa una
// única vez como punto de partida.
const claveModo = (uid) => `ruta-modo-orden-${uid}`;
const claveOrden = (uid) => `ruta-orden-creditos-${uid}`;
const claveOrdenLegado = (uid) => `ruta-orden-manual-${uid}`;

function leerModo(uid) {
  try {
    return uid && localStorage.getItem(claveModo(uid)) === MODOS_ORDEN.MANUAL
      ? MODOS_ORDEN.MANUAL
      : MODOS_ORDEN.AUTOMATICO;
  } catch {
    return MODOS_ORDEN.AUTOMATICO;
  }
}

function leerLista(clave) {
  try {
    const guardado = JSON.parse(localStorage.getItem(clave) || "[]");
    return Array.isArray(guardado) ? guardado : [];
  } catch {
    return [];
  }
}

const leerOrden = (uid) => (uid ? leerLista(claveOrden(uid)) : []);

function escribir(clave, valor) {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    /* sin almacenamiento: el cambio solo dura esta sesión */
  }
}

/**
 * Orden de la ruta del cobradiario: "automático" (mora primero, decide el
 * sistema) o "manual" (su propio recorrido). La preferencia y el orden
 * armado se guardan por usuario en este dispositivo.
 *
 * @param {object[]} rutaOrdenada - créditos de la ruta en el orden automático que se ve en pantalla
 * @param {boolean} loading - mientras carga no se siembra el orden manual
 */
export function useOrdenRuta(rutaOrdenada, loading) {
  const { usuario } = useAuth();
  const uid = usuario?.uid;

  const [modo, setModo] = useState(() => leerModo(uid));
  const [ordenGuardado, setOrdenGuardado] = useState(() => leerOrden(uid));

  // Si cambia el usuario sin desmontar la pantalla, recarga lo suyo.
  const uidCargado = useRef(uid);
  useEffect(() => {
    if (uidCargado.current === uid) return;
    uidCargado.current = uid;
    setModo(leerModo(uid));
    setOrdenGuardado(leerOrden(uid));
  }, [uid]);

  const clavesAutomaticas = useMemo(() => rutaOrdenada.map(claveDeOrden), [rutaOrdenada]);
  // Un crédito renovado cede su lugar al crédito nuevo que lo renovó.
  const guardadoEfectivo = useMemo(() => {
    const renovaciones = new Map(
      rutaOrdenada.filter((item) => item.renovacionDe).map((item) => [item.renovacionDe, item.id])
    );
    return aplicarRenovaciones(ordenGuardado, renovaciones, new Set(clavesAutomaticas));
  }, [rutaOrdenada, clavesAutomaticas, ordenGuardado]);
  const ordenVigente = useMemo(
    () => construirOrdenVigente(clavesAutomaticas, guardadoEfectivo),
    [clavesAutomaticas, guardadoEfectivo]
  );
  const posiciones = useMemo(
    () => new Map(ordenVigente.map((clave, i) => [clave, i + 1])),
    [ordenVigente]
  );

  function guardar(nuevo) {
    setOrdenGuardado(nuevo);
    if (uid) escribir(claveOrden(uid), JSON.stringify(nuevo));
  }

  function aplicar(nuevoVigente) {
    guardar(fusionarConGuardado(guardadoEfectivo, nuevoVigente));
  }

  // Al pasar a manual por primera vez, congela el orden automático de
  // este momento como punto de partida (encabezado por lo que se hubiera
  // armado con la versión anterior). Sin esto, el "manual" seguiría
  // moviéndose solo (la mora cambia cada día) hasta el primer toque.
  useEffect(() => {
    if (
      modo === MODOS_ORDEN.MANUAL &&
      !loading &&
      ordenGuardado.length === 0 &&
      ordenVigente.length > 0
    ) {
      const legado = uid ? leerLista(claveOrdenLegado(uid)) : [];
      guardar(construirOrdenVigente(clavesAutomaticas, legado));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, loading, ordenGuardado.length, ordenVigente]);

  function cambiarModo(nuevo) {
    setModo(nuevo);
    if (uid) escribir(claveModo(uid), nuevo);
  }

  return {
    modo,
    esManual: modo === MODOS_ORDEN.MANUAL,
    cambiarModo,
    /** Ordena una sección de la ruta según el modo activo. */
    ordenar: (items) => ordenarSegunPreferencia(items, modo, ordenVigente),
    /** Posición (1 = primero) del crédito en el recorrido manual. */
    posicionDe: (clave) => posiciones.get(clave) ?? null,
    totalPosiciones: ordenVigente.length,
    moverJuntoA: (clave, claveVecina, direccion) =>
      aplicar(moverJuntoA(ordenVigente, clave, claveVecina, direccion)),
    /** Soltar una fila arrastrada de `desde` a `hasta` (índices en clavesVisibles). */
    moverArrastrando: (clavesVisibles, desde, hasta) =>
      aplicar(moverArrastrando(ordenVigente, clavesVisibles, desde, hasta)),
    moverAPosicion: (clave, posicion) => aplicar(moverAPosicion(ordenVigente, clave, posicion)),
    /** Descarta el orden armado y arranca de nuevo desde el automático actual. */
    restablecer: () => guardar(construirOrdenVigente(clavesAutomaticas, [])),
  };
}
