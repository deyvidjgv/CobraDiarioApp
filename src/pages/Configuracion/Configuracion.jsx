import { useState, useEffect } from "react";
import Header from "../../components/layout/Header";
import ConfirmarPasswordModal from "../../components/ui/ConfirmarPasswordModal";
import { useAuth } from "../../context/AuthContext";
import { getSettings, saveSettings } from "../../firebase/firestore";
import { cerrarSesion, cambiarPassword, verificarPassword } from "../../firebase/auth";
import {
  getEstado,
  suscribirInstalacion,
  pedirInstalacion,
  esIOS,
} from "../../pwa/installPrompt";
import { useNavigate } from "react-router-dom";
import { useClients } from "../../hooks/useClients";
import { useLoans } from "../../hooks/useLoans";
import { useLoanActions } from "../../hooks/useLoanActions";
import { useCobradiarios } from "../../hooks/useCobradiarios";
import { bloquearEntradaSoloNumerosConDecimal, formatearMonto } from "../../logic/formato";
import {
  IconUser,
  IconShieldLock,
  IconSettings2,
  IconDeviceMobile,
  IconAlertTriangle,
  IconLogout,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconBuildingStore,
} from "@tabler/icons-react";

export default function Configuracion() {
  const navigate = useNavigate();
  const { orgId, usuario, isAdmin } = useAuth();
  const [form, setForm] = useState({
    interesDefault: 20,
    seguroActivo: false,
    seguroTipo: "porcentaje",
    seguroValor: 5,
    vencimientoActivo: false,
    vencimientoModoInicial: "al_vencer",
    vencimientoPorcentaje: 20,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nombreNegocio, setNombreNegocio] = useState("");
  const [guardandoNegocio, setGuardandoNegocio] = useState(false);
  const [negocioGuardado, setNegocioGuardado] = useState(false);
  const [showDeleteCredit, setShowDeleteCredit] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState("");
  const [filtroCob, setFiltroCob] = useState("");
  const [filtroClient, setFiltroClient] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [processingDelete, setProcessingDelete] = useState(false);
  const [installState, setInstallState] = useState(getEstado());
  const [loans, setLoans] = useState([]);
  const { clients } = useClients();
  const { loans: activeLoans } = useLoans(true);
  const { cobradiarios } = useCobradiarios();
  const { deleteLoan } = useLoanActions();

  // Cambio de contraseña (Seguridad)
  const [pwd, setPwd] = useState({ actual: "", nueva: "", confirmar: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [cambiandoPwd, setCambiandoPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState(null); // { tipo: "ok"|"error", texto }

  useEffect(() => {
    if (!orgId) return;
    getSettings(orgId).then((s) => {
      if (s) {
        setForm((f) => ({ ...f, ...s }));
        setNombreNegocio(s.nombreNegocio || "");
      }
      setLoading(false);
    });
  }, [orgId]);

  async function handleGuardarNegocio() {
    if (!orgId || !isAdmin) return;
    setGuardandoNegocio(true);
    try {
      await saveSettings(orgId, { nombreNegocio: nombreNegocio.trim() });
      setNegocioGuardado(true);
      setTimeout(() => setNegocioGuardado(false), 2000);
    } catch (err) {
      alert("Error al guardar: " + err.message);
    } finally {
      setGuardandoNegocio(false);
    }
  }

  // Estado de instalación de la PWA (store global, el evento se captura
  // desde el arranque de la app — ver pwa/installPrompt.js)
  useEffect(() => {
    const unsub = suscribirInstalacion((estado) => setInstallState(estado));
    return unsub;
  }, []);

  async function handleInstallApp() {
    await pedirInstalacion();
  }

  useEffect(() => {
    setLoans(activeLoans || []);
  }, [activeLoans]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings(orgId, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    if (!confirm("¿Cerrar sesión?")) return;
    await cerrarSesion();
    navigate("/login", { replace: true });
  }

  async function handleCambiarPassword(e) {
    e.preventDefault();
    setPwdMsg(null);
    if (pwd.nueva !== pwd.confirmar) {
      setPwdMsg({ tipo: "error", texto: "La confirmación no coincide con la nueva contraseña." });
      return;
    }
    setCambiandoPwd(true);
    try {
      await cambiarPassword(pwd.actual, pwd.nueva);
      setPwd({ actual: "", nueva: "", confirmar: "" });
      setPwdMsg({ tipo: "ok", texto: "Contraseña actualizada correctamente." });
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setPwdMsg({ tipo: "error", texto: "La contraseña actual no es correcta." });
      } else {
        setPwdMsg({ tipo: "error", texto: err.message || "No se pudo cambiar la contraseña." });
      }
    } finally {
      setCambiandoPwd(false);
    }
  }

  async function handleDeleteCredit(password) {
    setPasswordError("");
    setProcessingDelete(true);
    try {
      await verificarYDelete(password);
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setPasswordError("Contraseña incorrecta. Inténtalo de nuevo.");
      } else {
        setPasswordError(err.message || "Error al verificar la contraseña");
      }
    } finally {
      setProcessingDelete(false);
    }
  }

  async function verificarYDelete(password) {
    await verificarPassword(password);
    await deleteLoan(selectedLoanId);
    setShowDeleteCredit(false);
    setSelectedLoanId("");
    alert("Crédito eliminado correctamente.");
  }

  const inputCls =
    "mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition disabled:bg-surface-1 disabled:text-gray-400";

  if (loading) {
    return (
      <div className="pb-24">
        <Header title="Ajustes" loading={true} />
        <p className="p-6 text-sm text-gray-400">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <Header title="Ajustes" />

      <div className="p-4 space-y-5 max-w-2xl">
        {/* ═══ 0. MI NEGOCIO ═══ */}
        <section className="card p-4 space-y-3">
          <h3 className="section-title">
            <IconBuildingStore size={16} stroke={2} className="text-primary" /> Mi negocio
          </h3>
          <p className="text-xs text-gray-400">
            El nombre aparece en los encabezados de tus reportes (PDF y Excel).
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={nombreNegocio}
              disabled={!isAdmin}
              onChange={(e) => setNombreNegocio(e.target.value)}
              placeholder="Ej. Préstamos Doña Ana"
              className="flex-1 rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition disabled:bg-surface-1 disabled:text-gray-400"
            />
            {isAdmin && (
              <button
                type="button"
                onClick={handleGuardarNegocio}
                disabled={guardandoNegocio}
                className="rounded-xl bg-primary text-white font-medium px-5 text-sm hover:bg-primary-light transition disabled:opacity-50"
              >
                {guardandoNegocio ? "Guardando..." : negocioGuardado ? "✓ Guardado" : "Guardar"}
              </button>
            )}
          </div>
          {!isAdmin && (
            <p className="text-xs text-amber-600">Solo el administrador puede cambiar el nombre del negocio.</p>
          )}
        </section>

        {/* ═══ 1. CUENTA Y SESIÓN ═══ */}
        <section className="card p-4 space-y-3">
          <h3 className="section-title">
            <IconUser size={16} stroke={2} className="text-primary" /> Cuenta y sesión
          </h3>
          <div className="flex items-center gap-3 rounded-xl bg-surface-1 p-3">
            <div className="w-10 h-10 rounded-full bg-primary-bg text-primary flex items-center justify-center font-semibold shrink-0">
              {usuario?.email?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{usuario?.email}</p>
              <p className="text-xs text-gray-400">
                {isAdmin ? "Administrador de la organización" : "Cobrador diario"}
              </p>
            </div>
            <span
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 ${
                isAdmin ? "bg-primary-bg text-primary" : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {isAdmin ? "Admin" : "Cobradiario"}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full border border-red-200 bg-red-50 text-red-600 font-medium rounded-xl py-3 hover:bg-red-100 transition flex items-center justify-center gap-2"
          >
            <IconLogout size={18} stroke={1.5} />
            Cerrar sesión
          </button>
        </section>

        {/* ═══ 2. SEGURIDAD ═══ */}
        <section className="card p-4 space-y-3">
          <h3 className="section-title">
            <IconShieldLock size={16} stroke={2} className="text-primary" /> Seguridad
          </h3>
          <p className="text-xs text-gray-400">
            Cambia tu contraseña de acceso. Necesitas la actual para confirmar tu identidad.
          </p>
          <form onSubmit={handleCambiarPassword} className="space-y-2.5">
            {[
              { key: "actual", label: "Contraseña actual", ph: "••••••••" },
              { key: "nueva", label: "Nueva contraseña", ph: "Mínimo 6 caracteres" },
              { key: "confirmar", label: "Confirmar nueva contraseña", ph: "Repite la nueva contraseña" },
            ].map(({ key, label, ph }) => (
              <label key={key} className="block">
                <span className="text-xs font-medium text-gray-600">{label}</span>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    value={pwd[key]}
                    placeholder={ph}
                    onChange={(e) => setPwd((p) => ({ ...p, [key]: e.target.value }))}
                    className={inputCls + " pr-10"}
                    autoComplete={key === "actual" ? "current-password" : "new-password"}
                  />
                  {key === "actual" && (
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showPwd ? "Ocultar contraseñas" : "Mostrar contraseñas"}
                    >
                      {showPwd ? <IconEyeOff size={18} stroke={1.5} /> : <IconEye size={18} stroke={1.5} />}
                    </button>
                  )}
                </div>
              </label>
            ))}
            {pwdMsg && (
              <p className={`text-xs ${pwdMsg.tipo === "ok" ? "text-emerald-600" : "text-red-600"}`}>
                {pwdMsg.texto}
              </p>
            )}
            <button
              type="submit"
              disabled={cambiandoPwd}
              className="w-full bg-primary text-white font-medium rounded-xl py-3 hover:bg-primary-light transition disabled:opacity-50"
            >
              {cambiandoPwd ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          </form>
        </section>

        {/* ═══ 3. REGLAS DE NEGOCIO ═══ */}
        <section className="card p-4">
          <h3 className="section-title mb-1">
            <IconSettings2 size={16} stroke={2} className="text-primary" /> Reglas de negocio
          </h3>
          {!isAdmin && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-2 mb-3">
              Solo el administrador puede modificar estas reglas.
            </p>
          )}
          <form onSubmit={handleSave} className="space-y-5">
            {/* Interés */}
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Porcentaje de cobro (interés %)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                disabled={!isAdmin}
                value={form.interesDefault}
                onChange={(e) => setForm({ ...form, interesDefault: Number(e.target.value) })}
                onKeyDown={bloquearEntradaSoloNumerosConDecimal}
                className={inputCls}
              />
              <p className="text-xs text-gray-400 mt-1">
                Valor por defecto al crear créditos nuevos. No afecta créditos existentes.
              </p>
            </label>

            {/* Seguro */}
            <div className="pt-4 border-t border-[#E5E5EA] space-y-3">
              <h4 className="text-sm font-semibold text-gray-800">Seguro / Comisión (cobro inicial)</h4>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  disabled={!isAdmin}
                  checked={form.seguroActivo}
                  onChange={(e) => setForm({ ...form, seguroActivo: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                />
                <span className="text-sm font-medium text-gray-700">Activar seguro por defecto</span>
              </label>
              {form.seguroActivo && (
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <label className="block">
                    <span className="text-xs text-gray-500">Tipo</span>
                    <select
                      value={form.seguroTipo}
                      disabled={!isAdmin}
                      onChange={(e) => setForm({ ...form, seguroTipo: e.target.value })}
                      className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-3 py-2 text-sm bg-white disabled:bg-surface-1"
                    >
                      <option value="porcentaje">Porcentaje (%)</option>
                      <option value="fijo">Monto fijo ($)</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500">Valor</span>
                    <input
                      type="number"
                      min="0"
                      step={form.seguroTipo === "porcentaje" ? "0.1" : "1"}
                      disabled={!isAdmin}
                      value={form.seguroValor}
                      onChange={(e) => setForm({ ...form, seguroValor: Number(e.target.value) })}
                      onKeyDown={bloquearEntradaSoloNumerosConDecimal}
                      className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-3 py-2 text-sm disabled:bg-surface-1"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Vencimiento */}
            <div className="pt-4 border-t border-[#E5E5EA] space-y-3">
              <h4 className="text-sm font-semibold text-gray-800">Interés por vencimiento / mora</h4>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  disabled={!isAdmin}
                  checked={form.vencimientoActivo}
                  onChange={(e) => setForm({ ...form, vencimientoActivo: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                />
                <span className="text-sm font-medium text-gray-700">Activar recargo por vencimiento</span>
              </label>
              {form.vencimientoActivo && (
                <div className="space-y-3 pl-6">
                  <label className="block">
                    <span className="text-xs text-gray-500">Modo del primer corte</span>
                    <select
                      value={form.vencimientoModoInicial}
                      disabled={!isAdmin}
                      onChange={(e) => setForm({ ...form, vencimientoModoInicial: e.target.value })}
                      className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-3 py-2 text-sm bg-white disabled:bg-surface-1"
                    >
                      <option value="al_vencer">Al finalizar todo el plazo pactado</option>
                      <option value="mensual">A los 30 días de iniciar el crédito</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500">Recargo en cada corte (%)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      disabled={!isAdmin}
                      value={form.vencimientoPorcentaje}
                      onChange={(e) => setForm({ ...form, vencimientoPorcentaje: Number(e.target.value) })}
                      onKeyDown={bloquearEntradaSoloNumerosConDecimal}
                      className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-3 py-2 text-sm disabled:bg-surface-1"
                    />
                  </label>
                </div>
              )}
            </div>

            {isAdmin && (
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-primary hover:bg-primary-light text-white font-medium rounded-xl py-3 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? "Guardando..." : saved ? (<><IconCheck size={18} stroke={2} /> Guardado</>) : "Guardar configuración"}
              </button>
            )}
          </form>
        </section>

        {/* ═══ 4. APLICACIÓN ═══ */}
        <section className="card p-4 space-y-3">
          <h3 className="section-title">
            <IconDeviceMobile size={16} stroke={2} className="text-primary" /> Aplicación
          </h3>

          {installState.instalada ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 text-emerald-700 px-3 py-2.5 text-sm">
              <IconCheck size={18} stroke={2} />
              La app está instalada en este dispositivo.
            </div>
          ) : installState.puedeInstalar ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500 flex-1">
                Instala la app para usarla como aplicación nativa: icono en el inicio, pantalla
                completa y apertura sin navegador.
              </p>
              <button
                type="button"
                onClick={handleInstallApp}
                className="rounded-xl bg-primary text-white px-4 py-2.5 text-sm font-medium hover:bg-primary-light transition shrink-0"
              >
                Instalar app
              </button>
            </div>
          ) : esIOS() ? (
            <div className="rounded-xl bg-surface-1 p-3 space-y-2">
              <p className="text-xs text-gray-600 font-medium">
                En iPhone/iPad la instalación es manual:
              </p>
              <ol className="text-xs text-gray-500 list-decimal list-inside space-y-1">
                <li>Abre este sitio en el navegador Safari</li>
                <li>Toca el botón <strong>Compartir</strong> (cuadro con flecha arriba)</li>
                <li>Elige <strong>"Agregar a pantalla de inicio"</strong></li>
                <li>Confirma con <strong>"Agregar"</strong></li>
              </ol>
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              La instalación estará disponible en navegadores compatibles cuando el dispositivo lo
              permita (Chrome/Edge en Android, o cualquier navegador de escritorio moderno desde el
              menú del navegador → "Instalar aplicación").
            </p>
          )}
        </section>

        {/* ═══ 5. ZONA DE PELIGRO (solo Admin) ═══ */}
        {isAdmin && (
          <section className="rounded-2xl border border-red-200 bg-red-50/60 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2">
              <IconAlertTriangle size={16} stroke={2} /> Zona de peligro
            </h3>
            <p className="text-xs text-red-600">
              Elimina un crédito activo y todos sus movimientos. Altera el flujo de caja histórico,
              no se puede deshacer y queda registrado en auditoría. Para solo desactivar un crédito
              sin borrar historial, usa "Anular" en su página de detalle.
            </p>

            {/* Filtro 1: cobradiario */}
            <label className="block">
              <span className="text-xs font-medium text-red-700">Cobradiario</span>
              <select
                value={filtroCob}
                onChange={(e) => {
                  setFiltroCob(e.target.value);
                  setFiltroClient("");
                  setSelectedLoanId("");
                }}
                className="mt-1 block w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-300 transition"
              >
                <option value="">Todos los cobradiarios</option>
                {cobradiarios.map((c) => (
                  <option key={c.uid} value={c.uid}>
                    {c.nombre || c.email}
                  </option>
                ))}
              </select>
            </label>

            {/* Filtro 2: cliente (según cobradiario) */}
            <label className="block">
              <span className="text-xs font-medium text-red-700">Cliente</span>
              <select
                value={filtroClient}
                onChange={(e) => {
                  setFiltroClient(e.target.value);
                  setSelectedLoanId("");
                }}
                className="mt-1 block w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-300 transition"
              >
                <option value="">Todos los clientes</option>
                {clients
                  .filter((c) => !filtroCob || c.cobradiarioId === filtroCob)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
              </select>
            </label>

            {/* Selección del crédito (filtrada) */}
            <label className="block">
              <span className="text-xs font-medium text-red-700">Crédito activo</span>
              <select
                value={selectedLoanId}
                onChange={(e) => setSelectedLoanId(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-300 transition"
              >
                <option value="">
                  {filtroClient ? "Selecciona un crédito" : "Filtra por cliente para ver sus créditos"}
                </option>
                {loans
                  .filter((l) => !filtroClient || l.clientId === filtroClient)
                  .map((loan) => {
                    const client = clients.find((c) => c.id === loan.clientId);
                    return (
                      <option key={loan.id} value={loan.id}>
                        {client?.nombre || "Sin cliente"} — {loan.frecuencia} · Capital $
                        {formatearMonto(loan.capital)} · Saldo ${formatearMonto(loan.saldoPendiente ?? 0)}
                      </option>
                    );
                  })}
              </select>
            </label>

            {/* Resumen antes de eliminar */}
            {(() => {
              const loan = loans.find((l) => l.id === selectedLoanId);
              if (!loan) return null;
              const client = clients.find((c) => c.id === loan.clientId);
              const cob = cobradiarios.find((c) => c.uid === loan.cobradiarioId);
              return (
                <div className="rounded-xl bg-white border border-red-200 p-3 space-y-1.5 text-sm">
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                    Vas a eliminar:
                  </p>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cliente</span>
                    <span className="font-medium text-gray-800">{client?.nombre || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cobradiario dueño</span>
                    <span className="font-medium text-gray-800">{cob?.nombre || cob?.email || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Capital / Saldo</span>
                    <span className="font-medium text-gray-800" translate="no">
                      ${formatearMonto(loan.capital)} / ${formatearMonto(loan.saldoPendiente ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cuotas</span>
                    <span className="font-medium text-gray-800">
                      {loan.numeroCuotas} × ${formatearMonto(loan.cuota)} ({loan.frecuencia})
                    </span>
                  </div>
                </div>
              );
            })()}

            <button
              type="button"
              onClick={() => setShowDeleteCredit(true)}
              disabled={!selectedLoanId}
              className="w-full rounded-xl bg-red-600 text-white text-sm font-semibold py-3 hover:bg-red-700 transition disabled:opacity-50"
            >
              Eliminar crédito seleccionado
            </button>
          </section>
        )}

        <p className="text-center text-xs text-gray-300">Cobro Diario v0.1.0</p>
      </div>

      <ConfirmarPasswordModal
        isOpen={showDeleteCredit}
        title="Eliminar crédito"
        description="Verifica tu contraseña para autorizar la eliminación del crédito seleccionado."
        warning="⚠ Esta acción eliminará el crédito y todos sus movimientos asociados."
        onConfirm={handleDeleteCredit}
        onCancel={() => {
          setShowDeleteCredit(false);
          setPasswordError("");
        }}
        loading={processingDelete}
        error={passwordError}
        confirmText="Eliminar crédito"
      />
    </div>
  );
}
