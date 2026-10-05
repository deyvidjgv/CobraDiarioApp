/**
 * Orden de la ruta del cobradiario.
 *
 * Por defecto el sistema decide (mora primero, ver compararPrioridad en
 * useRutaHoy.js). El cobradiario conoce su calle mejor que cualquier
 * algoritmo — cerca del cliente A, luego el que queda de paso, etc. — así
 * que puede preferir armar su propio recorrido. Ese orden manual es UNO
 * solo para toda la ruta: la lista completa y los filtros Hoy y Mora
 * muestran sus créditos en el orden del recorrido.
 *
 * El orden se guarda por CLIENTE, no por crédito: en cobro diario un
 * cliente renueva seguido, y el crédito nuevo debe heredar el lugar que
 * el cliente ya tenía en la calle en vez de irse al final. Dos créditos
 * del mismo cliente comparten lugar (es la misma casa) y quedan juntos.
 *
 * En modo manual la ruta se ve como UNA lista con todos los créditos (no
 * agrupada por día; cada fila lleva su día como etiqueta) y se reordena
 * arrastrando la fila, con flechas arriba/abajo, o llevando un cliente
 * directo a una posición.
 */
export const MODOS_ORDEN = { AUTOMATICO: "automatico", MANUAL: "manual" };

/** Clave de orden de un ítem de la ruta: su cliente. */
export const claveDeOrden = (item) => item.clientId;

/**
 * Orden vigente de la ruta: primero las claves del orden guardado que
 * siguen en la ruta, en ese orden; al final las que todavía no tienen
 * lugar (clientes nuevos), en el orden automático que ya traían. Las
 * claves guardadas que hoy no están en la ruta no cuentan aquí (pero
 * no se borran del guardado, ver fusionarConGuardado).
 * @param {string[]} clavesAutomaticas - claves en orden automático (puede haber repetidas)
 * @param {string[]} ordenGuardado - claves en el orden armado por el cobradiario
 */
export function construirOrdenVigente(clavesAutomaticas, ordenGuardado = []) {
  const presentes = new Set(clavesAutomaticas);
  const vistas = new Set();
  const orden = [];
  for (const clave of [...ordenGuardado, ...clavesAutomaticas]) {
    if (!presentes.has(clave) || vistas.has(clave)) continue;
    vistas.add(clave);
    orden.push(clave);
  }
  return orden;
}

/**
 * Orden a guardar tras reordenar: el nuevo orden vigente, con cada clave
 * que hoy no está en la ruta colgada detrás de la que la precedía en el
 * guardado. Así un cliente que terminó su crédito y renueva unos días
 * después recupera su lugar en la calle, y una lista incompleta (caché
 * offline a medio sincronizar) no borra lugares ya armados.
 */
export function fusionarConGuardado(ordenGuardado, ordenVigente) {
  const vigentes = new Set(ordenVigente);
  const colgadas = new Map(); // clave vigente (null = inicio) → ausentes que la seguían
  const vistas = new Set();
  let ancla = null;
  for (const clave of ordenGuardado) {
    if (vigentes.has(clave)) {
      ancla = clave;
      continue;
    }
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    if (!colgadas.has(ancla)) colgadas.set(ancla, []);
    colgadas.get(ancla).push(clave);
  }
  const resultado = [...(colgadas.get(null) ?? [])];
  for (const clave of ordenVigente) resultado.push(clave, ...(colgadas.get(clave) ?? []));
  return resultado;
}

/**
 * Aplica el orden manual sobre una lista ya en orden automático. Los
 * ítems sin posición en el orden quedan al final, en el orden automático
 * que ya traían entre ellos (el sort es estable).
 */
export function ordenarSegunPreferencia(items, modo, orden, clave = claveDeOrden) {
  if (modo !== MODOS_ORDEN.MANUAL || !orden || orden.length === 0) {
    return items;
  }
  const posicion = new Map(orden.map((c, i) => [c, i]));
  return [...items].sort((a, b) => {
    const pa = posicion.has(clave(a)) ? posicion.get(clave(a)) : Infinity;
    const pb = posicion.has(clave(b)) ? posicion.get(clave(b)) : Infinity;
    return pa - pb;
  });
}

/**
 * Vecino visible de una fila: la clave más cercana arriba (-1) o abajo
 * (+1) que sea de OTRO cliente. Las filas de un mismo cliente comparten
 * lugar, así que "subir" debe saltar por encima de las suyas propias.
 * @param {string[]} clavesVisibles - claves en el orden que se está mostrando
 * @returns {string | null} null si no hay a dónde moverse
 */
export function vecinoVisible(clavesVisibles, index, direccion) {
  const propia = clavesVisibles[index];
  for (let i = index + direccion; i >= 0 && i < clavesVisibles.length; i += direccion) {
    if (clavesVisibles[i] !== propia) return clavesVisibles[i];
  }
  return null;
}

/**
 * Mueve `clave` justo antes (-1) o justo después (+1) de `claveVecina`
 * dentro del orden completo. Solo cambia de lugar la clave movida: los
 * demás conservan su orden relativo, aunque no estén a la vista (otro
 * día, filtro de búsqueda, etc.).
 */
export function moverJuntoA(orden, clave, claveVecina, direccion) {
  if (clave === claveVecina || !orden.includes(clave) || !orden.includes(claveVecina)) {
    return orden;
  }
  const sinClave = orden.filter((c) => c !== clave);
  const idxVecina = sinClave.indexOf(claveVecina);
  sinClave.splice(direccion < 0 ? idxVecina : idxVecina + 1, 0, clave);
  return sinClave;
}

/**
 * Resultado de soltar una fila arrastrada: la de `desde` cae en el lugar
 * de la de `hasta` dentro de la lista visible. Bajando queda justo
 * después del cliente sobre el que se soltó; subiendo, justo antes.
 * Soltarla sobre otra fila del mismo cliente no cambia nada.
 */
export function moverArrastrando(orden, clavesVisibles, desde, hasta) {
  if (desde === hasta || desde < 0 || hasta < 0) return orden;
  return moverJuntoA(orden, clavesVisibles[desde], clavesVisibles[hasta], hasta > desde ? 1 : -1);
}

/**
 * Lleva `clave` a una posición del recorrido (1 = primero). Posiciones
 * fuera de rango se ajustan al primero o al último.
 */
export function moverAPosicion(orden, clave, posicion) {
  if (!orden.includes(clave)) return orden;
  const sinClave = orden.filter((c) => c !== clave);
  const destino = Math.min(Math.max(Math.trunc(posicion) - 1, 0), sinClave.length);
  sinClave.splice(destino, 0, clave);
  return sinClave;
}
