import { describe, expect, test } from "vitest";
import { round2, formatearMonto, limpiarMonto } from "../src/logic/formato";
import { construirMovimiento, calcularSaldo, TIPOS_MOVIMIENTO } from "../src/logic/caja";
import {
  calcularRecargo,
  hayCorteVencidoPendiente,
  calcularFechaVencimientoTotal,
} from "../src/logic/vencimiento";
import { calcularCuotasVencidas, esDiaDeCobro } from "../src/logic/frecuencia";
import { getColombiaHour, getColombiaDateKey } from "../src/logic/dateUtils";
import { calcularMoraGlobal, calcularMoraGlobalAlCierre } from "../src/logic/mora";
import { calcularTotalesCredito } from "../src/logic/credito";
import { calcularSeguro } from "../src/logic/seguro";
import {
  COLECCIONES_RESPALDO,
  serializarParaRespaldo,
  deserializarDesdeRespaldo,
  esRespaldoValido,
  resumenRespaldo,
} from "../src/logic/backup";

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

describe("frecuencia mensual: calendario, no bloques de 30 días", () => {
  // Un crédito que arranca el 31 sólo cae bien si se cuentan meses de
  // calendario: con 30 días fijos vencía el 2 de marzo, el 1 de abril...
  const inicio = new Date(2026, 0, 31); // 31 ene 2026 (2026 no es bisiesto)

  test("la cuota de febrero vence el 28, no el 2 de marzo", () => {
    // El 28 aún no cuenta como vencida (se cuenta hasta ayer); el 1 de marzo sí.
    expect(
      calcularCuotasVencidas({ fechaInicio: inicio, frecuencia: "mensual" }, new Date(2026, 1, 28))
    ).toBe(0);
    expect(
      calcularCuotasVencidas({ fechaInicio: inicio, frecuencia: "mensual" }, new Date(2026, 2, 1))
    ).toBe(1);
  });

  test("no se desfasa con los meses: la 2ª cuota es el 31 de marzo", () => {
    expect(
      calcularCuotasVencidas({ fechaInicio: inicio, frecuencia: "mensual" }, new Date(2026, 2, 31))
    ).toBe(1);
    expect(
      calcularCuotasVencidas({ fechaInicio: inicio, frecuencia: "mensual" }, new Date(2026, 3, 1))
    ).toBe(2);
  });

  test("respeta el tope de cuotas pactadas", () => {
    expect(
      calcularCuotasVencidas(
        { fechaInicio: inicio, frecuencia: "mensual", numeroCuotas: 2 },
        new Date(2027, 5, 1)
      )
    ).toBe(2);
  });

  test("un inicio a mitad de mes conserva su día", () => {
    const m = new Date(2026, 2, 15); // 15 mar
    expect(
      calcularCuotasVencidas({ fechaInicio: m, frecuencia: "mensual" }, new Date(2026, 3, 15))
    ).toBe(0);
    expect(
      calcularCuotasVencidas({ fechaInicio: m, frecuencia: "mensual" }, new Date(2026, 3, 16))
    ).toBe(1);
  });

  test("esDiaDeCobro cae en el día de calendario correcto", () => {
    const loan = { fechaInicio: inicio, frecuencia: "mensual", numeroCuotas: 3 };
    expect(esDiaDeCobro(loan, new Date(2026, 1, 28))).toBe(true); // 28 feb
    expect(esDiaDeCobro(loan, new Date(2026, 2, 2))).toBe(false); // 2 mar (lo viejo)
  });
});

describe("hora y fecha de Colombia (independientes del dispositivo)", () => {
  // Colombia es UTC-5 y no tiene horario de verano.
  const saludo = (h) => (h < 12 ? "Buenos días" : h < 18 ? "Buenas tardes" : "Buenas noches");

  test("convierte UTC a hora de Bogotá", () => {
    expect(getColombiaHour(new Date("2026-08-18T14:30:00Z"))).toBe(9);
    expect(getColombiaHour(new Date("2026-08-18T17:30:00Z"))).toBe(12);
    expect(getColombiaHour(new Date("2026-08-18T23:30:00Z"))).toBe(18);
  });

  test("la medianoche es 0 y no 24", () => {
    expect(getColombiaHour(new Date("2026-08-19T05:00:00Z"))).toBe(0);
  });

  test("el saludo cambia en los cortes de 12 y 18", () => {
    expect(saludo(getColombiaHour(new Date("2026-08-18T16:59:00Z")))).toBe("Buenos días");
    expect(saludo(getColombiaHour(new Date("2026-08-18T17:00:00Z")))).toBe("Buenas tardes");
    expect(saludo(getColombiaHour(new Date("2026-08-18T22:59:00Z")))).toBe("Buenas tardes");
    expect(saludo(getColombiaHour(new Date("2026-08-18T23:00:00Z")))).toBe("Buenas noches");
  });

  test("a las 8 p.m. en Colombia el día sigue siendo el de hoy, no el de UTC", () => {
    // Es el bug que vaciaba la caja del día: toISOString() ya decía 08-19.
    const nocheEnColombia = new Date("2026-08-19T01:00:00Z");
    expect(nocheEnColombia.toISOString().split("T")[0]).toBe("2026-08-19");
    expect(getColombiaDateKey(nocheEnColombia)).toBe("2026-08-18");
  });
});

describe("calcularFechaVencimientoTotal", () => {
  const f = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  test("mensual usa meses de calendario y recorta a fin de mes", () => {
    const fecha = calcularFechaVencimientoTotal({
      fechaInicio: new Date(2026, 0, 31),
      numeroCuotas: 3,
      frecuencia: "mensual",
    });
    expect(f(fecha)).toBe("2026-04-30"); // antes daba 2026-05-01
  });

  test("quincenal sigue siendo cada 15 días corridos", () => {
    const fecha = calcularFechaVencimientoTotal({
      fechaInicio: new Date(2026, 0, 31),
      numeroCuotas: 2,
      frecuencia: "quincenal",
    });
    expect(f(fecha)).toBe("2026-03-02");
  });

  test("una fecha 'YYYY-MM-DD' se interpreta en hora local, no UTC", () => {
    // Con new Date("2026-01-31") (UTC) en Colombia el día guardado se
    // corría al 30, y la pantalla mostraba un día distinto al almacenado.
    const fecha = calcularFechaVencimientoTotal({
      fechaInicio: "2026-01-31",
      numeroCuotas: 1,
      frecuencia: "mensual",
    });
    expect(f(fecha)).toBe("2026-02-28");
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

describe("backup (respaldo/restauración)", () => {
  // Simula un Timestamp de Firestore: cualquier objeto con .toDate()
  function fakeTimestamp(date) {
    return { toDate: () => date };
  }

  test("serializarParaRespaldo marca los Timestamp para poder reconstruirlos", () => {
    const fecha = new Date(2026, 7, 16, 10, 0, 0);
    const serializado = serializarParaRespaldo({
      nombre: "Juan",
      fecha: fakeTimestamp(fecha),
      anidado: { creadoEn: fakeTimestamp(fecha) },
      lista: [fakeTimestamp(fecha), 42],
    });
    expect(serializado.nombre).toBe("Juan");
    expect(serializado.fecha.__firestoreTimestamp).toBe(fecha.toISOString());
    expect(serializado.anidado.creadoEn.__firestoreTimestamp).toBe(fecha.toISOString());
    expect(serializado.lista[0].__firestoreTimestamp).toBe(fecha.toISOString());
    expect(serializado.lista[1]).toBe(42);
  });

  test("deserializarDesdeRespaldo reconstruye Date reales desde la marca", () => {
    const fecha = new Date(2026, 7, 16, 10, 0, 0);
    const serializado = serializarParaRespaldo({ fecha: fakeTimestamp(fecha), monto: 5000 });
    const de_vuelta = deserializarDesdeRespaldo(serializado);
    expect(de_vuelta.fecha).toBeInstanceOf(Date);
    expect(de_vuelta.fecha.getTime()).toBe(fecha.getTime());
    expect(de_vuelta.monto).toBe(5000);
  });

  test("esRespaldoValido exige tipo, exportedAt y las colecciones esperadas como arreglos", () => {
    const colecciones = Object.fromEntries(COLECCIONES_RESPALDO.map((c) => [c, []]));
    const valido = { tipo: "respaldo_credidev", exportedAt: "2026-08-16T00:00:00.000Z", colecciones };

    expect(esRespaldoValido(valido)).toBe(true);
    expect(esRespaldoValido(null)).toBe(false);
    expect(esRespaldoValido({ ...valido, tipo: "otra_cosa" })).toBe(false);
    expect(esRespaldoValido({ ...valido, exportedAt: undefined })).toBe(false);
    expect(esRespaldoValido({ ...valido, colecciones: { ...colecciones, loans: "no es arreglo" } })).toBe(
      false
    );
  });

  test("resumenRespaldo cuenta los documentos por colección", () => {
    const colecciones = Object.fromEntries(COLECCIONES_RESPALDO.map((c) => [c, []]));
    colecciones.clients = [{ id: "1" }, { id: "2" }];
    colecciones.loans = [{ id: "1" }];
    const resumen = resumenRespaldo({ colecciones });
    expect(resumen.find((r) => r.coleccion === "clients").cantidad).toBe(2);
    expect(resumen.find((r) => r.coleccion === "loans").cantidad).toBe(1);
    expect(resumen.find((r) => r.coleccion === "movements").cantidad).toBe(0);
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
