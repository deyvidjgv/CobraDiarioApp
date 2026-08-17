export function calcularSeguro(capital, seguroConfig) {
  if (!seguroConfig || !seguroConfig.activo) {
    return { seguroMonto: 0, totalARecibirCliente: capital };
  }

  let seguroMonto = 0;
  if (seguroConfig.tipo === "porcentaje") {
    seguroMonto = (capital * (seguroConfig.valor || 0)) / 100;
  } else {
    seguroMonto = seguroConfig.valor || 0;
  }

  // El seguro nunca puede ser negativo ni superar el capital: un valor de
  // configuración fuera de rango (ej. 500%) no debe dejar al cliente
  // "recibiendo" un monto negativo.
  seguroMonto = Math.min(Math.max(seguroMonto, 0), capital);
  seguroMonto = Math.round(seguroMonto * 100) / 100;
  const totalARecibirCliente = capital - seguroMonto;

  return { seguroMonto, totalARecibirCliente };
}
