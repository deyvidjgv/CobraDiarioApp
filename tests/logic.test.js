import { describe, expect, test } from "vitest";
import { round2, formatearMonto, limpiarMonto } from "../src/logic/formato";
import { construirMovimiento, calcularSaldo, TIPOS_MOVIMIENTO } from "../src/logic/caja";
import { calcularRecargo, hayCorteVencidoPendiente } from "../src/logic/vencimiento";
import { calcularCuotasVencidas, esDiaDeCobro } from "../src/logic/frecuencia";
import { calcularMoraGlobal, calcularMoraGlobalAlCierre } from "../src/logic/mora";
import { calcularTotalesCredito } from "../src/logic/credito";
import { calcularSeguro } from "../src/logic/seguro";

describe("round2", () => {
  test("redondea a dos decimales sin errores de coma flotante", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(2.675)).toBe(2.68);
    expect(round2(10)).toBe(10);
    expect(round2(-2.5)).toBe(-2.5);
  });
});

describe("formatearMonto / limpiarMonto", () => {
  test("formatea miles con punto y sin decimales (es-CO)", () => {
    expect(formatearMonto(40000)).toBe("40.000");
    expect(formatearMonto(1234.5)).toBe("1.235"); // redondea, no usa decimales
    expect(formatearMonto(null)).toBe("0");
  });

  test("limpiarMonto extrae los dígitos como entero", () => {
    expect(limpiarMonto("40.000")).toBe(40000);
    expect(limpiarMonto("$1.500")).toBe(1500);
    expect(limpiarMonto("abc")).toBe("");
  });
});

describe("construirMovimiento (trazabilidad e inmutabilidad)", () => {
  test("un cobro es entrada positiva y lleva cobradiarioId/createdBy/clientId", () => {
    const mov = construirMovimiento({
      tipo: TIPOS_MOVIMIENTO.COBRO,
      monto: 50000,
      orgId: "org-1",
      clientId: "cli-1",
      cobradiarioId: "cob-1",
      createdBy: "usr-1",
    });
    expect(mov.monto).toBe(50000);
    expect(mov.clientId).toBe("cli-1");
    expect(mov.cobradiarioId).toBe("cob-1");
    expect(mov.createdBy).toBe("usr-1");
    expect(mov.orgId).toBe("org-1");
    expect(mov.fecha).toBeInstanceOf(Date);
  });

  test("un préstamo nuevo es salida negativa", () => {
    const mov = construirMovimiento({
      tipo: TIPOS_MOVIMIENTO.PRESTAMO_NUEVO,
      monto: 100000,
      orgId: "org-1",
    });
    expect(mov.monto).toBe(-100000);
  });

  test("un ajuste conserva el signo tal cual (puede ser + o -)", () => {
    const pos = construirMovimiento({ tipo: TIPOS_MOVIMIENTO.AJUSTE, monto: 3000, orgId: "o" });
    const neg = construirMovimiento({ tipo: TIPOS_MOVIMIENTO.AJUSTE, monto: -3000, orgId: "o" });
    expect(pos.monto).toBe(3000);
    expect(neg.monto).toBe(-3000);
  });

  test("recargo de vencimiento no afecta la caja física (monto 0)", () => {
    const mov = construirMovimiento({ tipo: TIPOS_MOVIMIENTO.RECARGO_VENCIMIENTO, monto: 0, orgId: "o" });
    expect(mov.monto).toBe(0);
  });
});

describe("calcularSaldo", () => {
  test("es tolerante a montos faltantes (null-safety)", () => {
    expect(calcularSaldo([{ monto: 100 }, { monto: null }, { monto: -30 }])).toBe(70);
  });

  test("lista vacía da saldo 0", () => {
    expect(calcularSaldo([])).toBe(0);
  });
});

describe("vencimiento", () => {
  test("calcularRecargo usa porcentaje sobre el saldo", () => {
    expect(calcularRecargo(100000, 20)).toBe(20000);
    expect(calcularRecargo(33333, 10)).toBe(3333.3);
  });

  test("no hay corte pendiente si el próximo corte es futuro", () => {
    const loan = {
      saldoPendiente: 50000,
      vencimiento: { activo: true, proximoCorte: "2999-01-01" },
    };
    expect(hayCorteVencidoPendiente(loan)).toBe(false);
  });

  test("hay corte pendiente si ya pasó y nunca se aplicó recargo", () => {
    const loan = {
      saldoPendiente: 50000,
      vencimiento: { activo: true, proximoCorte: "2000-01-01", fechaUltimoRecargo: null },
    };
    expect(hayCorteVencidoPendiente(loan)).toBe(true);
  });

  test("sin deuda no hay recargo pendiente", () => {
    const loan = {
      saldoPendiente: 0,
      vencimiento: { activo: true, proximoCorte: "2000-01-01" },
    };
    expect(hayCorteVencidoPendiente(loan)).toBe(false);
  });
});

describe("frecuencia (cuotas vencidas cuentan hasta ayer)", () => {
  // Fechas con componentes locales (new Date(y, m, d)) para que el test
  // no dependa de la zona horaria donde corra.
  const hoy = new Date(2026, 7, 16, 10, 0, 0); // 16 ago 2026

  test("diario: cuenta días hábiles desde el inicio hasta ayer", () => {
    // 6→15 de agosto 2026, L-S hábiles: 9 días (el 9 es domingo)
    const inicio = new Date(2026, 7, 6);
    expect(calcularCuotasVencidas({ fechaInicio: inicio, frecuencia: "diario" }, hoy)).toBe(9);
  });

  test("semanal: 21 días transcurridos ⇒ 3 vencidas hasta ayer", () => {
    const inicio = new Date(2026, 6, 25);
    expect(calcularCuotasVencidas({ fechaInicio: inicio, frecuencia: "semanal" }, hoy)).toBe(3);
  });

  test("nunca supera el número de cuotas pactadas", () => {
    const inicio = new Date(2026, 0, 1);
    expect(
      calcularCuotasVencidas({ fechaInicio: inicio, frecuencia: "diario", numeroCuotas: 5 }, hoy)
    ).toBe(5);
  });

  test("crédito iniciado hoy todavía no tiene cuotas vencidas", () => {
    expect(
      calcularCuotasVencidas({ fechaInicio: new Date(2026, 7, 16), frecuencia: "diario" }, hoy)
    ).toBe(0);
  });
});

describe("esDiaDeCobro (ruta del día)", () => {
  const hoy = new Date(2026, 7, 16, 10, 0, 0); // domingo 16 ago 2026

  test("domingo no es día de cobro para un diario L-S", () => {
    expect(
      esDiaDeCobro({ fechaInicio: new Date(2026, 7, 6), frecuencia: "diario" }, hoy)
    ).toBe(false);
  });

  test("domingo sí es día de cobro si está entre los días hábiles", () => {
    expect(
      esDiaDeCobro(
        { fechaInicio: new Date(2026, 7, 6), frecuencia: "diario", diasHabiles: [0, 1, 2, 3, 4, 5, 6] },
        hoy
      )
    ).toBe(true);
  });

  test("semanal: toca cuando se cumple una semana exacta", () => {
    expect(esDiaDeCobro({ fechaInicio: new Date(2026, 7, 9), frecuencia: "semanal" }, hoy)).toBe(true);
    expect(esDiaDeCobro({ fechaInicio: new Date(2026, 7, 8), frecuencia: "semanal" }, hoy)).toBe(false);
  });

  test("pasada la última cuota ya no hay día de cobro", () => {
    const base = { fechaInicio: new Date(2026, 7, 5), frecuencia: "diario", diasHabiles: [0, 1, 2, 3, 4, 5, 6] };
    expect(esDiaDeCobro({ ...base, numeroCuotas: 12 }, hoy)).toBe(true); // hoy es la última
    expect(esDiaDeCobro({ ...base, numeroCuotas: 11 }, hoy)).toBe(false); // calendario agotado
  });
});

describe("calcularTotalesCredito", () => {
  test("capital + interés dividido en cuotas", () => {
    const t = calcularTotalesCredito(200000, 20, 2);
    expect(t.montoTotalAPagar).toBe(240000);
    expect(t.cuota).toBe(120000);
    expect(t.saldoPendiente).toBe(240000);
  });

  test("rechaza numeroCuotas = 0 en vez de producir Infinity", () => {
    expect(() => calcularTotalesCredito(200000, 20, 0)).toThrow();
  });

  test("rechaza numeroCuotas negativo", () => {
    expect(() => calcularTotalesCredito(200000, 20, -1)).toThrow();
  });
});

describe("calcularSeguro", () => {
  test("seguro tipo porcentaje se calcula sobre el capital", () => {
    const { seguroMonto, totalARecibirCliente } = calcularSeguro(200000, {
      activo: true,
      tipo: "porcentaje",
      valor: 5,
    });
    expect(seguroMonto).toBe(10000);
    expect(totalARecibirCliente).toBe(190000);
  });

  test("seguro inactivo no descuenta nada", () => {
    expect(calcularSeguro(200000, { activo: false }).seguroMonto).toBe(0);
  });

  test("un porcentaje fuera de rango (>100%) no deja totalARecibirCliente negativo", () => {
    const { seguroMonto, totalARecibirCliente } = calcularSeguro(200000, {
      activo: true,
      tipo: "porcentaje",
      valor: 500,
    });
    expect(seguroMonto).toBe(200000);
    expect(totalARecibirCliente).toBe(0);
  });

  test("un monto fijo mayor al capital se recorta al capital", () => {
    const { seguroMonto, totalARecibirCliente } = calcularSeguro(50000, {
      activo: true,
      tipo: "fijo",
      valor: 999999,
    });
    expect(seguroMonto).toBe(50000);
    expect(totalARecibirCliente).toBe(0);
  });
});

describe("calcularCuotasVencidas con frecuencia desconocida", () => {
  test("no revienta la app: trata el crédito como sin cuotas vencidas", () => {
    const inicio = new Date(2026, 0, 1);
    const hoy = new Date(2026, 7, 16);
    expect(
      calcularCuotasVencidas({ fechaInicio: inicio, frecuencia: "quincenal-legacy" }, hoy)
    ).toBe(0);
  });
});

describe("calcularMoraGlobalAlCierre (incluye la cuota de hoy)", () => {
  const hoy = new Date(2026, 7, 16, 10, 0, 0); // domingo 16 ago 2026

  test("al día hasta ayer pero con cuota pendiente hoy ⇒ deficit al cierre", () => {
    const loan = {
      fechaInicio: new Date(2026, 7, 6),
      frecuencia: "diario",
      diasHabiles: [0, 1, 2, 3, 4, 5, 6], // calendario continuo: 10 cuotas hasta ayer
      cuota: 10000,
      montoTotalAPagar: 200000,
      saldoPendiente: 100000, // pagado 100000 = 10 cuotas exactas
    };
    expect(calcularMoraGlobal(loan, hoy).estado).toBe("al_dia");
    const alCierre = calcularMoraGlobalAlCierre(loan, hoy);
    expect(alCierre.deficit).toBe(10000); // la cuota de hoy
  });

  test("un adelanto que cubre la cuota de hoy deja deficit en cero o negativo", () => {
    const loan = {
      fechaInicio: new Date(2026, 7, 6),
      frecuencia: "diario",
      diasHabiles: [0, 1, 2, 3, 4, 5, 6],
      cuota: 10000,
      montoTotalAPagar: 200000,
      saldoPendiente: 80000, // pagado 120000 = 12 cuotas, una de más
    };
    const alCierre = calcularMoraGlobalAlCierre(loan, hoy);
    expect(alCierre.estado).toBe("adelantado");
    expect(alCierre.deficit).toBe(-10000);
  });
});
