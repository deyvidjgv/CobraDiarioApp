import { useState } from "react";
import Header from "../../components/layout/Header";
import { useMovements } from "../../hooks/useMovements";
import { useCorrections } from "../../hooks/useCorrections";
import { construirMovimiento, TIPOS_MOVIMIENTO } from "../../logic/caja";
import { formatearMonto, limpiarMonto, bloquearEntradaSoloNumeros } from "../../logic/formato";
import { getColombiaDateKey } from "../../logic/dateUtils";
import ConfirmarPasswordModal from "../../components/ui/ConfirmarPasswordModal";
import { useAuth } from "../../context/AuthContext";
import { useCobradiarios } from "../../hooks/useCobradiarios";
import { verificarPassword } from "../../firebase/auth";
import {
  IconArrowUpRight,
  IconArrowDownRight,
  IconPlus,
  IconMinus,
  IconX,
  IconTrash,
  IconChevronDown,
  IconCalendar,
  IconAlertOctagon,
  IconEdit,
} from "@tabler/icons-react";

export default function Caja() {
  const { orgId, usuario, isAdmin } = useAuth();
  const [selectedDate, setSelectedDate] = useState(getColombiaDateKey());
  const [filtroCobradiario, setFiltroCobradiario] = useState("");
  const isHoy = selectedDate === getColombiaDateKey();

  const { movements, loading, saldo, addMovement, deleteMovement } = useMovements(
    selectedDate,
    isAdmin ? filtroCobradiario || null : null
  );
  const { cobradiarios } = useCobradiarios();
  const { solicitarCorreccion } = useCorrections();
  const [modalType, setModalType] = useState(null); // "gasto" | "base" | null
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Eliminar un movimiento puntual (solo manuales)
  const [movimientoAEliminar, setMovimientoAEliminar] = useState(null);
  const [passwordError, setPasswordError] = useState("");

  // Solicitar correcciÃ³n sobre un movimiento ya registrado (no se edita/borra directo)
  const [movimientoACorregir, setMovimientoACorregir] = useState(null);
  const [valorCorrecto, setValorCorrecto] = useState("");
  const [motivoCorreccion, setMotivoCorreccion] = useState("");
  const [enviandoCorreccion, setEnviandoCorreccion] = useState(false);

  async function handleSolicitarCorreccion(e) {
    e.preventDefault();
    if (!valorCorrecto || !motivoCorreccion) return;
    setEnviandoCorreccion(true);
    try {
      await solicitarCorreccion({
        movementId: movimientoACorregir.id,
        valorOriginal: movimientoACorregir.monto,
        valorCorrecto: limpiarMonto(valorCorrecto),
        motivo: motivoCorreccion,
      });
      setMovimientoACorregir(null);
      setValorCorrecto("");
      setMotivoCorreccion("");
      alert("Solicitud de correcciÃ³n enviada. El Admin debe aprobarla.");
    } catch (err) {
      alert("Error al enviar la solicitud: " + err.message);
    } finally {
      setEnviandoCorreccion(false);
    }
  }

  const entradas = movements.filter((m) => m.monto > 0).reduce((a, m) => a + m.monto, 0);
  const salidas = Math.abs(movements.filter((m) => m.monto < 0).reduce((a, m) => a + m.monto, 0));

  async function handleForm(e) {
    e.preventDefault();
    if (!monto) return;
    setSaving(true);
    try {
      const isBase = modalType === "base";
      const montoReal = limpiarMonto(monto);
      const mov = construirMovimiento({
        tipo: isBase ? TIPOS_MOVIMIENTO.INGRESO_BASE : TIPOS_MOVIMIENTO.GASTO,
        monto: montoReal,
        orgId,
        nota: nota || (isBase ? "Ingreso de base" : "Gasto"),
        cobradorNombre: usuario?.displayName ?? null,
      });
      await addMovement(mov);
      setMonto("");
      setNota("");
      setModalType(null);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEliminarMovimiento(password) {
    setPasswordError("");
    setSaving(true);
    try {
      await verificarPassword(password);
      await deleteMovement(movimientoAEliminar.id);
      setMovimientoAEliminar(null);
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setPasswordError("ContraseÃ±a incorrecta. IntÃ©ntalo de nuevo.");
      } else {
        setPasswordError(err.message || "No se pudo eliminar el movimiento.");
      }
    } finally {
      setSaving(false);
    }
  }

  const tipoLabel = {
    cobro: { text: "Cobro", color: "text-al-dia", bg: "bg-emerald-50", Icon: IconArrowUpRight },
    prestamo_nuevo: { text: "PrÃ©stamo", color: "text-mora", bg: "bg-mora/10", Icon: IconArrowDownRight },
    gasto: { text: "Gasto", color: "text-mora", bg: "bg-mora/10", Icon: IconArrowDownRight },
    ajuste: { text: "Ajuste", color: "text-gold", bg: "bg-amber-50", Icon: IconMinus },
    ingreso_base: { text: "Base", color: "text-al-dia", bg: "bg-emerald-50", Icon: IconArrowUpRight },
    seguro: { text: "Seguro", color: "text-al-dia", bg: "bg-emerald-50", Icon: IconArrowUpRight },
    recargo_vencimiento: { text: "Recargo vencimiento", color: "text-gold", bg: "bg-amber-50", Icon: IconAlertOctagon },
  };

  // Solo gasto / ingreso_base / ajuste se pueden eliminar (nunca cobro ni prestamo_nuevo)
  const esEliminable = (tipo) =>
    [TIPOS_MOVIMIENTO.GASTO, TIPOS_MOVIMIENTO.INGRESO_BASE, TIPOS_MOVIMIENTO.AJUSTE].includes(tipo);

  function formatearHora(fecha) {
    if (!fecha) return "";
    const d = fecha?.toDate ? fecha.toDate() : new Date(fecha);
    return new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }

  function formatearFechaLarga(fecha) {
    if (!fecha) return "";
    const d = fecha?.toDate ? fecha.toDate() : new Date(fecha);
    return new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      dateStyle: "long",
    }).format(d);
  }

  return (
    <div className="pb-24 space-y-6 max-w-5xl mx-auto">
      <Header 
        title="Caja" 
        modalOpen={!!movimientoAEliminar || modalType !== null}
        closeModal={() => {
          if (movimientoAEliminar) {
            setMovimientoAEliminar(null);
            setPasswordError("");
          }
          if (modalType) {
            setModalType(null);
            setMonto("");
            setNota("");
          }
        }}
      />

      <div className="px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Selector de fecha */}
        <div className="bg-white rounded-xl p-4 border border-[#E3DFD8] flex items-center gap-3">
          <IconCalendar size={20} stroke={1.5} className="text-primary-light/70 shrink-0" />
          <input
            type="date"
            value={selectedDate}
            max={getColombiaDateKey()}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 text-sm bg-transparent focus:outline-none"
          />
          {!isHoy && (
            <button
              onClick={() => setSelectedDate(getColombiaDateKey())}
              className="text-xs font-medium text-primary-light shrink-0"
            >
              Volver a hoy
            </button>
          )}
        </div>

        {/* Filtro por cobradiario (solo Admin, Plan Maestro secciÃ³n 16) */}
        {isAdmin && (
          <div className="bg-white rounded-xl p-4 border border-[#E3DFD8] flex items-center gap-3">
            <IconChevronDown size={20} stroke={1.5} className="text-primary-light/70 shrink-0" />
            <select
              value={filtroCobradiario}
              onChange={(e) => setFiltroCobradiario(e.target.value)}
              className="flex-1 text-sm bg-transparent focus:outline-none"
            >
              <option value="">Caja global (todos)</option>
              {cobradiarios.map((c) => (
                <option key={c.uid} value={c.uid}>
                  {c.nombre || c.email}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Saldo y Acciones principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          <div className="md:col-span-2 bg-primary-light rounded-2xl p-6 text-white relative overflow-hidden flex flex-col justify-between shadow-lg shadow-primary-light/20">
            <div className="absolute -right-6 -top-6 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
            <div>
              <p className="text-sm opacity-80 relative">
                {isHoy ? "Saldo del dÃ­a" : `Saldo del ${formatearFechaLarga(selectedDate + "T12:00:00")}`}
              </p>
              <p className="text-4xl sm:text-5xl font-bold mt-2 relative tracking-tight">
                ${formatearMonto(saldo)}
              </p>
            </div>
            <div className="flex gap-8 mt-6 text-sm relative border-t border-white/10 pt-4">
              <div>
                <p className="opacity-70 text-xs mb-0.5">Entradas</p>
                <p className="font-semibold text-emerald-300 text-base">+${formatearMonto(entradas)}</p>
              </div>
              <div>
                <p className="opacity-70 text-xs mb-0.5">Salidas</p>
                <p className="font-semibold text-mora/70 text-base">-${formatearMonto(salidas)}</p>
              </div>
            </div>
          </div>

          {isHoy && (
            <div className="flex flex-col justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E3DFD8] shadow-sm">
              <h4 className="text-xs font-semibold uppercase text-primary-light/70 tracking-wider">Acciones de caja</h4>
              <div className="space-y-2.5 flex-1 flex flex-col justify-center">
                <button
                  onClick={() => setModalType("base")}
                  className="w-full bg-emerald-50 border border-emerald-100 rounded-xl py-3 px-4 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition flex items-center justify-center gap-2"
                >
                  <IconPlus size={18} stroke={2} />
                  Ingresar base
                </button>
                <button
                  onClick={() => setModalType("gasto")}
                  className="w-full bg-mora/10 border border-mora/15 rounded-xl py-3 px-4 text-sm font-medium text-mora hover:bg-mora/15 transition flex items-center justify-center gap-2"
                >
                  <IconMinus size={18} stroke={2} />
                  Registrar gasto
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal ingreso / gasto */}
        {(modalType === "base" || modalType === "gasto") && (
          <form onSubmit={handleForm} className="bg-white rounded-2xl p-5 border border-[#E3DFD8] space-y-4 shadow-md max-w-lg mx-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-primary">
                {modalType === "base" ? "ðŸ’° Ingresar base" : "ðŸ’¸ Registrar gasto"}
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="p-1 rounded-lg hover:bg-surface-2 transition text-primary-light/70"
              >
                <IconX size={20} stroke={1.5} />
              </button>
            </div>
            <input
              type="text"
              inputMode="numeric"
              required
              placeholder="Monto ($)"
              value={monto ? formatearMonto(monto) : ""}
              onChange={(e) => setMonto(limpiarMonto(e.target.value))}
              onKeyDown={bloquearEntradaSoloNumeros}
              className="w-full rounded-xl border border-[#E3DFD8] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition"
            />
            <input
              type="text"
              placeholder="Nota (opcional)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="w-full rounded-xl border border-[#E3DFD8] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setModalType(null); setMonto(""); setNota(""); }}
                className="flex-1 py-3 rounded-xl border border-[#E3DFD8] text-sm font-medium text-primary-light/75 hover:bg-surface-1 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        )}

        {/* Modal confirmaciÃ³n con contraseÃ±a: eliminar un movimiento puntual */}
        <ConfirmarPasswordModal
          isOpen={!!movimientoAEliminar}
          title="Eliminar movimiento"
          description={
            <>
              Se eliminarÃ¡ el movimiento{" "}
              <strong className="text-primary">
                {movimientoAEliminar ? (tipoLabel[movimientoAEliminar.tipo]?.text ?? movimientoAEliminar.tipo) : ""}
              </strong>{" "}
              por ${movimientoAEliminar ? formatearMonto(Math.abs(movimientoAEliminar.monto)) : "0"}.
            </>
          }
          warning="âš  Esta acciÃ³n no se puede deshacer."
          onConfirm={handleEliminarMovimiento}
          onCancel={() => { setMovimientoAEliminar(null); setPasswordError(""); }}
          loading={saving}
          error={passwordError}
          confirmText="Eliminar movimiento"
        />

        {/* Modal: solicitar correcciÃ³n de un movimiento (no se edita/borra directo) */}
        {movimientoACorregir && (
          <form
            onSubmit={handleSolicitarCorreccion}
            className="bg-white rounded-2xl p-5 border border-[#E3DFD8] space-y-4 shadow-md max-w-lg mx-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gold">âœï¸ Solicitar correcciÃ³n</h3>
              <button
                type="button"
                onClick={() => { setMovimientoACorregir(null); setValorCorrecto(""); setMotivoCorreccion(""); }}
                className="p-1 rounded-lg hover:bg-surface-2 transition text-primary-light/70"
              >
                <IconX size={20} stroke={1.5} />
              </button>
            </div>
            <p className="text-xs text-primary-light/75">
              Valor registrado: <strong>${formatearMonto(Math.abs(movimientoACorregir.monto))}</strong>. El
              Admin revisarÃ¡ esta solicitud antes de aplicar el ajuste; el movimiento original no se
              modifica.
            </p>
            <input
              type="text"
              inputMode="numeric"
              required
              placeholder="Valor correcto ($)"
              value={valorCorrecto ? formatearMonto(valorCorrecto) : ""}
              onChange={(e) => setValorCorrecto(limpiarMonto(e.target.value))}
              onKeyDown={bloquearEntradaSoloNumeros}
              className="w-full rounded-xl border border-[#E3DFD8] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition"
            />
            <textarea
              required
              placeholder="Motivo de la correcciÃ³n"
              value={motivoCorreccion}
              onChange={(e) => setMotivoCorreccion(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-[#E3DFD8] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setMovimientoACorregir(null); setValorCorrecto(""); setMotivoCorreccion(""); }}
                className="flex-1 py-3 rounded-xl border border-[#E3DFD8] text-sm font-medium text-primary-light/75 hover:bg-surface-1 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviandoCorreccion}
                className="flex-1 py-3 rounded-xl bg-gold text-white text-sm font-medium hover:bg-gold transition disabled:opacity-50"
              >
                {enviandoCorreccion ? "Enviando..." : "Enviar solicitud"}
              </button>
            </div>
          </form>
        )}

        {/* Lista de movimientos (tarjetas desplegables) */}
        <div className="bg-white rounded-2xl p-5 border border-[#E3DFD8] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-primary">
              {isHoy ? "Movimientos de hoy" : `Movimientos del ${selectedDate}`}
            </h3>
            {movements.length > 0 && (
              <span className="text-xs font-medium text-primary-light/75 bg-surface-2 rounded-full px-3 py-1">
                {movements.length} {movements.length === 1 ? "registro" : "registros"}
              </span>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-primary-light/70 text-center py-10">Cargando...</p>
          ) : movements.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">ðŸ¦</p>
              <p className="text-sm text-primary-light/70">Sin movimientos ese dÃ­a</p>
            </div>
          ) : (
            <div className="space-y-2">
              {movements.map((m) => {
                const info = tipoLabel[m.tipo] || tipoLabel.ajuste;
                const IconComponent = info.Icon;
                const expanded = expandedId === m.id;
                return (
                  <div key={m.id} className="rounded-xl border border-[#E3DFD8] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : m.id)}
                      className="w-full bg-surface-1/60 px-4 py-3.5 flex items-center gap-3 hover:bg-surface-1 transition text-left"
                    >
                      <div className={`w-10 h-10 rounded-xl ${info.bg} flex items-center justify-center flex-shrink-0`}>
                        <IconComponent size={20} stroke={2} className={info.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary">
                          {info.text}
                          {m.clienteNombre && (
                            <span className="font-normal text-primary-light/75"> â€” {m.clienteNombre}</span>
                          )}
                        </p>
                        <p className="text-xs text-primary-light/70 truncate">{formatearHora(m.fecha)}</p>
                      </div>
                      <p className={`text-sm font-bold shrink-0 ${
                        m.tipo === "recargo_vencimiento"
                          ? "text-gold"
                          : m.monto >= 0 ? "text-al-dia" : "text-mora"
                      }`}>
                        {m.tipo === "recargo_vencimiento"
                          ? `+$${formatearMonto(m.montoRecargo ?? 0)} (deuda)`
                          : `${m.monto >= 0 ? "+" : ""}$${formatearMonto(Math.abs(m.monto))}`}
                      </p>
                      <IconChevronDown
                        size={18}
                        className={`text-primary-light/50 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                    </button>

                    {expanded && (
                      <div className="px-4 py-3 border-t border-[#E3DFD8] bg-white space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-primary-light/70">Fecha</span>
                          <span className="text-primary">{formatearFechaLarga(m.fecha)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-primary-light/70">Hora</span>
                          <span className="text-primary">{formatearHora(m.fecha)}</span>
                        </div>
                        {m.clienteNombre && (
                          <div className="flex justify-between">
                            <span className="text-primary-light/70">Cliente</span>
                            <span className="text-primary">{m.clienteNombre}</span>
                          </div>
                        )}
                        {m.cobradorNombre && (
                          <div className="flex justify-between">
                            <span className="text-primary-light/70">Registrado por</span>
                            <span className="text-primary">{m.cobradorNombre}</span>
                          </div>
                        )}
                        {m.tipo === "cobro" && (
                          <>
                            {m.tipoPago && (
                              <div className="flex justify-between border-t border-[#E3DFD8] pt-2 mt-1">
                                <span className="text-primary-light/70">Tipo de cobro</span>
                                <span className="font-medium text-primary">
                                  {m.tipoPago} {m.detallePagoInfo ? `â€” ${m.detallePagoInfo}` : ""}
                                </span>
                              </div>
                            )}
                            {m.estadoFinalLabel && (
                              <div className="flex justify-between">
                                <span className="text-primary-light/70">Estado tras cobro</span>
                                <span className={`font-semibold ${
                                  m.estadoFinalLabel === "En mora"
                                    ? "text-mora"
                                    : m.estadoFinalLabel === "Adelantado"
                                    ? "text-adelanto"
                                    : "text-al-dia"
                                }`}>
                                  {m.estadoFinalLabel} {m.detalleEstadoFinal ? `(${m.detalleEstadoFinal})` : ""}
                                </span>
                              </div>
                            )}
                            {m.saldoRestante != null && (
                              <div className="flex justify-between">
                                <span className="text-primary-light/70">Saldo pendiente</span>
                                <span className="font-medium text-primary">${formatearMonto(m.saldoRestante)}</span>
                              </div>
                            )}
                          </>
                        )}
                        {m.nota && (
                          <div className="flex justify-between gap-3">
                            <span className="text-primary-light/70 shrink-0">Nota</span>
                            <span className="text-primary text-right">{m.nota}</span>
                          </div>
                        )}
                        {esEliminable(m.tipo) ? (
                          <button
                            onClick={() => setMovimientoAEliminar(m)}
                            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-mora hover:text-mora"
                          >
                            <IconTrash size={14} stroke={2} />
                            Eliminar este movimiento
                          </button>
                        ) : (
                          m.tipo === TIPOS_MOVIMIENTO.COBRO && (
                            <button
                              onClick={() => setMovimientoACorregir(m)}
                              className="mt-2 flex items-center gap-1.5 text-xs font-medium text-gold hover:text-amber-700"
                            >
                              <IconEdit size={14} stroke={2} />
                              Solicitar correcciÃ³n
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

