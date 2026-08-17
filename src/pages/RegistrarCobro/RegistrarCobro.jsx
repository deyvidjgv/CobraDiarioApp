import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/layout/Header";
import Badge from "../../components/ui/Badge";
import PaymentHistoryList from "../../components/ui/PaymentHistoryList";
import { useLoans } from "../../hooks/useLoans";
import { useClients } from "../../hooks/useClients";
import { usePaymentHistory } from "../../hooks/usePaymentHistory";
import { useVisits, RESULTADOS_VISITA } from "../../hooks/useVisits";
import { calcularMoraGlobal } from "../../logic/mora";
import { calcularRecargo, esCreditoVencido, hayCorteVencidoPendiente } from "../../logic/vencimiento";
import { calcularTotalesCredito, construirCredito } from "../../logic/credito";
import { calcularSeguro } from "../../logic/seguro";
import { construirMovimiento, TIPOS_MOVIMIENTO } from "../../logic/caja";
import { formatearMonto, limpiarMonto, bloquearEntradaSoloNumeros, round2 } from "../../logic/formato";
import { getDocument, addDocument, getSettings } from "../../firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { IconCheck, IconMapPin, IconAlertTriangle, IconRefresh } from "@tabler/icons-react";

const ETIQUETA_FRECUENCIA = {
  diario: "diarias",
  semanal: "semanales",
  quincenal: "quincenales",
  mensual: "mensuales",
};

export default function RegistrarCobro() {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const { orgId, usuario, isAdmin } = useAuth();
  const { registerPayment, addLoan, updateLoan } = useLoans();
  const { clients, updateClient } = useClients();
  const { payments, loading: paymentsLoading } = usePaymentHistory(loanId);
  const { registrarVisita } = useVisits();

  const [loan, setLoan] = useState(null);
  const [monto, setMonto] = useState("");
  const [editingMonto, setEditingMonto] = useState(false);
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [loading, setLoading] = useState(true);
  const montoInicializado = useRef(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [capturingGps, setCapturingGps] = useState(false);
  const [settings, setSettings] = useState({});
  const [montoSolicitado, setMontoSolicitado] = useState("");
  const [renewCuotas, setRenewCuotas] = useState("1");

  useEffect(() => {
    if (!orgId) return;
    getSettings(orgId).then((s) => setSettings(s || {}));
  }, [orgId]);

  useEffect(() => {
    if (!orgId || !loanId) return;
    
    async function cargarYVerificar() {
      try {
        const doc = await getDocument(orgId, "loans", loanId);
        if (!doc) {
          setLoading(false);
          return;
        }

        setLoan(doc);
        if (doc && !montoInicializado.current) {
          const mora = calcularMoraGlobal(doc);
          const saldoReal = doc.saldoPendiente ?? 0;
          const montoSugerido = esCreditoVencido(doc) ? saldoReal : mora.estado === "mora" ? mora.deficit : doc.cuota;
          setMonto(String(Math.min(montoSugerido, saldoReal)));
          setRenewCuotas(String(doc.numeroCuotas ?? 1));
          montoInicializado.current = true;
        }
      } catch (err) {
        console.error("Error cargando crédito:", err);
      } finally {
        setLoading(false);
      }
    }

    cargarYVerificar();
  }, [orgId, loanId]);

  const client = clients.find((c) => c.id === loan?.clientId);
  const creditoVencido = loan ? esCreditoVencido(loan) : false;
  const recargoPendiente = loan ? hayCorteVencidoPendiente(loan) : false;
  const recargoPorcentaje = loan?.vencimiento?.porcentaje ?? 0;
  const recargoCalculado = loan ? calcularRecargo(loan.saldoPendiente ?? 0, recargoPorcentaje) : 0;

  // ─── Renovación de cartulina (disponible en cualquier momento) ───
  // Entrega = monto nuevo solicitado − saldo pendiente − seguro (sobre el
  // monto nuevo). La nueva cartulina se crea por el monto solicitado + el
  // seguro: a diferencia de un crédito nuevo (donde el seguro solo reduce
  // lo entregado en efectivo), en la renovación el seguro SÍ se suma a lo
  // que el cliente queda debiendo — así lo pidió el usuario explícitamente.
  const montoNuevo = montoSolicitado ? Number(montoSolicitado) || 0 : 0;
  const cuotasRenovNum = Number(renewCuotas) || 0;
  const saldoActualRenov = loan?.saldoPendiente ?? 0;
  const interesRenov = settings.interesDefault ?? 20;
  const seguroRenovConfig = settings.seguroActivo
    ? { activo: true, tipo: settings.seguroTipo, valor: settings.seguroValor }
    : { activo: false };
  const { seguroMonto: seguroRenov } = calcularSeguro(montoNuevo, seguroRenovConfig);
  const entregaRenov = montoNuevo > 0 ? montoNuevo - saldoActualRenov - seguroRenov : null;

  function calcularTotalesRenovacion(monto, cuotas, interesPct, seguroMonto) {
    if (!monto || !cuotas) return null;
    const base = calcularTotalesCredito(monto, interesPct, cuotas);
    const montoTotalAPagar = round2(base.montoTotalAPagar + seguroMonto);
    return {
      montoTotalAPagar,
      cuota: round2(montoTotalAPagar / cuotas),
      saldoPendiente: montoTotalAPagar,
    };
  }

  const totalesRenovacion = calcularTotalesRenovacion(montoNuevo, cuotasRenovNum, interesRenov, seguroRenov);

  function handleCaptureCurrentGps() {
    if (!client?.id) return;
    if (!navigator.geolocation) {
      alert("Geolocalización no disponible.");
      return;
    }
    setCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        updateClient(client.id, { ubicacion: { lat: latitude, lng: longitude } })
          .then(() => alert("Ubicación del cliente guardada con éxito."))
          .catch((e) => alert("Error guardando ubicación: " + e.message))
          .finally(() => setCapturingGps(false));
      },
      (err) => {
        alert("No se pudo obtener la ubicación: " + err.message);
        setCapturingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  /**
   * Renovar cartulina: cierra este crédito y crea uno nuevo por el monto
   * solicitado. El cliente recibe en efectivo el monto nuevo MENOS el
   * saldo pendiente y el seguro (calculado sobre el monto nuevo).
   * Disponible en cualquier momento — no exige esperar el vencimiento.
   */
  async function handleRenovarCartulina() {
    if (!loan) return;
    const nuevo = montoSolicitado ? Number(montoSolicitado) : 0;
    const saldo = loan.saldoPendiente ?? 0;

    if (!nuevo || nuevo <= 0) {
      alert("Ingresa el monto nuevo solicitado.");
      return;
    }
    if (nuevo < saldo) {
      alert(
        `El monto nuevo ($${formatearMonto(nuevo)}) no puede ser menor que el saldo pendiente ($${formatearMonto(saldo)}).`
      );
      return;
    }
    if (!cuotasRenovNum || cuotasRenovNum < 1) {
      alert("Indica el número de cuotas de la nueva cartulina.");
      return;
    }

    setSaving(true);
    try {
      const vencimientoConfig = settings.vencimientoActivo
        ? {
            activo: true,
            modoInicial: settings.vencimientoModoInicial,
            porcentaje: settings.vencimientoPorcentaje,
          }
        : { activo: false };

      const nuevoLoan = construirCredito(
        {
          clientId: loan.clientId,
          capital: nuevo,
          interes: interesRenov,
          numeroCuotas: cuotasRenovNum,
          frecuencia: loan.frecuencia,
          diasHabiles: loan.diasHabiles ?? [1, 2, 3, 4, 5, 6],
          fechaInicio: new Date().toISOString(),
          seguro: seguroRenovConfig,
          vencimiento: vencimientoConfig,
        },
        settings
      );

      // El seguro se suma al total a pagar de la nueva cartulina (no solo
      // se resta de lo entregado en efectivo) — mismo cálculo que el preview.
      const totalesFinal = calcularTotalesRenovacion(nuevo, cuotasRenovNum, interesRenov, seguroRenov);
      nuevoLoan.montoTotalAPagar = totalesFinal.montoTotalAPagar;
      nuevoLoan.cuota = totalesFinal.cuota;
      nuevoLoan.saldoPendiente = totalesFinal.saldoPendiente;

      const ref = await addLoan(nuevoLoan, {
        clienteNombre: client?.nombre ?? null,
        cobradorNombre: usuario?.displayName ?? null,
        skipPrestamoMovimiento: true,
      });

      // De caja solo sale lo entregado: monto nuevo − saldo pendiente.
      // (El seguro lo registra addLoan como entrada aparte.)
      const entregaBruta = nuevo - saldo;
      await addDocument(
        orgId,
        "movements",
        construirMovimiento({
          tipo: TIPOS_MOVIMIENTO.PRESTAMO_NUEVO,
          monto: entregaBruta,
          orgId,
          referencia: ref.id,
          nota: `Renovación cartulina — solicitado $${formatearMonto(nuevo)} − saldo $${formatearMonto(saldo)}`,
          clienteNombre: client?.nombre ?? null,
          cobradorNombre: usuario?.displayName ?? null,
          clientId: loan.clientId,
          cobradiarioId: loan.cobradiarioId || usuario.uid,
          createdBy: usuario.uid,
        })
      );

      await updateLoan(loanId, { estado: "completado", saldoPendiente: 0 });

      alert(
        `Cartulina renovada. Entrega al cliente: $${formatearMonto(entregaBruta - seguroRenov)}${
          seguroRenov > 0 ? ` (neto tras seguro de $${formatearMonto(seguroRenov)})` : ""
        }.`
      );
      navigate("/ruta", { replace: true });
    } catch (err) {
      alert("Error al renovar cartulina: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCobro(e) {
    e.preventDefault();

    const montoReal = limpiarMonto(monto);
    if (!montoReal || Number(montoReal) <= 0) return;

    setSaving(true);
    try {
      await registerPayment(loanId, montoReal, {
        clienteNombre: client?.nombre ?? null,
        cobradorNombre: usuario?.displayName ?? null,
        metodoPago,
      });

      // Visita de ruta (Fase 8): la gestión queda registrada con GPS.
      // Si falla no bloquea el cobro, que ya quedó registrado.
      try {
        await registrarVisita({
          clientId: loan?.clientId ?? null,
          loanId,
          resultado: RESULTADOS_VISITA.COBRO,
          nota: `Cobro de $${formatearMonto(montoReal)} (${metodoPago})`,
        });
      } catch (visitErr) {
        console.warn("No se pudo registrar la visita:", visitErr);
      }

      const updatedLoan = await getDocument(orgId, "loans", loanId);
      if (updatedLoan) {
        setLoan(updatedLoan);
        const mora = calcularMoraGlobal(updatedLoan);
        const saldoReal = updatedLoan.saldoPendiente ?? 0;
        const montoSugerido = esCreditoVencido(updatedLoan)
          ? saldoReal
          : mora.estado === "mora"
          ? mora.deficit
          : updatedLoan.cuota;
        setMonto(String(Math.min(montoSugerido, saldoReal)));
      }

      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } catch (err) {
      alert("Error al registrar cobro: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Registrar cobro" showBack />
        <p className="p-6 text-sm text-primary-light/70">Cargando crédito...</p>
      </>
    );
  }

  if (!loan) {
    return (
      <>
        <Header title="Registrar cobro" showBack />
        <p className="p-6 text-sm text-mora/80">Crédito no encontrado</p>
      </>
    );
  }

  const pagado = loan.montoTotalAPagar - (loan.saldoPendiente ?? 0);
  const progreso = Math.min(100, Math.round((pagado / loan.montoTotalAPagar) * 100));

  return (
    <>
      <Header title="Registrar cobro" showBack />

      <div className="p-4 space-y-5">
        {/* Info del cliente */}
        <div className="bg-surface rounded-xl p-4 border-thin space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-bg text-primary flex items-center justify-center text-sm font-medium">
                {client?.nombre?.charAt(0) || "?"}
              </div>
              <div>
                <p className="font-medium text-primary">{client?.nombre || "Cliente"}</p>
                <p className="text-xs text-primary-light/70">{client?.telefono}</p>
              </div>
            </div>

            {/* Botón de Google Maps o Capturar GPS */}
            {client?.ubicacion?.lat && client?.ubicacion?.lng ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${client.ubicacion.lat},${client.ubicacion.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-gold text-surface-1 px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-gold/90 transition shadow-sm shrink-0"
              >
                <IconMapPin size={16} stroke={2} />
                Cómo llegar
              </a>
            ) : (
              <button
                type="button"
                onClick={handleCaptureCurrentGps}
                disabled={capturingGps}
                className="flex items-center gap-1 bg-surface-2 text-primary-light px-2.5 py-1.5 rounded-xl text-xs font-medium hover:bg-primary-bg transition border border-thin shrink-0"
              >
                <IconMapPin size={14} stroke={2} />
                {capturingGps ? "Guardando..." : "Guardar GPS"}
              </button>
            )}
          </div>

          {/* Detalles adicionales del cliente (Dirección y Referencia) */}
          {(client?.direccion || client?.referencia) && (
            <div className="pt-3 border-t border-line space-y-2 text-sm">
              {client?.direccion && (
                <div>
                  <p className="text-[11px] text-primary-light/70 mb-0.5">Dirección</p>
                  <p className="text-primary">{client.direccion}</p>
                </div>
              )}
              {client?.referencia && (
                <div>
                  <p className="text-[11px] text-primary-light/70 mb-0.5">Referencia</p>
                  <p className="text-primary">{client.referencia}</p>
                </div>
              )}
            </div>
          )}

          {/* Progreso */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-primary-light/75">
              <span>Pagado: ${formatearMonto(pagado)}</span>
              <span>Total: ${formatearMonto(loan.montoTotalAPagar)}</span>
            </div>
            <div className="w-full bg-surface-2 rounded-full h-2">
              <div
                className="bg-gold rounded-full h-2 transition-all"
                style={{ width: `${progreso}%` }}
              />
            </div>
            <p className="text-xs text-primary-light/70 text-right">{progreso}% completado</p>
          </div>
        </div>

        {/* Detalles del crédito */}
        <div className="bg-surface rounded-xl p-4 border-thin grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-primary-light/70 text-xs">Cuota</p>
            <p className="font-medium text-primary">${formatearMonto(loan.cuota)}</p>
          </div>
          <div>
            <p className="text-primary-light/70 text-xs">Saldo pendiente</p>
            <p className="font-medium text-primary">${formatearMonto(loan.saldoPendiente ?? 0)}</p>
          </div>
          <div>
            <p className="text-primary-light/70 text-xs">Frecuencia</p>
            <p className="font-medium capitalize">{loan.frecuencia}</p>
          </div>
          <div>
            <p className="text-primary-light/70 text-xs">Estado</p>
            <Badge status={loan.estado} />
          </div>
        </div>

        {/* Aviso de crédito vencido (informativo; el recargo se aplica solo al registrar el cobro) */}
        {recargoPendiente && (
          <div className="bg-gold/10 border-thin border-gold/30 rounded-xl p-4 flex items-start gap-3">
            <IconAlertTriangle size={20} className="text-gold flex-shrink-0 mt-0.5" stroke={2} />
            <div className="text-sm text-gold">
              <p className="font-medium text-gold">Crédito vencido</p>
              <p className="mt-1">
                Al registrar el próximo cobro se aplicará el recargo de {recargoPorcentaje}% (
                <span className="font-semibold">${formatearMonto(recargoCalculado)}</span>) sobre el
                saldo de ${formatearMonto(loan.saldoPendiente ?? 0)}. También puedes renovar la
                cartulina en cualquier momento con el botón de abajo.
              </p>
            </div>
          </div>
        )}

        {/* Renovar cartulina — disponible en cualquier momento (cobradiario) */}
        {loan.estado === "activo" && !isAdmin && (
          <div className="card p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-primary flex items-center gap-2">
                <IconRefresh size={18} stroke={1.5} className="text-primary" />
                Renovar cartulina
              </p>
              <p className="text-xs text-primary-light/75 mt-0.5">
                Cierra este crédito y crea uno nuevo por el monto solicitado. Al cliente se le
                entrega el monto nuevo menos el saldo pendiente
                {seguroRenov > 0 || settings.seguroActivo ? " y el seguro" : ""}.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-primary">Monto nuevo solicitado ($)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={montoSolicitado ? formatearMonto(Number(montoSolicitado)) : ""}
                  onChange={(e) => setMontoSolicitado(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={bloquearEntradaSoloNumeros}
                  placeholder="Ej. 500.000"
                  className="mt-1 block w-full rounded-xl border border-line px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-primary">Cuotas</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={renewCuotas}
                  onChange={(e) => setRenewCuotas(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={bloquearEntradaSoloNumeros}
                  placeholder="Ej. 12"
                  className="mt-1 block w-full rounded-xl border border-line px-4 py-3 text-sm text-primary focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
                />
              </label>
            </div>

            {montoNuevo > 0 && (
              <div className="rounded-xl bg-surface-1 p-4 text-sm space-y-3">
                {/* Cómo queda compuesta la nueva cartulina */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-primary-light/75">Monto nuevo solicitado</span>
                    <span className="text-primary" translate="no">${formatearMonto(montoNuevo)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-primary-light/75">(+) Interés ({interesRenov}%)</span>
                    <span className="text-primary" translate="no">
                      ${formatearMonto(round2((montoNuevo * interesRenov) / 100))}
                    </span>
                  </div>
                  {seguroRenov > 0 && (
                    <div className="flex justify-between">
                      <span className="text-primary-light/75">(+) Seguro</span>
                      <span className="text-primary" translate="no">${formatearMonto(seguroRenov)}</span>
                    </div>
                  )}
                  {totalesRenovacion && (
                    <div className="flex justify-between border-t border-line pt-1.5">
                      <span className="font-medium text-primary">Total a pagar</span>
                      <span className="font-medium text-primary" translate="no">
                        ${formatearMonto(totalesRenovacion.montoTotalAPagar)}
                      </span>
                    </div>
                  )}
                  {totalesRenovacion && (
                    <p className="text-xs text-primary-light/70">
                      {cuotasRenovNum} cuota{cuotasRenovNum === 1 ? "" : "s"}{" "}
                      {ETIQUETA_FRECUENCIA[loan.frecuencia] || ""} de ${formatearMonto(totalesRenovacion.cuota)}{" "}
                      c/u.
                    </p>
                  )}
                </div>

                {/* Lo que efectivamente recibe el cliente en efectivo */}
                <div className="space-y-1.5 border-t border-line pt-3">
                  <div className="flex justify-between">
                    <span className="text-primary-light/75">(−) Saldo pendiente actual</span>
                    <span className="text-primary" translate="no">${formatearMonto(saldoActualRenov)}</span>
                  </div>
                  {seguroRenov > 0 && (
                    <div className="flex justify-between">
                      <span className="text-primary-light/75">(−) Seguro sobre monto nuevo</span>
                      <span className="text-primary" translate="no">${formatearMonto(seguroRenov)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1">
                    <span className="font-medium text-primary">Entrega al cliente</span>
                    <span
                      className={`font-bold ${entregaRenov != null && entregaRenov >= 0 ? "text-al-dia" : "text-mora"}`}
                      translate="no"
                    >
                      ${formatearMonto(entregaRenov ?? 0)}
                    </span>
                  </div>
                </div>

                {entregaRenov != null && entregaRenov < 0 && (
                  <p className="text-xs text-mora">
                    El monto solicitado no cubre el saldo pendiente: súbelo para poder renovar.
                  </p>
                )}
                {!settings.seguroActivo && (
                  <p className="text-xs text-primary-light/50">
                    El seguro está desactivado en Configuración — actívalo ahí si esta renovación debe cobrarlo.
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleRenovarCartulina}
              disabled={saving || !montoNuevo || cuotasRenovNum < 1 || entregaRenov == null || entregaRenov < 0}
              className="w-full bg-gold hover:bg-gold/90 text-surface-1 font-medium rounded-xl py-3.5 transition disabled:opacity-50"
            >
              {saving ? "Procesando renovación..." : "Renovar cartulina"}
            </button>
          </div>
        )}

        {/* Formulario de cobro */}
        <form onSubmit={handleCobro} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-primary">Monto a cobrar ($)</span>
              <input
                type="text"
                inputMode="numeric"
                required
                value={editingMonto ? monto : monto ? formatearMonto(Number(monto)) : ""}
                onFocus={() => setEditingMonto(true)}
                onBlur={() => setEditingMonto(false)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  const maxAllowed = loan.saldoPendiente ?? Infinity;
                  if (!raw) {
                    setMonto("");
                    return;
                  }
                  const val = Number(raw);
                  if (val <= maxAllowed) {
                    setMonto(raw);
                  } else {
                    setMonto(String(maxAllowed));
                  }
                }}
                onKeyDown={bloquearEntradaSoloNumeros}
                className="mt-1 block w-full rounded-xl border border-line px-4 py-4 text-2xl font-medium text-center text-primary focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-primary">Método de pago</span>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-line px-4 py-3 text-base text-primary focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-gold hover:bg-gold/90 text-surface-1 font-medium rounded-xl py-4 text-lg transition disabled:opacity-50"
            >
              {saving ? "Registrando..." : "Confirmar cobro"}
            </button>

            {done && (
              <div className="bg-al-dia/10 border-thin border-al-dia/30 text-al-dia rounded-xl p-4 flex items-center gap-3 mt-4">
                <IconCheck size={20} className="flex-shrink-0" stroke={2.5} />
                <div>
                  <p className="text-sm font-medium">Cobro registrado exitosamente</p>
                  <p className="text-xs text-al-dia mt-0.5">Se actualizó el historial y el saldo.</p>
                </div>
              </div>
            )}
          </form>

          {/* Historial de cobros */}
          <PaymentHistoryList payments={payments} loading={paymentsLoading} />
      </div>
    </>
  );
}

