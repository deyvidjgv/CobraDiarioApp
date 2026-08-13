import { useState, useEffect } from "react";
import Header from "../../components/layout/Header";
import ConfirmarPasswordModal from "../../components/ui/ConfirmarPasswordModal";
import { useAuth } from "../../context/AuthContext";
import { getSettings, saveSettings } from "../../firebase/firestore";
import { cerrarSesion, verificarPassword } from "../../firebase/auth";
import { useNavigate } from "react-router-dom";
import { useClients } from "../../hooks/useClients";
import { useLoans } from "../../hooks/useLoans";
import { useLoanActions } from "../../hooks/useLoanActions";
import { bloquearEntradaSoloNumerosConDecimal, formatearMonto } from "../../logic/formato";

export default function Configuracion() {
  const navigate = useNavigate();
  const { orgId } = useAuth();
  const [form, setForm] = useState({
    interesDefault: 20,
    diasHabilesDefault: [1, 2, 3, 4, 5, 6],
    moneda: "COP",
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
  const [showDeleteCredit, setShowDeleteCredit] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [processingDelete, setProcessingDelete] = useState(false);
  const [installEvent, setInstallEvent] = useState(null);
  const [installAvailable, setInstallAvailable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [loans, setLoans] = useState([]);
  const { clients } = useClients();
  const { loans: activeLoans } = useLoans(true);
  const { deleteLoan } = useLoanActions();

  useEffect(() => {
    if (!orgId) return;
    getSettings(orgId).then((s) => {
      if (s) setForm((f) => ({ ...f, ...s }));
      setLoading(false);
    });
  }, [orgId]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallEvent(event);
      setInstallAvailable(true);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setInstallAvailable(false);
      setInstallEvent(null);
    };

    if (typeof window !== "undefined") {
      if (
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        window.navigator.standalone
      ) {
        setInstalled(true);
      }
      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.addEventListener("appinstalled", handleAppInstalled);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

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

  async function handleInstallApp() {
    if (!installEvent) return;
    installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
      setInstallAvailable(false);
      setInstallEvent(null);
    }
  }

  async function handleDeleteCredit(password) {
    setPasswordError("");
    setProcessingDelete(true);
    try {
      await verificarPassword(password);
      await deleteLoan(selectedLoanId);
      setShowDeleteCredit(false);
      setSelectedLoanId("");
      alert("Crédito eliminado correctamente.");
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

  const diasSemana = [
    { value: 0, label: "Dom" },
    { value: 1, label: "Lun" },
    { value: 2, label: "Mar" },
    { value: 3, label: "Mié" },
    { value: 4, label: "Jue" },
    { value: 5, label: "Vie" },
    { value: 6, label: "Sáb" },
  ];

  function toggleDia(dia) {
    setForm((f) => {
      const actual = f.diasHabilesDefault || [];
      return {
        ...f,
        diasHabilesDefault: actual.includes(dia)
          ? actual.filter((d) => d !== dia)
          : [...actual, dia].sort(),
      };
    });
  }

  if (loading) {
    return (
      <div className="pb-24">
        <Header title="Configuración" loading={true} />
        <p className="p-6 text-sm text-gray-400">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <Header title="Configuración" loading={loading} />

      <div className="p-4 space-y-5">
        <form onSubmit={handleSave} className="space-y-5">
          {/* Interés */}
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Interés por defecto (%)</span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={form.interesDefault}
              onChange={(e) => setForm({ ...form, interesDefault: Number(e.target.value) })}
              onKeyDown={bloquearEntradaSoloNumerosConDecimal}
              className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
            />
            <p className="text-xs text-gray-400 mt-1">
              Se usará como plantilla al crear créditos nuevos. No afecta créditos existentes.
            </p>
          </label>

          {/* Días hábiles */}
          <div>
            <span className="text-sm font-medium text-gray-700 block mb-2">Días de cobro por defecto</span>
            <div className="flex gap-1.5">
              {diasSemana.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDia(d.value)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
                    (form.diasHabilesDefault || []).includes(d.value)
                      ? "bg-primary-light text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Moneda */}
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Moneda</span>
            <select
              value={form.moneda}
              onChange={(e) => setForm({ ...form, moneda: e.target.value })}
              className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition bg-white"
            >
              <option value="COP">COP — Peso colombiano</option>
              <option value="USD">USD — Dólar</option>
              <option value="MXN">MXN — Peso mexicano</option>
            </select>
          </label>

          {/* Bloque Seguro */}
          <div className="pt-4 border-t border-[#E5E5EA] space-y-4">
            <h3 className="text-sm font-semibold text-gray-800">Seguro / Comisión (Cobro Inicial)</h3>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.seguroActivo}
                onChange={(e) => setForm({ ...form, seguroActivo: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-gray-700">Activar seguro por defecto</span>
            </label>
            {form.seguroActivo && (
              <div className="grid grid-cols-2 gap-3 pl-6">
                <label className="block">
                  <span className="text-xs text-gray-500">Tipo</span>
                  <select
                    value={form.seguroTipo}
                    onChange={(e) => setForm({ ...form, seguroTipo: e.target.value })}
                    className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-3 py-2 text-sm bg-white"
                  >
                    <option value="porcentaje">Porcentaje (%)</option>
                    <option value="fijo">Monto Fijo ($)</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">Valor</span>
                  <input
                    type="number"
                    min="0"
                    step={form.seguroTipo === "porcentaje" ? "0.1" : "1"}
                    value={form.seguroValor}
                    onChange={(e) => setForm({ ...form, seguroValor: Number(e.target.value) })}
                    onKeyDown={bloquearEntradaSoloNumerosConDecimal}
                    className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-3 py-2 text-sm"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Bloque Interés por Vencimiento */}
          <div className="pt-4 border-t border-[#E5E5EA] space-y-4">
            <h3 className="text-sm font-semibold text-gray-800">Interés por Vencimiento / Mora</h3>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.vencimientoActivo}
                onChange={(e) => setForm({ ...form, vencimientoActivo: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-gray-700">Activar recargo por vencimiento por defecto</span>
            </label>
            {form.vencimientoActivo && (
              <div className="space-y-3 pl-6">
                <label className="block">
                  <span className="text-xs text-gray-500">Modo Inicial del Primer Corte</span>
                  <select
                    value={form.vencimientoModoInicial}
                    onChange={(e) => setForm({ ...form, vencimientoModoInicial: e.target.value })}
                    className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-3 py-2 text-sm bg-white"
                  >
                    <option value="al_vencer">Al finalizar todo el plazo pactado</option>
                    <option value="mensual">A los 30 días de iniciar el crédito</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">Recargo a sumar en cada corte (%)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.vencimientoPorcentaje}
                    onChange={(e) => setForm({ ...form, vencimientoPorcentaje: Number(e.target.value) })}
                    onKeyDown={bloquearEntradaSoloNumerosConDecimal}
                    className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-3 py-2 text-sm"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Guardar */}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary hover:bg-primary-light text-white font-medium rounded-xl py-3 transition disabled:opacity-50"
          >
            {saving ? "Guardando..." : saved ? "✓ Guardado" : "Guardar configuración"}
          </button>
        </form>

        {/* Cerrar sesión e instalación */}
        <div className="pt-4 border-t border-[#E5E5EA] space-y-4">
          <div className="bg-white rounded-xl p-4 border-thin space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Instalar app</p>
                <p className="text-xs text-gray-500">Puedes instalar la aplicación como PWA para accederla desde tu dispositivo.</p>
              </div>
              <button
                type="button"
                onClick={handleInstallApp}
                disabled={!installAvailable || installed}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${installed ? "bg-surface text-gray-500 border border-[#E5E5EA]" : "bg-primary text-white hover:bg-primary-light"} ${!installAvailable && !installed ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {installed ? "Instalada" : "Instalar app"}
              </button>
            </div>
            {!installed && !installAvailable && (
              <p className="text-xs text-gray-400">La instalación estará disponible en navegadores compatibles cuando el dispositivo lo permita.</p>
            )}
            {installed && (
              <p className="text-xs text-green-600">La app está instalada y el botón está deshabilitado.</p>
            )}
          </div>

          <div className="bg-white rounded-xl p-4 border-thin space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Eliminar crédito activo</p>
                <p className="text-xs text-gray-500">Selecciona un crédito activo y confirma con tu contraseña.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteCredit(true)}
                className="rounded-xl bg-red-50 border border-red-100 px-4 py-2 text-red-600 text-sm font-medium hover:bg-red-100 transition"
              >
                Eliminar crédito
              </button>
            </div>
            <label className="block">
              <span className="text-xs text-gray-500">Crédito activo</span>
              <select
                value={selectedLoanId}
                onChange={(e) => setSelectedLoanId(e.target.value)}
                className="mt-2 block w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition bg-white"
              >
                <option value="">Selecciona un crédito</option>
                {loans.map((loan) => {
                  const client = clients.find((c) => c.id === loan.clientId);
                  const clientLabel = client?.nombre || loan.clientId || "Sin cliente";
                  return (
                    <option key={loan.id} value={loan.id}>
                      {clientLabel} — {loan.frecuencia} — ${formatearMonto(loan.montoTotalAPagar)}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>

          <button
            onClick={handleLogout}
            className="w-full border border-red-300 text-red-600 font-medium rounded-xl py-3 hover:bg-red-50 transition"
          >
            Cerrar sesión
          </button>
        </div>

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
