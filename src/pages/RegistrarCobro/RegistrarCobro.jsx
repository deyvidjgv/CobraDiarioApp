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
import { formatearMonto, formatearFecha, limpiarMonto, bloquearEntradaSoloNumeros } from "../../logic/formato";
import { getDocument, addDocument, getSettings } from "../../firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { IconCheck, IconMapPin, IconAlertTriangle, IconRefresh } from "@tabler/icons-react";

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
  const [validacionRecargo, setValidacionRecargo] = useState(null);
  const [settings, setSettings] = useState({});
  const [montoSolicitado, setMontoSolicitado] = useState("");
  const [renewCuotas, setRenewCuotas] = useState(1);

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
          setRenewCuotas(doc.numeroCuotas ?? 1);
          montoInicializado.current = true;
        }
      } catch (err) {
        console.error("Error cargando crÃ©dito:", err);
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

  // â”€â”€â”€ RenovaciÃ³n de cartulina (disponible en cualquier momento) â”€â”€â”€
  // Entrega = monto nuevo solicitado âˆ’ saldo pendiente âˆ’ seguro (sobre el
  // monto nuevo). La nueva cartulina se crea por el monto solicitado.
  const montoNuevo = montoSolicitado ? Number(montoSolicitado) || 0 : 0;
  const saldoActualRenov = loan?.saldoPendiente ?? 0;
  const seguroRenovConfig = settings.seguroActivo
    ? { activo: true, tipo: settings.seguroTipo, valor: settings.seguroValor }
    : { activo: false };
  const { seguroMonto: seguroRenov } = calcularSeguro(montoNuevo, seguroRenovConfig);
  const entregaRenov = montoNuevo > 0 ? montoNuevo - saldoActualRenov - seguroRenov : null;
  const totalesRenovacion =
    montoNuevo > 0 && renewCuotas > 0
      ? calcularTotalesCredito(montoNuevo, settings.interesDefault ?? 20, renewCuotas)
      : null;

  function handleCaptureCurrentGps() {
    if (!client?.id) return;
    if (!navigator.geolocation) {
      alert("GeolocalizaciÃ³n no disponible.");
      return;
    }
    setCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        updateClient(client.id, { ubicacion: { lat: latitude, lng: longitude } })
          .then(() => alert("UbicaciÃ³n del cliente guardada con Ã©xito."))
          .catch((e) => alert("Error guardando ubicaciÃ³n: " + e.message))
          .finally(() => setCapturingGps(false));
      },
      (err) => {
        alert("No se pudo obtener la ubicaciÃ³n: " + err.message);
        setCapturingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function validarRecargo() {
    if (!loan) return;
    if (!loan.vencimiento || !loan.vencimiento.activo) {
      setValidacionRecargo({
        mensaje: "El crÃ©dito no tiene vencimiento activo.",
        pendiente: false,
      });
      return;
    }

    const recargoEsperado = calcularRecargo(
      loan.saldoPendiente ?? 0,
      loan.vencimiento.porcentaje ?? 0
    );

    setValidacionRecargo({
      mensaje: hayCorteVencidoPendiente(loan)
        ? "El crÃ©dito estÃ¡ pendiente de recargo y debe aplicarse ahora."
        : "No es necesario aplicar recargo en este momento.",
      pendiente: hayCorteVencidoPendiente(loan),
      recargoEsperado,
      totalConRecargo: (loan.saldoPendiente ?? 0) + recargoEsperado,
      proximoCorte: loan.vencimiento.proximoCorte,
      fechaUltimoRecargo: loan.vencimiento.fechaUltimoRecargo ?? null,
      recargosAcumulados: loan.vencimiento.recargosAcumulados ?? 0,
    });
  }

  /**
   * Renovar cartulina: cierra este crÃ©dito y crea uno nuevo por el monto
   * solicitado. El cliente recibe en efectivo el monto nuevo MENOS el
   * saldo pendiente y el seguro (calculado sobre el monto nuevo).
   * Disponible en cualquier momento â€” no exige esperar el vencimiento.
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
    if (!renewCuotas || renewCuotas < 1) {
      alert("Indica el nÃºmero de cuotas de la nueva cartulina.");
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
          interes: settings.interesDefault,
          numeroCuotas: renewCuotas,
          frecuencia: loan.frecuencia,
          diasHabiles: loan.diasHabiles ?? [1, 2, 3, 4, 5, 6],
          fechaInicio: new Date().toISOString(),
          seguro: seguroRenovConfig,
          vencimiento: vencimientoConfig,
        },
        settings
      );

      const ref = await addLoan(nuevoLoan, {
        clienteNombre: client?.nombre ?? null,
        cobradorNombre: usuario?.displayName ?? null,
        skipPrestamoMovimiento: true,
      });

      // De caja solo sale lo entregado: monto nuevo âˆ’ saldo pendiente.
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
          nota: `RenovaciÃ³n cartulina â€” solicitado $${formatearMonto(nuevo)} âˆ’ saldo $${formatearMonto(saldo)}`,
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

      // Visita de ruta (Fase 8): la gestiÃ³n queda registrada con GPS.
      // Si falla no bloquea el cobro, que ya quedÃ³ registrado.
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
        <p className="p-6 text-sm text-primary-light/70">Cargando crÃ©dito...</p>
      </>
    );
  }

  if (!loan) {
    return (
      <>
        <Header title="Registrar cobro" showBack />
        <p className="p-6 text-sm text-mora/80">CrÃ©dito no encontrado</p>
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
        <div className="bg-white rounded-xl p-4 border-thin space-y-3">
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

            {/* BotÃ³n de Google Maps o Capturar GPS */}
            {client?.ubicacion?.lat && client?.ubicacion?.lng ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${client.ubicacion.lat},${client.ubicacion.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-primary-light text-white px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-primary transition shadow-sm shrink-0"
              >
                <IconMapPin size={16} stroke={2} />
                CÃ³mo llegar
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

          {/* Detalles adicionales del cliente (DirecciÃ³n y Referencia) */}
          {(client?.direccion || client?.referencia) && (
            <div className="pt-3 border-t border-[#E3DFD8] space-y-2 text-sm">
              {client?.direccion && (
                <div>
                  <p className="text-[11px] text-primary-light/70 mb-0.5">DirecciÃ³n</p>
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
                className="bg-primary-light rounded-full h-2 transition-all"
                style={{ width: `${progreso}%` }}
              />
            </div>
            <p className="text-xs text-primary-light/70 text-right">{progreso}% completado</p>
          </div>
        </div>

        {/* Detalles del crÃ©dito */}
        <div className="bg-white rounded-xl p-4 border-thin grid grid-cols-2 gap-3 text-sm">
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

        {/* ValidaciÃ³n del recargo de mora */}
        <div className="bg-white rounded-xl p-4 border-thin space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-primary">Validar penalizaciÃ³n de mora</p>
              <p className="text-xs text-primary-light/75">Comprueba si este crÃ©dito debe aplicar recargo por vencimiento.</p>
            </div>
            <button
              type="button"
              onClick={validarRecargo}
              className="rounded-xl bg-[#26215C] px-4 py-2 text-sm font-medium text-white hover:bg-[#26215C]/90 transition"
            >
              Validar
            </button>
          </div>

          {validacionRecargo && (
            <div className="rounded-xl bg-surface-2 p-4 text-sm text-primary space-y-2">
              <p>
                <span className="font-medium">Resultado:</span> {validacionRecargo.mensaje}
              </p>
              <p>
                <span className="font-medium">PrÃ³ximo corte:</span>{" "}
                {validacionRecargo.proximoCorte
                  ? formatearFecha(validacionRecargo.proximoCorte)
                  : "No definido"}
              </p>
              <p>
                <span className="font-medium">Ãšltimo recargo:</span>{" "}
                {validacionRecargo.fechaUltimoRecargo
                  ? formatearFecha(validacionRecargo.fechaUltimoRecargo)
                  : "Nunca"}
              </p>
              <p>
                <span className="font-medium">Recargos acumulados:</span>{" "}
                ${formatearMonto(validacionRecargo.recargosAcumulados)}
              </p>
              <p>
                <span className="font-medium">Recargo esperado ahora:</span>{" "}
                ${formatearMonto(validacionRecargo.recargoEsperado)}
              </p>
              <p>
                <span className="font-medium">Â¿Pendiente de aplicar?</span>{" "}
                {validacionRecargo.pendiente ? "SÃ­" : "No"}
              </p>
            </div>
          )}
        </div>

        {/* Aviso de crÃ©dito vencido (informativo; el cobro es libre) */}
        {recargoPendiente && (
          <div className="bg-amber-50 border-thin border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <IconAlertTriangle size={20} className="text-gold flex-shrink-0 mt-0.5" stroke={2} />
            <div className="text-sm text-amber-800">
              <p className="font-medium text-amber-900">CrÃ©dito vencido</p>
              <p className="mt-1">
                Al registrar el prÃ³ximo cobro se aplicarÃ¡ el recargo de {recargoPorcentaje}% (
                <span className="font-semibold">${formatearMonto(recargoCalculado)}</span>) sobre el
                saldo de ${formatearMonto(loan.saldoPendiente ?? 0)}. TambiÃ©n puedes renovar la
                cartulina en cualquier momento con el botÃ³n de abajo.
              </p>
            </div>
          </div>
        )}

        {/* Renovar cartulina â€” disponible en cualquier momento (cobradiario) */}
        {loan.estado === "activo" && !isAdmin && (
          <div className="card p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-primary flex items-center gap-2">
                <IconRefresh size={18} stroke={1.5} className="text-primary" />
                Renovar cartulina
              </p>
              <p className="text-xs text-primary-light/75 mt-0.5">
                Cierra este crÃ©dito y crea uno nuevo por el monto solicitado. Al cliente se le
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
                  value={montoSolicitado}
                  onChange={(e) => setMontoSolicitado(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={bloquearEntradaSoloNumeros}
                  placeholder="Ej. 500000"
                  className="mt-1 block w-full rounded-xl border border-[#E3DFD8] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-primary">Cuotas</span>
                <input
                  type="number"
                  min="1"
                  value={renewCuotas}
                  onChange={(e) => setRenewCuotas(Number(e.target.value) || 1)}
                  className="mt-1 block w-full rounded-xl border border-[#E3DFD8] px-4 py-3 text-sm text-primary focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
                />
              </label>
            </div>

            {montoNuevo > 0 && (
              <div className="rounded-xl bg-surface-1 p-4 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-primary-light/75">Monto nuevo solicitado</span>
                  <span className="text-primary" translate="no">${formatearMonto(montoNuevo)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary-light/75">(âˆ’) Saldo pendiente actual</span>
                  <span className="text-primary" translate="no">${formatearMonto(saldoActualRenov)}</span>
                </div>
                {seguroRenov > 0 && (
                  <div className="flex justify-between">
                    <span className="text-primary-light/75">(âˆ’) Seguro sobre monto nuevo</span>
                    <span className="text-primary" translate="no">${formatearMonto(seguroRenov)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-[#E3DFD8] pt-2">
                  <span className="font-medium text-primary">Entrega al cliente</span>
                  <span
                    className={`font-bold translate-y-0 ${entregaRenov != null && entregaRenov >= 0 ? "text-al-dia" : "text-mora"}`}
                    translate="no"
                  >
                    ${formatearMonto(entregaRenov ?? 0)}
                  </span>
                </div>
                {totalesRenovacion && (
                  <p className="text-xs text-primary-light/70 pt-1">
                    Nueva cartulina: total ${formatearMonto(totalesRenovacion.montoTotalAPagar)} en{" "}
                    {renewCuotas} cuotas de ${formatearMonto(totalesRenovacion.cuota)} (
                    {settings.interesDefault ?? 20}% de interÃ©s).
                  </p>
                )}
                {entregaRenov != null && entregaRenov < 0 && (
                  <p className="text-xs text-mora">
                    El monto solicitado no cubre el saldo pendiente: sÃºbelo para poder renovar.
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleRenovarCartulina}
              disabled={saving || !montoNuevo || entregaRenov == null || entregaRenov < 0}
              className="w-full bg-primary hover:bg-primary-light text-white font-medium rounded-xl py-3.5 transition disabled:opacity-50"
            >
              {saving ? "Procesando renovaciÃ³n..." : "Renovar cartulina"}
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
                className="mt-1 block w-full rounded-xl border border-[#E3DFD8] px-4 py-4 text-2xl font-medium text-center text-primary focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-primary">MÃ©todo de pago</span>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-[#E3DFD8] px-4 py-3 text-base text-primary focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#26215C] hover:bg-[#26215C]/90 text-white font-medium rounded-xl py-4 text-lg transition disabled:opacity-50"
            >
              {saving ? "Registrando..." : "Confirmar cobro"}
            </button>

            {done && (
              <div className="bg-emerald-50 border-thin border-emerald-200 text-emerald-700 rounded-xl p-4 flex items-center gap-3 mt-4">
                <IconCheck size={20} className="flex-shrink-0" stroke={2.5} />
                <div>
                  <p className="text-sm font-medium">Cobro registrado exitosamente</p>
                  <p className="text-xs text-al-dia mt-0.5">Se actualizÃ³ el historial y el saldo.</p>
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

