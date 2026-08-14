import { useState, useEffect } from "react";
import { where, orderBy, query, getDocs } from "firebase/firestore";
import {
  subscribeToCollection,
  addDocument,
  updateDocument,
  getDocument,
  removeDocument,
  subCollection,
} from "../firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { construirMovimiento, TIPOS_MOVIMIENTO } from "../logic/caja";
import { calcularMoraGlobal } from "../logic/mora";
import { calcularRecargo, hayCorteVencidoPendiente } from "../logic/vencimiento";
import { formatearMonto } from "../logic/formato";

export function useLoans(filterActive = true) {
  const { orgId, usuario } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    const constraints = filterActive
      ? [where("estado", "==", "activo"), orderBy("fechaInicio", "desc")]
      : [orderBy("fechaInicio", "desc")];

    const unsub = subscribeToCollection(orgId, "loans", constraints, (docs) => {
      setLoans(docs);
      setLoading(false);
    });
    return unsub;
  }, [orgId, filterActive]);

  /** Crea el crédito y registra el movimiento prestamo_nuevo en el ledger */
  async function addLoan(loanData, extra = {}) {
    const { clienteNombre = null, cobradorNombre = null, skipPrestamoMovimiento = false } = extra;
    // cobradiarioId identifica al dueño operativo del crédito (Plan Maestro,
    // sección 6); las condiciones (capital, interés, cuotas...) quedan
    // congeladas desde aquí — updateLoan solo lo puede llamar el Admin
    // (firestore.rules, inmutabilidad financiera).
    const loanRef = await addDocument(orgId, "loans", {
      ...loanData,
      cobradiarioId: loanData.cobradiarioId || usuario.uid,
      createdBy: usuario.uid,
    });

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
      });
      await addDocument(orgId, "movements", movPrestamo);
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
      });
      await addDocument(orgId, "movements", movSeguro);
    }

    return loanRef;
  }

  /** Registra un pago: actualiza saldo del crédito + crea movimiento cobro */
  async function registerPayment(loanId, monto, extra = {}) {
    const { clienteNombre = null, cobradorNombre = null, metodoPago = "efectivo", skipVencimientoRecargo = false } = extra;
    const loan = await getDocument(orgId, "loans", loanId);
    if (!loan) throw new Error("Crédito no encontrado");

    // Aplicar recargo de vencimiento si el crédito ya está vencido y aún no se ha aplicado
    if (!skipVencimientoRecargo && hayCorteVencidoPendiente(loan)) {
      const recargoMonto = calcularRecargo(loan.saldoPendiente, loan.vencimiento.porcentaje);
      if (recargoMonto > 0) {
        await aplicarRecargoVencimiento(loanId, recargoMonto, {
          clienteNombre,
          cobradorNombre,
        });
        loan.saldoPendiente = round2((loan.saldoPendiente ?? 0) + recargoMonto);
        loan.montoTotalAPagar = round2((loan.montoTotalAPagar ?? 0) + recargoMonto);
      }
    }

    // Calcular estado previo
    const moraPrev = calcularMoraGlobal(loan);

    let tipoPago = "Pago de cuota";
    let detallePagoInfo = "";

    if (moraPrev.estado === "mora") {
      tipoPago = "Pago de mora";
      if (monto > moraPrev.deficit) {
        detallePagoInfo = `Cubrió mora ($${formatearMonto(moraPrev.deficit)}) + excedente`;
      } else {
        detallePagoInfo = `Abono a mora (Déficit era $${formatearMonto(moraPrev.deficit)})`;
      }
    } else if (monto > loan.cuota) {
      tipoPago = "Adelanto";
      const extraAdelanto = round2(monto - loan.cuota);
      detallePagoInfo = `Adelantó $${formatearMonto(extraAdelanto)}`;
    } else if (monto < loan.cuota) {
      tipoPago = "Abono parcial";
      detallePagoInfo = `Cuota es de $${formatearMonto(loan.cuota)}`;
    }

    const nuevoSaldo = Math.max(0, round2((loan.saldoPendiente ?? 0) - monto));
    const updates = { saldoPendiente: nuevoSaldo };
    if (nuevoSaldo <= 0) updates.estado = "completado";

    await updateDocument(orgId, "loans", loanId, updates);

    // Calcular estado posterior
    const loanPost = { ...loan, saldoPendiente: nuevoSaldo };
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
      monto,
      orgId,
      referencia: loanId,
      nota: clienteNombre ? `Cobro crédito - ${clienteNombre}` : "Cobro crédito",
      clienteNombre,
      cobradorNombre: cobradorNombre || null,
    });

    mov.tipoPago = tipoPago;
    mov.detallePagoInfo = detallePagoInfo;
    mov.estadoFinalLabel = estadoFinalLabel;
    mov.detalleEstadoFinal = detalleEstadoFinal;
    mov.saldoRestante = nuevoSaldo;
    mov.metodoPago = metodoPago;

    await addDocument(orgId, "movements", mov);
  }

  async function updateLoan(id, data) {
    return updateDocument(orgId, "loans", id, data);
  }

  /** Aplica un recargo por vencimiento al crédito e inserta un movimiento informativo */
  async function aplicarRecargoVencimiento(loanId, recargoMonto, extra = {}) {
    const { clienteNombre = null, cobradorNombre = null } = extra;
    const loan = await getDocument(orgId, "loans", loanId);
    if (!loan) throw new Error("Crédito no encontrado");

    const nuevoSaldo = round2((loan.saldoPendiente ?? 0) + recargoMonto);
    const nuevoTotal = round2((loan.montoTotalAPagar ?? 0) + recargoMonto);
    const recargosAcumulados = round2((loan.vencimiento?.recargosAcumulados ?? 0) + recargoMonto);

    const updates = { 
      saldoPendiente: nuevoSaldo,
      montoTotalAPagar: nuevoTotal,
      "vencimiento.recargosAcumulados": recargosAcumulados,
      "vencimiento.fechaUltimoRecargo": new Date().toISOString()
    };

    await updateDocument(orgId, "loans", loanId, updates);

    // Movimiento informativo (no altera caja directamente)
    const mov = construirMovimiento({
      tipo: TIPOS_MOVIMIENTO.RECARGO_VENCIMIENTO,
      monto: 0, // No afecta la caja física
      orgId,
      referencia: loanId,
      nota: clienteNombre ? `Recargo por mora - ${clienteNombre}` : "Recargo por mora",
      clienteNombre,
      cobradorNombre: cobradorNombre || null,
    });
    mov.montoRecargo = recargoMonto;
    
    await addDocument(orgId, "movements", mov);
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
    updateLoan,
    aplicarRecargoVencimiento,
    perdonarRecargoVencimiento
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
