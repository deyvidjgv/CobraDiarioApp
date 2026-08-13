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

  seguroMonto = Math.round(seguroMonto * 100) / 100;
  const totalARecibirCliente = capital - seguroMonto;

  return { seguroMonto, totalARecibirCliente };
}
