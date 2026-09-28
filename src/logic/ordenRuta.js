/**
 * Orden de la cola de HOY en Ruta del Día.
 *
 * Por defecto el sistema decide (mora primero, ver compararPrioridad en
 * useRutaHoy.js). El cobradiario conoce su calle mejor que cualquier
 * algoritmo — cerca del cliente A, luego el que queda de paso, etc. — así
 * que puede preferir armar su propio orden de visita. Esa preferencia
 * solo aplica a la cola de hoy (lo único que se trabaja en el momento);
 * mañana, mora general, etc. siguen ordenados automáticamente.
 *
 * El orden manual se guarda como una lista de ids de crédito. No requiere
 * arrastrar y soltar (poco confiable en pantallas táctiles en la calle,
 * con cobertura floja): se reordena con flechas arriba/abajo por fila.
 */
export const MODOS_ORDEN = { AUTOMATICO: "automatico", MANUAL: "manual" };

/**
 * Aplica el orden manual guardado sobre una lista ya en orden automático.
 * Los ítems sin posición guardada (créditos nuevos, por ejemplo) quedan al
 * final, en el orden automático que ya traían entre ellos.
 */
export function ordenarSegunPreferencia(items, modo, ordenGuardado) {
  if (modo !== MODOS_ORDEN.MANUAL || !ordenGuardado || ordenGuardado.length === 0) {
    return items;
  }
  const posicion = new Map(ordenGuardado.map((id, i) => [id, i]));
  return [...items].sort((a, b) => {
    const pa = posicion.has(a.id) ? posicion.get(a.id) : Infinity;
    const pb = posicion.has(b.id) ? posicion.get(b.id) : Infinity;
    return pa - pb;
  });
}

/**
 * Intercambia un ítem con su vecino (arriba o abajo) dentro de la lista de
 * ids visible actualmente, y devuelve el nuevo orden completo a guardar.
 * @param {string[]} idsVisibles - ids en el orden que se está mostrando
 * @param {number} index - posición del ítem a mover
 * @param {1 | -1} direccion - -1 sube, +1 baja
 */
export function moverEnOrden(idsVisibles, index, direccion) {
  const destino = index + direccion;
  if (destino < 0 || destino >= idsVisibles.length) return idsVisibles;
  const nuevos = [...idsVisibles];
  [nuevos[index], nuevos[destino]] = [nuevos[destino], nuevos[index]];
  return nuevos;
}
