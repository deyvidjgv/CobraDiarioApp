import { useEffect, useState } from "react";
import { where, orderBy } from "firebase/firestore";
import {
  subscribeToCollection,
  addDocument,
  updateDocument,
  getDocument,
  documentRef,
  newDocRef,
  runInTransaction,
  txGet,
  wSet,
  wUpdate,
} from "../firebase/firestore";
import { construirMovimiento, TIPOS_MOVIMIENTO } from "../logic/caja";
import { round2, formatearMonto } from "../logic/formato";
import { useAudit, ACCIONES_AUDIT } from "./useAudit";
import { useAuth } from "../context/AuthContext";

/**
 * Solicitudes de corrección sobre un movimiento/cobro ya registrado
 * (Plan Maestro, sección 11). No se edita ni se borra el movimiento
 * original: el cobradiario (o el admin) pide la corrección con el valor
 * correcto y el motivo, y el Admin la aprueba o rechaza. Al aprobar se
 * crea un movimiento de ajuste que compensa la diferencia en caja, dejando
 * el original intacto y la corrección trazable. Si el movimiento corregido
 * era un cobro ligado a un crédito, también se ajusta `saldoPendiente` del
 * crédito por la misma diferencia — de lo contrario la caja queda cuadrada
 * pero el cliente sigue debiendo (o pagado de más) según el monto original
 * equivocado.
 */
export function useCorrections() {
  const { orgId, usuario, isCobradiario, isAdmin } = useAuth();
  const { registrarEvento } = useAudit();
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    // "Las reglas no son filtros": el cobradiario solo puede leer sus
    // propias solicitudes, así que la query debe filtrar por creador.
    const unsub = subscribeToCollection(
      orgId,
      "correctionRequests",
      [
        ...(isCobradiario ? [where("createdBy", "==", usuario.uid)] : []),
        orderBy("createdAt", "desc"),
      ],
      (docs) => {
        setCorrections(docs);
        setLoading(false);
      }
    );
    return unsub;
  }, [orgId, isCobradiario, usuario?.uid]);

  async function solicitarCorreccion({ movementId, valorOriginal, valorCorrecto, motivo }) {
    // Caja.jsx solo ofrece corregir movimientos de tipo COBRO, que siempre
    // tienen monto positivo — de ahí que el valor corregido no pueda ser
    // negativo. Cero sí se acepta: es "este cobro nunca ocurrió" (los
    // movimientos no se borran, se corrigen).
    const correcto = round2(Number(valorCorrecto));
    if (!Number.isFinite(correcto) || correcto < 0) {
      throw new Error("El valor corregido debe ser un número mayor o igual que cero.");
    }

    // Se contrasta contra el movimiento real antes de crear la solicitud:
    // el `valorOriginal` que llega por parámetro lo eligió quien pide la
    // corrección, y de ese número sale la diferencia que después mueve la
    // caja y el saldo del crédito.
    const movimiento = await getDocument(orgId, "movements", movementId);
    if (!movimiento) {
      throw new Error("No se encontró el movimiento que quieres corregir.");
    }
    const montoReal = round2(Number(movimiento.monto ?? 0));
    if (montoReal !== round2(Number(valorOriginal))) {
      throw new Error(
        `Ese movimiento vale $${formatearMonto(montoReal)}, no $${formatearMonto(valorOriginal)}. Recarga la pantalla e inténtalo de nuevo.`
      );
    }
    // Un cobrador solo corrige lo suyo. Las reglas de Firestore no pueden
    // verificarlo (nunca dereferencian el movementId), así que sin esto
    // podía pedir una corrección sobre el movimiento de otro cobrador y,
    // al aprobarla el Admin, el ajuste caía en la caja del otro.
    if (!isAdmin && movimiento.cobradiarioId !== usuario.uid) {
      throw new Error("Solo puedes pedir correcciones sobre tus propios movimientos.");
    }

    // Sin esto se podían acumular varias solicitudes pendientes sobre el
    // mismo cobro — la lista ya está suscrita en tiempo real, así que se
    // verifica contra lo que el hook ya tiene cargado, sin lectura extra.
    const yaHayPendiente = corrections.some(
      (c) => c.movementId === movementId && c.estado === "pendiente"
    );
    if (yaHayPendiente) {
      throw new Error(
        "Ya hay una solicitud pendiente sobre este cobro. Espera a que se resuelva antes de pedir otra."
      );
    }

    const ref = await addDocument(orgId, "correctionRequests", {
      movementId,
      valorOriginal: montoReal, // el verificado, no el que llegó por parámetro
      valorCorrecto: correcto,
      motivo,
      estado: "pendiente",
      createdBy: usuario.uid,
      // Denormalizado desde el movimiento para que Correcciones.jsx y la
      // auditoría muestren a quién corresponde sin releer nada.
      clienteNombre: movimiento.clienteNombre || null,
      cobradorNombre: movimiento.cobradorNombre || null,
      // Id además del nombre: filtrar por nombre de texto es frágil si dos
      // cobradores comparten nombre.
      cobradorId: movimiento.cobradiarioId || null,
    });
    registrarEvento(ACCIONES_AUDIT.CORRECCION_SOLICITADA, {
      entidad: "correctionRequests",
      entidadId: ref.id,
      detalle: `Cobro de ${movimiento.clienteNombre || "cliente"}: $${montoReal} → $${correcto}. ${motivo}`,
    });
    return ref;
  }

  /**
   * Aprobar una corrección es una operación financiera (ajusta caja y el
   * saldo del crédito), así que corre dentro de una transacción que vuelve
   * a leer `correctionRequests/{id}` y aborta si ya no está "pendiente" —
   * sin esto, dos aprobaciones casi simultáneas (dos admins, o la misma
   * sesión en dos pestañas) duplicarían el movimiento de ajuste y
   * descontarían el saldo del crédito dos veces.
   */
  async function aprobarCorreccion(request) {
    const requestRef = documentRef(orgId, "correctionRequests", request.id);
    const ajusteRef = newDocRef(orgId, "movements");

    const resultado = await runInTransaction(async (tx) => {
      // ── Lecturas (Firestore exige todas antes de cualquier escritura) ──
      const reqActual = await txGet(tx, requestRef);
      if (!reqActual) throw new Error("La solicitud de corrección ya no existe.");
      if (reqActual.estado !== "pendiente") {
        throw new Error(`Esta solicitud ya fue resuelta (${reqActual.estado}).`);
      }

      // Los montos salen del documento releído aquí dentro, no del objeto
      // que traía la pantalla: lo que se aplica es lo que está guardado,
      // no lo que el Admin alcanzó a ver.
      const valorOriginal = round2(Number(reqActual.valorOriginal ?? 0));
      const valorCorrecto = round2(Number(reqActual.valorCorrecto ?? 0));
      if (!Number.isFinite(valorCorrecto) || valorCorrecto < 0) {
        throw new Error("La solicitud tiene un valor corregido inválido.");
      }
      const diferencia = round2(valorCorrecto - valorOriginal);

      const movRef = documentRef(orgId, "movements", reqActual.movementId);
      const movOriginal = await txGet(tx, movRef);
      if (!movOriginal) {
        throw new Error("El movimiento que se quiere corregir ya no existe.");
      }
      // Se vuelve a contrastar aquí, no solo al pedirla: es el número del
      // que sale la diferencia que mueve caja y saldo, y hasta ahora nadie
      // lo comparaba nunca contra el monto real del movimiento.
      if (round2(Number(movOriginal.monto ?? 0)) !== valorOriginal) {
        throw new Error(
          `El movimiento vale $${formatearMonto(movOriginal.monto ?? 0)}, pero la solicitud declara $${formatearMonto(valorOriginal)}. Recházala.`
        );
      }

      // Solo un cobro ligado a un crédito mueve saldoPendiente; gasto/base/
      // ajuste no tienen crédito asociado y no deben tocar loans.
      const loanId =
        movOriginal.tipo === TIPOS_MOVIMIENTO.COBRO && movOriginal.referencia
          ? movOriginal.referencia
          : null;

      let saldoAntes = null;
      let saldoDespues = null;

      if (diferencia !== 0 && loanId) {
        const loanRef = documentRef(orgId, "loans", loanId);
        const loan = await txGet(tx, loanRef);
        if (!loan) throw new Error("El crédito asociado a ese cobro ya no existe.");

        // El crédito debe ser del mismo cliente y del mismo cobrador que el
        // movimiento. Sin este cruce, un movimiento con `referencia`
        // apuntando a otro lado ajustaría el saldo de un crédito ajeno.
        if (movOriginal.clientId && loan.clientId !== movOriginal.clientId) {
          throw new Error("El cobro y el crédito no son del mismo cliente.");
        }
        if (movOriginal.cobradiarioId && loan.cobradiarioId !== movOriginal.cobradiarioId) {
          throw new Error("El cobro y el crédito no son del mismo cobrador.");
        }

        saldoAntes = loan.saldoPendiente ?? 0;
        // Igual que al registrar un cobro, no se puede dejar el crédito
        // pagado de más. Antes esto se recortaba a 0 en silencio mientras
        // la caja recibía la diferencia completa: las dos cifras quedaban
        // contando historias distintas.
        if (diferencia > saldoAntes) {
          throw new Error(
            `La corrección descontaría $${formatearMonto(diferencia)} pero el crédito solo debe $${formatearMonto(saldoAntes)}.`
          );
        }
        saldoDespues = round2(saldoAntes - diferencia);

        const loanUpdates = { saldoPendiente: saldoDespues };
        if (saldoDespues <= 0) loanUpdates.estado = "completado";
        else if (loan.estado === "completado") loanUpdates.estado = "activo";
        wUpdate(tx, loanRef, loanUpdates);
      }

      // ── Escrituras ──
      if (diferencia !== 0) {
        const ajuste = construirMovimiento({
          tipo: TIPOS_MOVIMIENTO.AJUSTE,
          monto: diferencia,
          orgId,
          referencia: reqActual.movementId,
          nota: `Corrección aprobada: ${reqActual.motivo}`,
          clientId: movOriginal.clientId ?? null,
          cobradiarioId: movOriginal.cobradiarioId || null,
          createdBy: usuario.uid,
        });
        // Denormalizado para que Caja.jsx pueda mostrar el desglose sin releer.
        ajuste.valorOriginal = valorOriginal;
        ajuste.valorCorrecto = valorCorrecto;
        // Sin esto, Entradas/Salidas clasifican el ajuste solo por el signo
        // del monto: una corrección a la baja sobre un cobro caía dentro de
        // "Salidas" junto a préstamos y gastos, como si se hubiera prestado
        // o gastado más — cuando en realidad se cobró menos.
        ajuste.tipoOriginal = movOriginal.tipo;
        wSet(tx, ajusteRef, ajuste);
      }

      wUpdate(tx, requestRef, {
        estado: "aprobada",
        resolvedBy: usuario.uid,
        resolvedAt: new Date().toISOString(),
        ...(loanId ? { loanId, saldoAntes, saldoDespues } : {}),
      });

      return {
        loanId,
        saldoAntes,
        saldoDespues,
        diferencia,
        motivo: reqActual.motivo,
        movementId: reqActual.movementId,
        clienteNombre: movOriginal.clienteNombre || null,
        cobradorNombre: movOriginal.cobradorNombre || null,
      };
    });

    registrarEvento(ACCIONES_AUDIT.CORRECCION_APROBADA, {
      entidad: "correctionRequests",
      entidadId: request.id,
      detalle:
        `Ajuste de $${resultado.diferencia} sobre cobro de ${resultado.clienteNombre || "cliente"}` +
        (resultado.cobradorNombre ? ` (cobrador ${resultado.cobradorNombre})` : "") +
        `.` +
        (resultado.loanId ? ` Saldo crédito: $${resultado.saldoAntes} → $${resultado.saldoDespues}.` : "") +
        ` ${resultado.motivo}`,
    });
  }

  async function rechazarCorreccion(request, motivoRechazo = "") {
    registrarEvento(ACCIONES_AUDIT.CORRECCION_RECHAZADA, {
      entidad: "correctionRequests",
      entidadId: request.id,
      detalle: motivoRechazo || request.motivo,
    });
    return updateDocument(orgId, "correctionRequests", request.id, {
      estado: "rechazada",
      motivoRechazo,
      resolvedBy: usuario.uid,
      resolvedAt: new Date().toISOString(),
    });
  }

  return { corrections, loading, solicitarCorreccion, aprobarCorreccion, rechazarCorreccion };
}
