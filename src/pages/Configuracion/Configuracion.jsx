import { useState, useEffect } from "react";
import Header from "../../components/layout/Header";
import ConfirmarPasswordModal from "../../components/ui/ConfirmarPasswordModal";
import SeccionAcordeon from "../../components/ui/SeccionAcordeon";
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
import { useBackup } from "../../hooks/useBackup";
import { esRespaldoValido, resumenRespaldo } from "../../logic/backup";
import { bloquearEntradaSoloNumerosConDecimal, formatearMonto, formatearFecha } from "../../logic/formato";
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
  IconDownload,
  IconUpload,
  IconDatabase,
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
  const { exportarRespaldo, restaurarRespaldo } = useBackup();

  // Respaldo y restauración
  const [descargando, setDescargando] = useState(false);
  const [showDescargarPassword, setShowDescargarPassword] = useState(false);
  const [descargarError, setDescargarError] = useState("");
  const [archivoRespaldo, setArchivoRespaldo] = useState(null);
  const [archivoNombre, setArchivoNombre] = useState("");
  const [archivoError, setArchivoError] = useState("");
  const [entiendoRestaurar, setEntiendoRestaurar] = useState(false);
  const [showRestaurarPassword, setShowRestaurarPassword] = useState(false);
  const [restaurarError, setRestaurarError] = useState("");
  const [restaurando, setRestaurando] = useState(false);
  const [progresoRestaurar, setProgresoRestaurar] = useState(null);
  const [restauracionCompleta, setRestauracionCompleta] = useState(false);

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

  // ─── Respaldo y restauración ───────────────────────────────

  function descargarComoArchivo(data, nombreArchivo) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleConfirmarDescarga(password) {
    setDescargarError("");
    setDescargando(true);
    try {
      await verificarPassword(password);
      const data = await exportarRespaldo();
      descargarComoArchivo(data, `respaldo-${new Date().toISOString().slice(0, 10)}.json`);
      setShowDescargarPassword(false);
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setDescargarError("Contraseña incorrecta. Inténtalo de nuevo.");
      } else {
        setDescargarError(err.message || "No se pudo generar el respaldo.");
      }
    } finally {
      setDescargando(false);
    }
  }

  function handleSeleccionarArchivo(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo si se corrige algo
    if (!file) return;

    setArchivoError("");
    setArchivoRespaldo(null);
    setEntiendoRestaurar(false);
    setRestauracionCompleta(false);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!esRespaldoValido(data, orgId)) {
          setArchivoError("El respaldo no pertenece a esta organización o no tiene un formato válido.");
          return;
        }
        setArchivoRespaldo(data);
        setArchivoNombre(file.name);
      } catch {
        setArchivoError("No se pudo leer el archivo. ¿Seguro que es el .json del respaldo?");
      }
    };
    reader.onerror = () => setArchivoError("No se pudo leer el archivo.");
    reader.readAsText(file);
  }

  async function handleConfirmarRestauracion(password) {
    setRestaurarError("");
    setRestaurando(true);
    try {
      await verificarPassword(password);

      // Copia de seguridad del estado actual, por si la restauración no
      // era lo que se quería — se descarga sola, sin pedir nada más.
      const snapshotActual = await exportarRespaldo();
      descargarComoArchivo(
        snapshotActual,
        `respaldo-antes-de-restaurar-${new Date().toISOString().slice(0, 10)}.json`
      );

      await restaurarRespaldo(archivoRespaldo, { onProgress: setProgresoRestaurar });

      setShowRestaurarPassword(false);
      setRestauracionCompleta(true);
      setArchivoRespaldo(null);
      setArchivoNombre("");
      setEntiendoRestaurar(false);
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setRestaurarError("Contraseña incorrecta. Inténtalo de nuevo.");
      } else {
        setRestaurarError(err.message || "No se pudo restaurar el respaldo.");
      }
    } finally {
      setRestaurando(false);
      setProgresoRestaurar(null);
    }
  }

  const inputCls =
    "mt-1 block w-full rounded-xl border border-line px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition disabled:bg-surface-1 disabled:text-primary-light/70";

  if (loading) {
    return (
      <div className="pb-24">
        <Header title="Ajustes" loading={true} />
        <p className="p-6 text-sm text-primary-light/70">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <Header title="Ajustes" />

      <div className="p-4 space-y-4 max-w-2xl">
        <SeccionAcordeon
          title="General"
          icon={<IconUser size={16} stroke={2} className="text-primary" />}
          defaultOpen
        >
        {/* ═══ MI NEGOCIO ═══ */}
        <section className="card p-4 space-y-3">
          <h3 className="section-title">
            <IconBuildingStore size={16} stroke={2} className="text-primary" /> Mi negocio
          </h3>
          <p className="text-xs text-primary-light/70">
            El nombre aparece en los encabezados de tus reportes (PDF y Excel).
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={nombreNegocio}
              disabled={!isAdmin}
              onChange={(e) => setNombreNegocio(e.target.value)}
              placeholder="Ej. Préstamos Doña Ana"
              className="flex-1 rounded-xl border border-line px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition disabled:bg-surface-1 disabled:text-primary-light/70"
            />
            {isAdmin && (
              <button
                type="button"
                onClick={handleGuardarNegocio}
                disabled={guardandoNegocio}
                className="rounded-xl bg-gold text-surface-1 font-medium px-5 text-sm hover:bg-gold/90 transition disabled:opacity-50"
              >
                {guardandoNegocio ? "Guardando..." : negocioGuardado ? "✓ Guardado" : "Guardar"}
              </button>
            )}
          </div>
          {!isAdmin && (
            <p className="text-xs text-gold">Solo el administrador puede cambiar el nombre del negocio.</p>
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
              <p className="text-sm font-medium text-primary truncate">{usuario?.email}</p>
              <p className="text-xs text-primary-light/70">
                {isAdmin ? "Administrador de la organización" : "Cobrador diario"}
              </p>
            </div>
            <span
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 ${
                isAdmin ? "bg-primary-bg text-primary" : "bg-al-dia/10 text-al-dia"
              }`}
            >
              {isAdmin ? "Admin" : "Cobradiario"}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full border border-mora/20 bg-mora/10 text-mora font-medium rounded-xl py-3 hover:bg-mora/15 transition flex items-center justify-center gap-2"
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
          <p className="text-xs text-primary-light/70">
            Cambia tu contraseña de acceso. Necesitas la actual para confirmar tu identidad.
          </p>
          <form onSubmit={handleCambiarPassword} className="space-y-2.5">
            {[
              { key: "actual", label: "Contraseña actual", ph: "••••••••" },
              { key: "nueva", label: "Nueva contraseña", ph: "Mínimo 6 caracteres" },
              { key: "confirmar", label: "Confirmar nueva contraseña", ph: "Repite la nueva contraseña" },
            ].map(({ key, label, ph }) => (
              <label key={key} className="block">
                <span className="text-xs font-medium text-primary-light">{label}</span>
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-light/70 hover:text-primary-light"
                      aria-label={showPwd ? "Ocultar contraseñas" : "Mostrar contraseñas"}
                    >
                      {showPwd ? <IconEyeOff size={18} stroke={1.5} /> : <IconEye size={18} stroke={1.5} />}
                    </button>
                  )}
                </div>
              </label>
            ))}
            {pwdMsg && (
              <p className={`text-xs ${pwdMsg.tipo === "ok" ? "text-al-dia" : "text-mora"}`}>
                {pwdMsg.texto}
              </p>
            )}
            <button
              type="submit"
              disabled={cambiandoPwd}
              className="w-full bg-gold text-surface-1 font-medium rounded-xl py-3 hover:bg-gold/90 transition disabled:opacity-50"
            >
              {cambiandoPwd ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          </form>
        </section>

        {/* ═══ APLICACIÓN ═══ */}
        <section className="card p-4 space-y-3">
          <h3 className="section-title">
            <IconDeviceMobile size={16} stroke={2} className="text-primary" /> Aplicación
          </h3>

          {installState.instalada ? (
            <div className="flex items-center gap-2 rounded-xl bg-al-dia/10 text-al-dia px-3 py-2.5 text-sm">
              <IconCheck size={18} stroke={2} />
              La app está instalada en este dispositivo.
            </div>
          ) : installState.puedeInstalar ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-primary-light/75 flex-1">
                Instala la app para usarla como aplicación nativa: icono en el inicio, pantalla
                completa y apertura sin navegador.
              </p>
              <button
                type="button"
                onClick={handleInstallApp}
                className="rounded-xl bg-gold text-surface-1 px-4 py-2.5 text-sm font-medium hover:bg-gold/90 transition shrink-0"
              >
                Instalar app
              </button>
            </div>
          ) : esIOS() ? (
            <div className="rounded-xl bg-surface-1 p-3 space-y-2">
              <p className="text-xs text-primary-light font-medium">
                En iPhone/iPad la instalación es manual:
              </p>
              <ol className="text-xs text-primary-light/75 list-decimal list-inside space-y-1">
                <li>Abre este sitio en el navegador Safari</li>
                <li>Toca el botón <strong>Compartir</strong> (cuadro con flecha arriba)</li>
                <li>Elige <strong>"Agregar a pantalla de inicio"</strong></li>
                <li>Confirma con <strong>"Agregar"</strong></li>
              </ol>
            </div>
          ) : (
            <p className="text-xs text-primary-light/70">
              La instalación estará disponible en navegadores compatibles cuando el dispositivo lo
              permita (Chrome/Edge en Android, o cualquier navegador de escritorio moderno desde el
              menú del navegador → "Instalar aplicación").
            </p>
          )}
        </section>
        </SeccionAcordeon>

        <SeccionAcordeon
          title="Reglas de negocio"
          icon={<IconSettings2 size={16} stroke={2} className="text-primary" />}
        >
        {/* ═══ REGLAS DE NEGOCIO ═══ */}
        <section className="card p-4">
          <h3 className="section-title mb-1">
            <IconSettings2 size={16} stroke={2} className="text-primary" /> Reglas de negocio
          </h3>
          {!isAdmin && (
            <p className="text-xs text-gold bg-gold/10 border border-gold/25 rounded-lg p-2 mb-3">
              Solo el administrador puede modificar estas reglas.
            </p>
          )}
          <form onSubmit={handleSave} className="space-y-5">
            {/* Interés */}
            <label className="block">
              <span className="text-sm font-medium text-primary">Porcentaje de cobro (interés %)</span>
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
              <p className="text-xs text-primary-light/70 mt-1">
                Valor por defecto al crear créditos nuevos. No afecta créditos existentes.
              </p>
            </label>

            {/* Seguro */}
            <div className="pt-4 border-t border-line space-y-3">
              <h4 className="text-sm font-semibold text-primary">Seguro / Comisión (cobro inicial)</h4>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  disabled={!isAdmin}
                  checked={form.seguroActivo}
                  onChange={(e) => setForm({ ...form, seguroActivo: e.target.checked })}
                  className="rounded border-primary/20 text-primary focus:ring-primary disabled:opacity-50"
                />
                <span className="text-sm font-medium text-primary">Activar seguro por defecto</span>
              </label>
              {form.seguroActivo && (
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <label className="block">
                    <span className="text-xs text-primary-light/75">Tipo</span>
                    <select
                      value={form.seguroTipo}
                      disabled={!isAdmin}
                      onChange={(e) => setForm({ ...form, seguroTipo: e.target.value })}
                      className="mt-1 block w-full rounded-xl border border-line px-3 py-2 text-sm bg-surface disabled:bg-surface-1"
                    >
                      <option value="porcentaje">Porcentaje (%)</option>
                      <option value="fijo">Monto fijo ($)</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs text-primary-light/75">Valor</span>
                    {form.seguroTipo === "fijo" ? (
                      // Monto en pesos: con separador de miles mientras se
                      // escribe, igual que el resto de campos de dinero.
                      <input
                        type="text"
                        inputMode="numeric"
                        disabled={!isAdmin}
                        value={form.seguroValor ? formatearMonto(Number(form.seguroValor)) : ""}
                        onChange={(e) =>
                          setForm({ ...form, seguroValor: Number(e.target.value.replace(/\D/g, "")) || 0 })
                        }
                        onKeyDown={bloquearEntradaSoloNumerosConDecimal}
                        className="mt-1 block w-full rounded-xl border border-line px-3 py-2 text-sm disabled:bg-surface-1"
                      />
                    ) : (
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        disabled={!isAdmin}
                        value={form.seguroValor}
                        onChange={(e) => setForm({ ...form, seguroValor: Number(e.target.value) })}
                        onKeyDown={bloquearEntradaSoloNumerosConDecimal}
                        className="mt-1 block w-full rounded-xl border border-line px-3 py-2 text-sm disabled:bg-surface-1"
                      />
                    )}
                  </label>
                </div>
              )}
            </div>

            {/* Vencimiento */}
            <div className="pt-4 border-t border-line space-y-3">
              <h4 className="text-sm font-semibold text-primary">Interés por vencimiento / mora</h4>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  disabled={!isAdmin}
                  checked={form.vencimientoActivo}
                  onChange={(e) => setForm({ ...form, vencimientoActivo: e.target.checked })}
                  className="rounded border-primary/20 text-primary focus:ring-primary disabled:opacity-50"
                />
                <span className="text-sm font-medium text-primary">Activar recargo por vencimiento</span>
              </label>
              {form.vencimientoActivo && (
                <div className="space-y-3 pl-6">
                  <label className="block">
                    <span className="text-xs text-primary-light/75">Modo del primer corte</span>
                    <select
                      value={form.vencimientoModoInicial}
                      disabled={!isAdmin}
                      onChange={(e) => setForm({ ...form, vencimientoModoInicial: e.target.value })}
                      className="mt-1 block w-full rounded-xl border border-line px-3 py-2 text-sm bg-surface disabled:bg-surface-1"
                    >
                      <option value="al_vencer">Al finalizar todo el plazo pactado</option>
                      <option value="mensual">A los 30 días de iniciar el crédito</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs text-primary-light/75">Recargo en cada corte (%)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      disabled={!isAdmin}
                      value={form.vencimientoPorcentaje}
                      onChange={(e) => setForm({ ...form, vencimientoPorcentaje: Number(e.target.value) })}
                      onKeyDown={bloquearEntradaSoloNumerosConDecimal}
                      className="mt-1 block w-full rounded-xl border border-line px-3 py-2 text-sm disabled:bg-surface-1"
                    />
                  </label>
                </div>
              )}
            </div>

            {isAdmin && (
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gold hover:bg-gold/90 text-surface-1 font-medium rounded-xl py-3 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? "Guardando..." : saved ? (<><IconCheck size={18} stroke={2} /> Guardado</>) : "Guardar configuración"}
              </button>
            )}
          </form>
        </section>

        </SeccionAcordeon>

        {isAdmin && (
        <SeccionAcordeon
          title="Zona de riesgo"
          icon={<IconAlertTriangle size={16} stroke={2} className="text-mora" />}
          tono="riesgo"
        >
        {/* ═══ RESPALDO Y RESTAURACIÓN ═══ */}
          <section className="card p-4 space-y-4">
            <div>
              <h3 className="section-title">
                <IconDatabase size={16} stroke={2} className="text-primary" /> Respaldo y restauración
              </h3>
              <p className="text-xs text-primary-light/70 mt-1">
                Descarga toda la información del negocio como archivo — tu plan de contingencia si
                algo llegara a fallar.
              </p>
            </div>

            {/* Descargar */}
            <div className="rounded-xl bg-surface-1 p-3.5 space-y-2.5">
              <p className="text-sm font-medium text-primary">Descargar respaldo completo</p>
              <p className="text-xs text-primary-light/70">
                Incluye clientes, créditos, movimientos de caja, correcciones, visitas, auditoría,
                cobradores y configuración.
              </p>
              <button
                type="button"
                onClick={() => setShowDescargarPassword(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold text-surface-1 font-medium py-2.5 text-sm hover:bg-gold/90 transition"
              >
                <IconDownload size={16} stroke={1.8} />
                Descargar respaldo (.json)
              </button>
            </div>

            {/* Restaurar */}
            <div className="rounded-xl border border-mora/20 bg-mora/5 p-3.5 space-y-3">
              <div>
                <p className="text-sm font-medium text-primary">Restaurar desde un archivo</p>
                <p className="text-xs text-mora mt-0.5">
                  Reemplaza clientes, créditos, movimientos de caja y configuración por los del
                  archivo. Correcciones, visitas, auditoría y cobradores no se borran ni se
                  sobreescriben — solo se agrega lo que falte (son registros protegidos que ni el
                  Admin puede alterar). Antes de ejecutar, se descarga sola una copia del estado
                  actual, por si acaso.
                </p>
              </div>

              <label className="flex items-center justify-center gap-2 rounded-xl border border-line bg-surface text-primary font-medium py-2.5 text-sm hover:bg-surface-2 transition cursor-pointer">
                <IconUpload size={16} stroke={1.8} />
                {archivoNombre || "Elegir archivo de respaldo (.json)"}
                <input type="file" accept=".json,application/json" onChange={handleSeleccionarArchivo} className="hidden" />
              </label>

              {archivoError && <p className="text-xs text-mora">{archivoError}</p>}

              {archivoRespaldo && (
                <div className="rounded-xl bg-surface border border-mora/20 p-3 space-y-2 text-sm">
                  <p className="text-xs text-primary-light/70">
                    Respaldo generado el {formatearFecha(archivoRespaldo.exportedAt)}
                  </p>
                  <div className="space-y-1">
                    {resumenRespaldo(archivoRespaldo).map(({ coleccion, cantidad }) => (
                      <div key={coleccion} className="flex justify-between text-xs">
                        <span className="text-primary-light/75">{coleccion}</span>
                        <span className="font-medium text-primary">{cantidad}</span>
                      </div>
                    ))}
                  </div>
                  <label className="flex items-start gap-2 pt-2 border-t border-line">
                    <input
                      type="checkbox"
                      checked={entiendoRestaurar}
                      onChange={(e) => setEntiendoRestaurar(e.target.checked)}
                      className="mt-0.5 rounded border-mora/40 text-mora focus:ring-mora"
                    />
                    <span className="text-xs text-mora">
                      Entiendo que esto reemplaza clientes, créditos, movimientos y configuración
                      actuales, y no se puede deshacer directamente (aparte de restaurar de nuevo
                      con la copia de seguridad automática).
                    </span>
                  </label>
                  <button
                    type="button"
                    disabled={!entiendoRestaurar}
                    onClick={() => setShowRestaurarPassword(true)}
                    className="w-full rounded-xl bg-mora text-surface-1 text-sm font-semibold py-2.5 hover:bg-mora/90 transition disabled:opacity-50"
                  >
                    Restaurar este respaldo
                  </button>
                  {progresoRestaurar && (
                    <p className="text-xs text-primary-light/70 text-center">
                      Paso {progresoRestaurar.paso}/{progresoRestaurar.totalPasos} —{" "}
                      {progresoRestaurar.mensaje}
                    </p>
                  )}
                </div>
              )}

              {restauracionCompleta && (
                <div className="flex items-center gap-2 rounded-xl bg-al-dia/10 text-al-dia px-3 py-2.5 text-sm">
                  <IconCheck size={18} stroke={2} />
                  Restauración completada correctamente.
                </div>
              )}
            </div>
          </section>

        {/* ═══ ZONA DE PELIGRO ═══ */}
          <section className="rounded-2xl border border-mora/20 bg-mora/10/60 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-mora flex items-center gap-2">
              <IconAlertTriangle size={16} stroke={2} /> Zona de peligro
            </h3>
            <p className="text-xs text-mora">
              Elimina un crédito activo y todos sus movimientos. Altera el flujo de caja histórico,
              no se puede deshacer y queda registrado en auditoría. Para solo desactivar un crédito
              sin borrar historial, usa "Anular" en su página de detalle.
            </p>

            {/* Filtro 1: cobradiario */}
            <label className="block">
              <span className="text-xs font-medium text-mora">Cobradiario</span>
              <select
                value={filtroCob}
                onChange={(e) => {
                  setFiltroCob(e.target.value);
                  setFiltroClient("");
                  setSelectedLoanId("");
                }}
                className="mt-1 block w-full rounded-xl border border-mora/20 bg-surface px-4 py-2.5 text-sm focus:outline-none focus:border-mora/40 focus:ring-1 focus:ring-red-300 transition"
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
              <span className="text-xs font-medium text-mora">Cliente</span>
              <select
                value={filtroClient}
                onChange={(e) => {
                  setFiltroClient(e.target.value);
                  setSelectedLoanId("");
                }}
                className="mt-1 block w-full rounded-xl border border-mora/20 bg-surface px-4 py-2.5 text-sm focus:outline-none focus:border-mora/40 focus:ring-1 focus:ring-red-300 transition"
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
              <span className="text-xs font-medium text-mora">Crédito activo</span>
              <select
                value={selectedLoanId}
                onChange={(e) => setSelectedLoanId(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-mora/20 bg-surface px-4 py-3 text-sm focus:outline-none focus:border-mora/40 focus:ring-1 focus:ring-red-300 transition"
              >
                <option value="">
                  {filtroClient ? "Selecciona un crédito" : "Filtra por cliente para ver sus créditos"}
                </option>
                {loans
                  .filter(
                    (l) =>
                      (!filtroCob || l.cobradiarioId === filtroCob) &&
                      (!filtroClient || l.clientId === filtroClient)
                  )
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
                <div className="rounded-xl bg-surface border border-mora/20 p-3 space-y-1.5 text-sm">
                  <p className="text-xs font-semibold text-mora uppercase tracking-wide">
                    Vas a eliminar:
                  </p>
                  <div className="flex justify-between">
                    <span className="text-primary-light/75">Cliente</span>
                    <span className="font-medium text-primary">{client?.nombre || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-primary-light/75">Cobradiario dueño</span>
                    <span className="font-medium text-primary">{cob?.nombre || cob?.email || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-primary-light/75">Capital / Saldo</span>
                    <span className="font-medium text-primary" translate="no">
                      ${formatearMonto(loan.capital)} / ${formatearMonto(loan.saldoPendiente ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-primary-light/75">Cuotas</span>
                    <span className="font-medium text-primary">
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
              className="w-full rounded-xl bg-mora text-surface-1 text-sm font-semibold py-3 hover:bg-mora/90 transition disabled:opacity-50"
            >
              Eliminar crédito seleccionado
            </button>
          </section>
        </SeccionAcordeon>
        )}

        <p className="text-center text-xs text-primary-light/50">CrediDev v0.1.0</p>
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

      <ConfirmarPasswordModal
        isOpen={showDescargarPassword}
        title="Descargar respaldo"
        description="Verifica tu contraseña para descargar toda la información del negocio en un archivo."
        onConfirm={handleConfirmarDescarga}
        onCancel={() => {
          setShowDescargarPassword(false);
          setDescargarError("");
        }}
        loading={descargando}
        error={descargarError}
        confirmText="Descargar"
        confirmIcon={<IconDownload size={16} stroke={1.5} />}
        confirmColor="bg-gold hover:bg-gold/90"
      />

      <ConfirmarPasswordModal
        isOpen={showRestaurarPassword}
        title="Restaurar respaldo"
        description={`Vas a reemplazar todos los datos actuales por los del archivo "${archivoNombre}". Antes de continuar se descargará una copia de seguridad del estado actual.`}
        warning="⚠ Esta acción no se puede deshacer directamente."
        onConfirm={handleConfirmarRestauracion}
        onCancel={() => {
          setShowRestaurarPassword(false);
          setRestaurarError("");
        }}
        loading={restaurando}
        error={restaurarError}
        confirmText={restaurando ? "Restaurando..." : "Restaurar"}
        confirmIcon={<IconUpload size={16} stroke={1.5} />}
      />
    </div>
  );
}

