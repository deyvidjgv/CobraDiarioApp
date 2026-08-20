import { useState, useEffect } from "react";
import { where, orderBy } from "firebase/firestore";
import {
  subscribeToCollection,
  updateDocument,
  documentRef,
  newDocRef,
  getBatch,
  runInTransaction,
  txGet,
  wSet,
  wUpdate,
} from "../firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { construirMovimiento, TIPOS_MOVIMIENTO } from "../logic/caja";
import { calcularMoraGlobal } from "../logic/mora";
import { calcularRecargo, hayCorteVencidoPendiente } from "../logic/vencimiento";
import { formatearMonto, round2 } from "../logic/formato";
import { useAudit, ACCIONES_AUDIT } from "./useAudit";

export function useLoans(filterActive = true) {
  const { orgId, usuario, isCobradiario } = useAuth();
  const { registrarEvento } = useAudit();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    const constraints = [
      ...(filterActive ? [where("estado", "==", "activo")] : []),
      ...(isCobradiario ? [where("cobradiarioId", "==", usuario.uid)] : []),
      orderBy("fechaInicio", "desc"),
    ];

    const unsub = subscribeToCollection(orgId, "loans", constraints, (docs) => {
      setLoans(docs);
      setLoading(false);
    });
    return unsub;
  }, [orgId, filterActive, isCobradiario, usuario?.uid]);

  /**
   * Crea el crédito y sus movimientos (préstamo + seguro) en un solo batch
   * atómico: antes eran 1-3 escrituras sueltas, y si la 2ª o 3ª fallaba a
   * mitad de camino quedaba un crédito activo sin su movimiento de caja
   * correspondiente (la caja del día dejaba de cuadrar con la cartera).
   */
  async function addLoan(loanData, extra = {}) {
    const { clienteNombre = null, cobradorNombre = null, skipPrestamoMovimiento = false } = extra;
    // cobradiarioId identifica al dueño operativo del crédito (Plan Maestro,
    // sección 6). Las condiciones (capital, interés, cuotas, frecuencia)
    // quedan congeladas desde aquí: firestore.rules solo deja al Admin
    // tocarlas. OJO — las reglas SÍ permiten al cobradiario escribir
    // saldoPendiente y montoTotalAPagar, así que esos dos campos deben
    // moverse únicamente a través de registerPayment/renovarCartulina,
    // que son transaccionales.
    const loanRef = newDocRef(orgId, "loans");
    const batch = getBatch();

    wSet(batch, loanRef, {
      ...loanData,
      cobradiarioId: loanData.cobradiarioId || usuario.uid,
      createdBy: usuario.uid,
    });

    const tracing = {
      clientId: loanData.clientId || null,
      cobradiarioId: loanData.cobradiarioId || usuario.uid,
      createdBy: usuario.uid,
    };

    if (!skipPrestamoMovimiento) {
      const movPrestamo = construirMovimiento({
        tipo: TIPOS_MOVIMIENTO.PRESTAMO_NUEVO,
        monto: loanData.capital,
        orgId,
        referencia: loanRef.id,
        nota: clienteNombre
          ? `Nuevo crédito - ${clienteNombre} (Capital: $${formatearMonto(loanData.capital)})`
          : `Nuevo crédito — Capital: $${formatearMonto(loanData.capital)}`,
        clienteNombre,
        cobradorNombre: cobradorNombre || null,
        ...tracing,
      });
      wSet(batch, newDocRef(orgId, "movements"), movPrestamo);
    }

    // Movimiento de seguro (ingreso que compensa el préstamo, si aplica)
    if (loanData.seguro && loanData.seguro.activo && loanData.seguro.seguroMonto > 0) {
      const movSeguro = construirMovimiento({
        tipo: TIPOS_MOVIMIENTO.SEGURO,
        monto: loanData.seguro.seguroMonto,
        orgId,
        referencia: loanRef.id,
        nota: clienteNombre ? `Seguro crédito - ${clienteNombre}` : "Seguro crédito",
        clienteNombre,
        cobradorNombre: cobradorNombre || null,
        ...tracing,
      });
      wSet(batch, newDocRef(orgId, "movements"), movSeguro);
    }

    await batch.commit();

    registrarEvento(ACCIONES_AUDIT.CREDITO_CREADO, {
      entidad: "loans",
      entidadId: loanRef.id,
      detalle: clienteNombre ? `Crédito de ${clienteNombre} — $${formatearMonto(loanData.capital)}` : null,
    });

    return loanRef;
  }

  /**
   * Registra un pago: actualiza saldo del crédito + crea movimiento cobro,
   * dentro de una transacción de Firestore. Antes leía el crédito y lo
   * escribía después por separado (getDocument + updateDocument); con dos
   * cobros casi simultáneos (doble tap, dos pestañas, reconexión de red)
   * el segundo podía pisar el resultado del primero en vez de descontarse
   * de forma acumulativa. La transacción vuelve a leer el crédito justo
   * antes de escribir y Firestore reintenta sola si algo cambió en el medio.
   */
  async function registerPayment(loanId, monto, extra = {}) {
    const { clienteNombre = null, cobradorNombre = null, metodoPago = "efectivo", skipVencimientoRecargo = false } = extra;

    const montoNum = round2(Number(monto));
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      throw new Error("El monto a cobrar debe ser un número mayor que cero.");
    }

    const loanRef = documentRef(orgId, "loans", loanId);
    const movRef = newDocRef(orgId, "movements");
    const recargoMovRef = newDocRef(orgId, "movements");

    await runInTransaction(async (tx) => {
      const loan = await txGet(tx, loanRef);
      if (!loan) throw new Error("Crédito no encontrado");

      let loanActual = loan;
      let recargoMonto = 0;

      // Aplicar recargo de vencimiento si el crédito ya está vencido y aún no se ha aplicado
      if (!skipVencimientoRecargo && hayCorteVencidoPendiente(loanActual)) {
        recargoMonto = calcularRecargo(loanActual.saldoPendiente, loanActual.vencimiento.porcentaje);
        if (recargoMonto > 0) {
          loanActual = {
            ...loanActual,
            saldoPendiente: round2((loanActual.saldoPendiente ?? 0) + recargoMonto),
            montoTotalAPagar: round2((loanActual.montoTotalAPagar ?? 0) + recargoMonto),
          };
        }
      }

      // Calcular estado previo
      const moraPrev = calcularMoraGlobal(loanActual);

      let tipoPago = "Pago de cuota";
      let detallePagoInfo = "";

      if (moraPrev.estado === "mora") {
        tipoPago = "Pago de mora";
        if (montoNum > moraPrev.deficit) {
          detallePagoInfo = `Cubrió mora ($${formatearMonto(moraPrev.deficit)}) + excedente`;
        } else {
          detallePagoInfo = `Abono a mora (Déficit era $${formatearMonto(moraPrev.deficit)})`;
        }
      } else if (montoNum > loanActual.cuota) {
        tipoPago = "Adelanto";
        const extraAdelanto = round2(montoNum - loanActual.cuota);
        detallePagoInfo = `Adelantó $${formatearMonto(extraAdelanto)}`;
      } else if (montoNum < loanActual.cuota) {
        tipoPago = "Abono parcial";
        detallePagoInfo = `Cuota es de $${formatearMonto(loanActual.cuota)}`;
      }

      // No se puede cobrar más que el saldo pendiente (ya con el recargo
      // aplicado, si tocaba). Antes el exceso entraba completo a la caja
      // mientras el crédito bajaba a 0: plata sin deuda que la respalde.
      // El tope de la pantalla usa el saldo cargado localmente, así que
      // solo aquí —dentro de la transacción, con el saldo recién leído—
      // se puede verificar de verdad.
      const saldoAntesDePagar = loanActual.saldoPendiente ?? 0;
      if (montoNum > saldoAntesDePagar) {
        throw new Error(
          `El cobro ($${formatearMonto(montoNum)}) supera el saldo pendiente ($${formatearMonto(saldoAntesDePagar)}). Revisa el monto.`
        );
      }
      const nuevoSaldo = Math.max(0, round2(saldoAntesDePagar - montoNum));

      const loanUpdates = { saldoPendiente: nuevoSaldo };
      if (nuevoSaldo <= 0) loanUpdates.estado = "completado";
      if (recargoMonto > 0) {
        loanUpdates.montoTotalAPagar = loanActual.montoTotalAPagar;
        loanUpdates["vencimiento.recargosAcumulados"] = round2(
          (loan.vencimiento?.recargosAcumulados ?? 0) + recargoMonto
        );
        loanUpdates["vencimiento.fechaUltimoRecargo"] = new Date().toISOString();
      }

      wUpdate(tx, loanRef, loanUpdates);

      // Calcular estado posterior
      const loanPost = { ...loanActual, saldoPendiente: nuevoSaldo };
      const moraPost = calcularMoraGlobal(loanPost);

      let estadoFinalLabel = "Al día";
      let detalleEstadoFinal = "";

      if (nuevoSaldo <= 0) {
        estadoFinalLabel = "Completado";
        detalleEstadoFinal = "¡Crédito pagado por completo!";
      } else if (moraPost.estado === "mora") {
        estadoFinalLabel = "En mora";
        detalleEstadoFinal = `Aún falta $${formatearMonto(moraPost.deficit)} para ponerse al día`;
      } else if (moraPost.estado === "adelantado") {
        estadoFinalLabel = "Adelantado";
        detalleEstadoFinal = `Quedó adelantado`;
      } else {
        estadoFinalLabel = "Al día";
        detalleEstadoFinal = "Quedó al día";
      }

      const mov = construirMovimiento({
        tipo: TIPOS_MOVIMIENTO.COBRO,
        monto: montoNum,
        orgId,
        referencia: loanId,
        nota: clienteNombre ? `Cobro crédito - ${clienteNombre}` : "Cobro crédito",
        clienteNombre,
        cobradorNombre: cobradorNombre || null,
        clientId: loanActual.clientId || null,
        cobradiarioId: loanActual.cobradiarioId || usuario.uid,
        createdBy: usuario.uid,
      });

      mov.tipoPago = tipoPago;
      mov.detallePagoInfo = detallePagoInfo;
      mov.estadoFinalLabel = estadoFinalLabel;
      mov.detalleEstadoFinal = detalleEstadoFinal;
      mov.saldoRestante = nuevoSaldo;
      mov.metodoPago = metodoPago;

      wSet(tx, movRef, mov);

      if (recargoMonto > 0) {
        const recargoMov = construirMovimiento({
          tipo: TIPOS_MOVIMIENTO.RECARGO_VENCIMIENTO,
          monto: 0, // No afecta la caja física
          orgId,
          referencia: loanId,
          nota: clienteNombre ? `Recargo por mora - ${clienteNombre}` : "Recargo por mora",
          clienteNombre,
          cobradorNombre: cobradorNombre || null,
          clientId: loanActual.clientId || null,
          cobradiarioId: loanActual.cobradiarioId || usuario.uid,
          createdBy: usuario.uid,
        });
        recargoMov.montoRecargo = recargoMonto;
        wSet(tx, recargoMovRef, recargoMov);
      }
    });

    registrarEvento(ACCIONES_AUDIT.COBRO_REGISTRADO, {
      entidad: "loans",
      entidadId: loanId,
      detalle: `$${formatearMonto(montoNum)} — ${clienteNombre ?? "sin nombre"}`,
    });
  }

  /**
   * Renueva una cartulina: cierra el crédito viejo y abre uno nuevo que
   * absorbe su saldo, todo en UNA transacción.
   *
   * Antes eran tres escrituras sueltas (crear crédito → movimiento de
   * entrega → cerrar el viejo). Cobrando en la calle, perder señal a
   * mitad dejaba al cliente debiendo LAS DOS cartulinas con el desembolso
   * ya contabilizado. Como la mora persistente en este negocio se maneja
   * renovando (no apilando recargos), ésta es la operación más delicada
   * del sistema y tiene que ser todo-o-nada.
   *
   * El saldo del crédito viejo se vuelve a leer aquí dentro y se compara
   * contra `saldoEsperado` (el que vio la pantalla al calcular la
   * entrega). Si otro cobro entró en el medio se aborta en vez de
   * recalcular en silencio: el cobrador ya acordó una cifra en efectivo
   * con el cliente y cambiársela a sus espaldas sería peor que fallar.
   */
  async function renovarCartulina(loanAnteriorId, nuevoLoanData, extra = {}) {
    const {
      clienteNombre = null,
      cobradorNombre = null,
      saldoEsperado,
      entregaBruta,
      notaEntrega = null,
    } = extra;

    const loanAnteriorRef = documentRef(orgId, "loans", loanAnteriorId);
    const nuevoLoanRef = newDocRef(orgId, "loans");
    const movEntregaRef = newDocRef(orgId, "movements");
    const movSeguroRef = newDocRef(orgId, "movements");

    await runInTransaction(async (tx) => {
      const anterior = await txGet(tx, loanAnteriorRef);
      if (!anterior) throw new Error("No se encontró la cartulina anterior.");
      if (anterior.estado === "completado") {
        throw new Error("Esa cartulina ya está saldada — recarga la pantalla.");
      }

      const saldoReal = anterior.saldoPendiente ?? 0;
      if (round2(saldoReal) !== round2(saldoEsperado)) {
        throw new Error(
          `El saldo cambió mientras renovabas (era $${formatearMonto(saldoEsperado)}, ahora es $${formatearMonto(saldoReal)}). ` +
            `Vuelve a empezar la renovación con el saldo correcto.`
        );
      }

      const tracing = {
        clientId: nuevoLoanData.clientId || null,
        cobradiarioId: nuevoLoanData.cobradiarioId || anterior.cobradiarioId || usuario.uid,
        createdBy: usuario.uid,
      };

      // 1. Crédito nuevo
      wSet(tx, nuevoLoanRef, {
        ...nuevoLoanData,
        cobradiarioId: tracing.cobradiarioId,
        createdBy: usuario.uid,
        renovacionDe: loanAnteriorId,
      });

      // 2. Entrega en efectivo (solo lo que sale de caja: nuevo − saldo)
      wSet(
        tx,
        movEntregaRef,
        construirMovimiento({
          tipo: TIPOS_MOVIMIENTO.PRESTAMO_NUEVO,
          monto: entregaBruta,
          orgId,
          referencia: nuevoLoanRef.id,
          nota: notaEntrega ?? "Renovación de cartulina",
          clienteNombre,
          cobradorNombre: cobradorNombre || null,
          ...tracing,
        })
      );

      // 3. Seguro de la cartulina nueva, si aplica
      const seguro = nuevoLoanData.seguro;
      if (seguro && seguro.activo && seguro.seguroMonto > 0) {
        wSet(
          tx,
          movSeguroRef,
          construirMovimiento({
            tipo: TIPOS_MOVIMIENTO.SEGURO,
            monto: seguro.seguroMonto,
            orgId,
            referencia: nuevoLoanRef.id,
            nota: clienteNombre ? `Seguro renovación - ${clienteNombre}` : "Seguro renovación",
            clienteNombre,
            cobradorNombre: cobradorNombre || null,
            ...tracing,
          })
        );
      }

      // 4. Cerrar la cartulina anterior (su saldo pasó al crédito nuevo)
      wUpdate(tx, loanAnteriorRef, { estado: "completado", saldoPendiente: 0 });
    });

    registrarEvento(ACCIONES_AUDIT.CREDITO_CREADO, {
      entidad: "loans",
      entidadId: nuevoLoanRef.id,
      detalle:
        `Renovación de ${clienteNombre ?? "cliente"} — nueva cartulina $${formatearMonto(nuevoLoanData.capital)}` +
        ` (absorbe saldo $${formatearMonto(saldoEsperado)})`,
    });

    return nuevoLoanRef;
  }

  /** Perdona el recargo de hoy actualizando la fecha, para que no vuelva a molestar */
  async function perdonarRecargoVencimiento(loanId) {
    const updates = {
      "vencimiento.fechaUltimoRecargo": new Date().toISOString()
    };
    await updateDocument(orgId, "loans", loanId, updates);
  }

  return {
    loans,
    loading,
    addLoan,
    registerPayment,
    renovarCartulina,
    perdonarRecargoVencimiento
  };
}
