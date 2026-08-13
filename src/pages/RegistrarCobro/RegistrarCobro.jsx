import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/layout/Header";
import Badge from "../../components/ui/Badge";
import PaymentHistoryList from "../../components/ui/PaymentHistoryList";
import { useLoans } from "../../hooks/useLoans";
import { useClients } from "../../hooks/useClients";
import { usePaymentHistory } from "../../hooks/usePaymentHistory";
import { calcularMoraGlobal } from "../../logic/mora";
import { calcularRecargo, esCreditoVencido, hayCorteVencidoPendiente, construirVencimientoInicial } from "../../logic/vencimiento";
import { calcularTotalesCredito } from "../../logic/credito";
import { formatearMonto, formatearFecha, limpiarMonto, bloquearEntradaSoloNumeros } from "../../logic/formato";
import { getDocument } from "../../firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { IconCheck, IconMapPin, IconAlertTriangle } from "@tabler/icons-react";

export default function RegistrarCobro() {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const { orgId, usuario } = useAuth();
  const { registerPayment, aplicarRecargoVencimiento, addLoan, updateLoan } = useLoans();
  const { clients, updateClient } = useClients();
  const { payments, loading: paymentsLoading } = usePaymentHistory(loanId);

  const [loan, setLoan] = useState(null);
  const [monto, setMonto] = useState("");
  const [editingMonto, setEditingMonto] = useState(false);
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [loading, setLoading] = useState(true);
  const montoInicializado = useRef(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [capturingGps, setCapturingGps] = useState(false);
  const [recargoAplicado, setRecargoAplicado] = useState(null);
  const [validacionRecargo, setValidacionRecargo] = useState(null);
  const [accionVencido, setAccionVencido] = useState(null);
  const [renewCuotas, setRenewCuotas] = useState(1);

  useEffect(() => {
    if (!orgId || !loanId) return;
    
    async function cargarYVerificar() {
      try {
        const doc = await getDocument(orgId, "loans", loanId);
        if (!doc) {
          setLoading(false);
          return;
        }

        // Verificar si hay vencimiento pendiente
        if (hayCorteVencidoPendiente(doc)) {
          setLoan(doc);
          setRecargoAplicado(null);
          if (doc && !montoInicializado.current) {
            setMonto(String(doc.saldoPendiente ?? 0));
            setRenewCuotas(doc.numeroCuotas ?? 1);
            montoInicializado.current = true;
          }
        } else {
          setLoan(doc);
          setRecargoAplicado(null);
          if (doc && !montoInicializado.current) {
            const mora = calcularMoraGlobal(doc);
            const saldoReal = doc.saldoPendiente ?? 0;
            const montoSugerido = esCreditoVencido(doc) ? saldoReal : mora.estado === "mora" ? mora.deficit : doc.cuota;
            setMonto(String(Math.min(montoSugerido, saldoReal)));
            montoInicializado.current = true;
          }
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
  const totalConRecargo = loan ? (loan.saldoPendiente ?? 0) + recargoCalculado : 0;
  const nuevosTotalesRenovacion = loan && renewCuotas > 0
    ? calcularTotalesCredito(loan.saldoPendiente ?? 0, recargoPorcentaje, renewCuotas)
    : null;

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

  function validarRecargo() {
    if (!loan) return;
    if (!loan.vencimiento || !loan.vencimiento.activo) {
      setValidacionRecargo({
        mensaje: "El crédito no tiene vencimiento activo.",
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
        ? "El crédito está pendiente de recargo y debe aplicarse ahora."
        : "No es necesario aplicar recargo en este momento.",
      pendiente: hayCorteVencidoPendiente(loan),
      recargoEsperado,
      totalConRecargo: (loan.saldoPendiente ?? 0) + recargoEsperado,
      proximoCorte: loan.vencimiento.proximoCorte,
      fechaUltimoRecargo: loan.vencimiento.fechaUltimoRecargo ?? null,
      recargosAcumulados: loan.vencimiento.recargosAcumulados ?? 0,
    });
  }

  function seleccionarPagoCompleto() {
    setAccionVencido("pagoCompleto");
    if (loan) {
      setMonto(String(loan.saldoPendiente ?? 0));
    }
  }

  function seleccionarRenovacion() {
    setAccionVencido("renovacion");
    if (loan) {
      setRenewCuotas(loan.numeroCuotas ?? 1);
    }
  }

  function crearCreditoRenovado(baseLoan, cuotas) {
    const capital = baseLoan.saldoPendiente ?? 0;
    const interesAplicado = baseLoan.vencimiento?.porcentaje ?? 0;
    const { montoTotalAPagar, cuota, saldoPendiente } = calcularTotalesCredito(
      capital,
      interesAplicado,
      cuotas
    );

    const loanBase = {
      clientId: baseLoan.clientId,
      capital,
      interesAplicado,
      numeroCuotas: cuotas,
      frecuencia: baseLoan.frecuencia,
      diasHabiles: baseLoan.diasHabiles ?? [1, 2, 3, 4, 5, 6],
      diaSemana: baseLoan.diaSemana ?? null,
      intervaloDias: baseLoan.intervaloDias ?? null,
      fechaInicio: new Date().toISOString(),
      montoTotalAPagar,
      cuota,
      saldoPendiente,
      estado: "activo",
      seguro: null,
    };

    const vencimientoConfig = {
      activo: baseLoan.vencimiento?.activo ?? false,
      modoInicial: baseLoan.vencimiento?.modoInicial ?? "al_vencer",
      porcentaje: interesAplicado,
    };

    return {
      ...loanBase,
      vencimiento: construirVencimientoInicial(vencimientoConfig, loanBase),
    };
  }

  async function handleRenovacion() {
    if (!loan) return;
    const capital = loan.saldoPendiente ?? 0;
    if (capital <= 0) {
      alert("No hay saldo pendiente para renovar.");
      return;
    }
    if (!renewCuotas || renewCuotas < 1) {
      alert("Indica el número de cuotas para la renovación.");
      return;
    }

    setSaving(true);
    try {
      const newLoan = crearCreditoRenovado(loan, renewCuotas);
      const client = clients.find((c) => c.id === loan.clientId);
      await addLoan(newLoan, {
        clienteNombre: client?.nombre ?? null,
        cobradorNombre: usuario?.displayName ?? null,
        skipPrestamoMovimiento: true,
      });
      await updateLoan(loanId, {
        estado: "completado",
        saldoPendiente: 0,
      });
      alert("Se creó la renovación y se cerró el crédito anterior como completado.");
      navigate("/ruta", { replace: true });
    } catch (err) {
      alert("Error al renovar crédito: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCobro(e) {
    e.preventDefault();

    const montoReal = limpiarMonto(monto);
    if (!montoReal || Number(montoReal) <= 0) return;

    if (recargoPendiente && !accionVencido) {
      alert("Selecciona si deseas pagar completo o renovar el crédito vencido.");
      return;
    }

    if (recargoPendiente && accionVencido === "renovacion") {
      alert("Para renovar el crédito vencido usa el botón de creación de renovación.");
      return;
    }

    if (recargoPendiente && accionVencido === "pagoCompleto" && montoReal !== Number(loan?.saldoPendiente ?? 0)) {
      alert("Para cerrar el crédito vencido debe pagar el saldo pendiente completo.");
      return;
    }

    setSaving(true);
    try {
      await registerPayment(loanId, montoReal, {
        clienteNombre: client?.nombre ?? null,
        cobradorNombre: usuario?.displayName ?? null,
        metodoPago,
        skipVencimientoRecargo: recargoPendiente && accionVencido === "pagoCompleto",
      });

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
        <p className="p-6 text-sm text-gray-400">Cargando crédito...</p>
      </>
    );
  }

  if (!loan) {
    return (
      <>
        <Header title="Registrar cobro" showBack />
        <p className="p-6 text-sm text-red-400">Crédito no encontrado</p>
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
                <p className="font-medium text-gray-800">{client?.nombre || "Cliente"}</p>
                <p className="text-xs text-gray-400">{client?.telefono}</p>
              </div>
            </div>

            {/* Botón de Google Maps o Capturar GPS */}
            {client?.ubicacion?.lat && client?.ubicacion?.lng ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${client.ubicacion.lat},${client.ubicacion.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-primary-light text-white px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-primary transition shadow-sm shrink-0"
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
            <div className="pt-3 border-t border-[#E5E5EA] space-y-2 text-sm">
              {client?.direccion && (
                <div>
                  <p className="text-[11px] text-gray-400 mb-0.5">Dirección</p>
                  <p className="text-gray-700">{client.direccion}</p>
                </div>
              )}
              {client?.referencia && (
                <div>
                  <p className="text-[11px] text-gray-400 mb-0.5">Referencia</p>
                  <p className="text-gray-700">{client.referencia}</p>
                </div>
              )}
            </div>
          )}

          {/* Progreso */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Pagado: ${formatearMonto(pagado)}</span>
              <span>Total: ${formatearMonto(loan.montoTotalAPagar)}</span>
            </div>
            <div className="w-full bg-surface-2 rounded-full h-2">
              <div
                className="bg-primary-light rounded-full h-2 transition-all"
                style={{ width: `${progreso}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 text-right">{progreso}% completado</p>
          </div>
        </div>

        {/* Detalles del crédito */}
        <div className="bg-white rounded-xl p-4 border-thin grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-400 text-xs">Cuota</p>
            <p className="font-medium text-primary">${formatearMonto(loan.cuota)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Saldo pendiente</p>
            <p className="font-medium text-gray-700">${formatearMonto(loan.saldoPendiente ?? 0)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Frecuencia</p>
            <p className="font-medium capitalize">{loan.frecuencia}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Estado</p>
            <Badge status={loan.estado} />
          </div>
        </div>

        {/* Validación del recargo de mora */}
        <div className="bg-white rounded-xl p-4 border-thin space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Validar penalización de mora</p>
              <p className="text-xs text-gray-500">Comprueba si este crédito debe aplicar recargo por vencimiento.</p>
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
            <div className="rounded-xl bg-surface-2 p-4 text-sm text-gray-700 space-y-2">
              <p>
                <span className="font-medium">Resultado:</span> {validacionRecargo.mensaje}
              </p>
              <p>
                <span className="font-medium">Próximo corte:</span>{" "}
                {validacionRecargo.proximoCorte
                  ? formatearFecha(validacionRecargo.proximoCorte)
                  : "No definido"}
              </p>
              <p>
                <span className="font-medium">Último recargo:</span>{" "}
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
                <span className="font-medium">¿Pendiente de aplicar?</span>{" "}
                {validacionRecargo.pendiente ? "Sí" : "No"}
              </p>
            </div>
          )}
        </div>

        {/* Aviso de recargo aplicado */}
        {(recargoAplicado || recargoPendiente) && (
          <div className="bg-amber-50 border-thin border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <IconAlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" stroke={2} />
            <div>
              <p className="text-sm font-medium text-amber-900">
                {recargoPendiente ? "Crédito vencido" : "Recargo por mora aplicado"}
              </p>
              {recargoPendiente ? (
                <div className="space-y-2">
                  <p className="text-sm text-amber-700 mt-1">
                    Este crédito venció y ahora debe cobrar el saldo restante de <span className="font-semibold">${formatearMonto(loan.saldoPendiente ?? 0)}</span>.
                  </p>
                  <p className="text-sm text-amber-700">
                    Se calcula como saldo pendiente + {recargoPorcentaje}% de recargo:
                  </p>
                  <p className="text-sm text-amber-700">
                    <span className="font-medium">Saldo pendiente:</span> ${formatearMonto(loan.saldoPendiente ?? 0)}
                  </p>
                  <p className="text-sm text-amber-700">
                    <span className="font-medium">Recargo {recargoPorcentaje}%:</span> ${formatearMonto(recargoCalculado)}
                  </p>
                  <p className="text-sm text-amber-700">
                    <span className="font-semibold">Total con recargo:</span> ${formatearMonto(totalConRecargo)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-amber-700 mt-1">
                  Se aplicó un recargo del {recargoAplicado.porcentaje}% por vencimiento:
                  <span className="font-semibold"> ${formatearMonto(recargoAplicado.monto)}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {recargoPendiente && (
          <div className="bg-white rounded-xl p-4 border-thin space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Resolver crédito vencido</p>
                <p className="text-xs text-gray-500">Elige pagar el saldo completo ahora o crear una renovación.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={seleccionarPagoCompleto}
                className={`rounded-xl border px-4 py-4 text-left transition ${accionVencido === "pagoCompleto"
                  ? "border-primary bg-primary-light/10"
                  : "border-surface-2 bg-white"}`}
              >
                <p className="font-semibold">Pagar saldo completo</p>
                <p className="text-xs text-gray-500 mt-1">Cierra el crédito vencido sin aplicar el recargo adicional.</p>
              </button>

              <button
                type="button"
                onClick={seleccionarRenovacion}
                className={`rounded-xl border px-4 py-4 text-left transition ${accionVencido === "renovacion"
                  ? "border-primary bg-primary-light/10"
                  : "border-surface-2 bg-white"}`}
              >
                <p className="font-semibold">Renovación</p>
                <p className="text-xs text-gray-500 mt-1">Crea un nuevo crédito sobre el saldo pendiente + recargo.</p>
              </button>
            </div>

            {accionVencido === "pagoCompleto" && (
              <div className="rounded-xl bg-surface-2 p-4 text-sm text-gray-700">
                <p className="font-medium">Monto a cobrar ahora</p>
                <p className="text-lg font-semibold">${formatearMonto(loan.saldoPendiente ?? 0)}</p>
              </div>
            )}

            {accionVencido === "renovacion" && (
              <div className="space-y-4">
                <div className="rounded-xl bg-surface-2 p-4 text-sm text-gray-700 space-y-2">
                  <p className="font-medium">Saldo pendiente actual</p>
                  <p>${formatearMonto(loan.saldoPendiente ?? 0)}</p>
                  <p className="text-xs text-gray-500">Renovación calculada con {recargoPorcentaje}% de interés sobre el saldo pendiente.</p>
                  <p className="font-medium mt-2">Total a pagar en nuevo crédito</p>
                  <p className="text-lg font-semibold">${formatearMonto(nuevosTotalesRenovacion?.montoTotalAPagar ?? 0)}</p>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Cuotas de renovación</span>
                  <input
                    type="number"
                    min="1"
                    value={renewCuotas}
                    onChange={(e) => setRenewCuotas(Number(e.target.value) || 1)}
                    className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-base text-gray-800 focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleRenovacion}
                  disabled={saving}
                  className="w-full bg-[#26215C] hover:bg-[#26215C]/90 text-white font-medium rounded-xl py-4 text-lg transition disabled:opacity-50"
                >
                  {saving ? "Procesando renovación..." : "Crear renovación"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Formulario de cobro */}
        <form onSubmit={handleCobro} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Monto a cobrar ($)</span>
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
                className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-4 text-2xl font-medium text-center text-primary focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Método de pago</span>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-base text-gray-800 focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={saving || (recargoPendiente && accionVencido !== "pagoCompleto")}
              className="w-full bg-[#26215C] hover:bg-[#26215C]/90 text-white font-medium rounded-xl py-4 text-lg transition disabled:opacity-50"
            >
              {saving ? "Registrando..." : recargoPendiente && accionVencido !== "pagoCompleto" ? "Selecciona una opción" : "Confirmar cobro"}
            </button>

            {done && (
              <div className="bg-emerald-50 border-thin border-emerald-200 text-emerald-700 rounded-xl p-4 flex items-center gap-3 mt-4">
                <IconCheck size={20} className="flex-shrink-0" stroke={2.5} />
                <div>
                  <p className="text-sm font-medium">Cobro registrado exitosamente</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Se actualizó el historial y el saldo.</p>
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
