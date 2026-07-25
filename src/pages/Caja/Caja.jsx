import { useState } from "react";
import Header from "../../components/layout/Header";
import { useMovements } from "../../hooks/useMovements";
import { construirMovimiento, TIPOS_MOVIMIENTO } from "../../logic/caja";
import { useAuth } from "../../context/AuthContext";
import { verificarPassword } from "../../firebase/auth";
import {
  IconArrowUpRight,
  IconArrowDownRight,
  IconPlus,
  IconMinus,
  IconTrash,
  IconAlertTriangle,
  IconX,
  IconLock,
  IconEye,
  IconEyeOff,
} from "@tabler/icons-react";

export default function Caja() {
  const { orgId } = useAuth();
  const { movements, loading, saldo, addMovement, limpiarDia } = useMovements();
  const [modalType, setModalType] = useState(null); // "gasto" | "base" | "confirm_limpiar" | null
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);

  // Seguridad para limpiar caja
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const entradas = movements.filter((m) => m.monto > 0).reduce((a, m) => a + m.monto, 0);
  const salidas = Math.abs(movements.filter((m) => m.monto < 0).reduce((a, m) => a + m.monto, 0));

  // Total a limpiar = TODOS los movimientos del día
  const totalALimpiar = movements.length;

  async function handleForm(e) {
    e.preventDefault();
    if (!monto) return;
    setSaving(true);
    try {
      const isBase = modalType === "base";
      const mov = construirMovimiento({
        tipo: isBase ? TIPOS_MOVIMIENTO.INGRESO_BASE : TIPOS_MOVIMIENTO.GASTO,
        monto: Number(monto),
        orgId,
        nota: nota || (isBase ? "Ingreso de base" : "Gasto"),
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

  async function handleLimpiarDia(e) {
    e.preventDefault();
    setPasswordError("");
    if (!confirmPassword) {
      setPasswordError("Debes ingresar tu contraseña para continuar");
      return;
    }

    setSaving(true);
    try {
      // 1. Verificar contraseña mediante Firebase Re-authentication
      await verificarPassword(confirmPassword);

      // 2. Si la contraseña es correcta, realizar la limpieza completa
      await limpiarDia(false);

      // 3. Limpiar estados del modal
      setConfirmPassword("");
      setPasswordError("");
      setModalType(null);
    } catch (err) {
      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setPasswordError("Contraseña incorrecta. Inténtalo de nuevo.");
      } else {
        setPasswordError(err.message || "Error al verificar la contraseña");
      }
    } finally {
      setSaving(false);
    }
  }

  const tipoLabel = {
    cobro: { text: "Cobro", color: "text-emerald-600", bg: "bg-emerald-50", Icon: IconArrowUpRight },
    prestamo_nuevo: { text: "Préstamo", color: "text-red-500", bg: "bg-red-50", Icon: IconArrowDownRight },
    gasto: { text: "Gasto", color: "text-red-500", bg: "bg-red-50", Icon: IconArrowDownRight },
    ajuste: { text: "Ajuste", color: "text-amber-600", bg: "bg-amber-50", Icon: IconMinus },
    ingreso_base: { text: "Base", color: "text-emerald-600", bg: "bg-emerald-50", Icon: IconArrowUpRight },
  };

  return (
    <div className="pb-24 space-y-6 max-w-5xl mx-auto">
      <Header title="Caja" />

      <div className="px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Saldo y Acciones principales en Grid para PC */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          {/* Saldo */}
          <div className="md:col-span-2 bg-primary-light rounded-2xl p-6 text-white relative overflow-hidden flex flex-col justify-between shadow-lg shadow-primary-light/20">
            {/* Círculo decorativo */}
            <div className="absolute -right-6 -top-6 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
            <div>
              <p className="text-sm opacity-80 relative">Saldo del día</p>
              <p className="text-4xl sm:text-5xl font-bold mt-2 relative tracking-tight">
                ${saldo.toLocaleString()}
              </p>
            </div>
            <div className="flex gap-8 mt-6 text-sm relative border-t border-white/10 pt-4">
              <div>
                <p className="opacity-70 text-xs mb-0.5">Entradas</p>
                <p className="font-semibold text-emerald-300 text-base">+${entradas.toLocaleString()}</p>
              </div>
              <div>
                <p className="opacity-70 text-xs mb-0.5">Salidas</p>
                <p className="font-semibold text-red-300 text-base">-${salidas.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E5E5EA] shadow-sm">
            <h4 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Acciones de caja</h4>
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
                className="w-full bg-red-50 border border-red-100 rounded-xl py-3 px-4 text-sm font-medium text-red-600 hover:bg-red-100 transition flex items-center justify-center gap-2"
              >
                <IconMinus size={18} stroke={2} />
                Registrar gasto
              </button>
              <button
                onClick={() => {
                  setConfirmPassword("");
                  setPasswordError("");
                  setModalType("confirm_limpiar");
                }}
                disabled={totalALimpiar === 0}
                className="w-full bg-primary-bg border border-primary-light/30 rounded-xl py-3 px-4 text-sm font-medium text-primary hover:bg-primary/10 transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <IconTrash size={18} stroke={1.5} />
                Nuevo día
              </button>
            </div>
          </div>
        </div>

        {/* Modal ingreso / gasto */}
        {(modalType === "base" || modalType === "gasto") && (
          <form onSubmit={handleForm} className="bg-white rounded-2xl p-5 border border-[#E5E5EA] space-y-4 shadow-md max-w-lg mx-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-primary">
                {modalType === "base" ? "💰 Ingresar base" : "💸 Registrar gasto"}
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="p-1 rounded-lg hover:bg-gray-100 transition text-gray-400"
              >
                <IconX size={20} stroke={1.5} />
              </button>
            </div>
            <input
              type="number"
              required
              min="1"
              placeholder="Monto ($)"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition"
            />
            <input
              type="text"
              placeholder="Nota (opcional)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setModalType(null); setMonto(""); setNota(""); }}
                className="flex-1 py-3 rounded-xl border border-[#E5E5EA] text-sm font-medium text-gray-500 hover:bg-gray-50 transition"
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

        {/* Modal confirmación con contraseña: Limpiar día */}
        {modalType === "confirm_limpiar" && (
          <form onSubmit={handleLimpiarDia} className="bg-white rounded-2xl p-6 border border-[#E5E5EA] space-y-4 shadow-lg max-w-lg mx-auto">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <IconAlertTriangle size={24} stroke={1.5} className="text-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-800">Limpiar historial del día</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Se eliminarán <strong className="text-gray-700">todos los {totalALimpiar} movimientos</strong> de hoy.
                  <br />
                  <span className="text-amber-600 font-medium">⚠ El saldo quedará en $0. Esta acción no se puede deshacer.</span>
                </p>
              </div>
            </div>

            {/* Error de contraseña */}
            {passwordError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                <span>⚠</span>
                <span>{passwordError}</span>
              </div>
            )}

            {/* Campo de confirmación de contraseña */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Ingresa tu contraseña para autorizar:
              </label>
              <div className="relative">
                <IconLock
                  size={18}
                  stroke={1.5}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type={showConfirmPass ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Tu contraseña de usuario"
                  className="w-full rounded-xl border border-[#E5E5EA] pl-10 pr-10 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showConfirmPass ? (
                    <IconEyeOff size={18} stroke={1.5} />
                  ) : (
                    <IconEye size={18} stroke={1.5} />
                  )}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setModalType(null);
                  setConfirmPassword("");
                  setPasswordError("");
                }}
                className="flex-1 py-3 rounded-xl border border-[#E5E5EA] text-sm font-medium text-gray-500 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <IconTrash size={16} stroke={1.5} />
                {saving ? "Verificando..." : "Confirmar limpieza"}
              </button>
            </div>
          </form>
        )}

        {/* Lista de movimientos del día */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5E5EA] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-700">Movimientos de hoy</h3>
            {movements.length > 0 && (
              <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-3 py-1">
                {movements.length} {movements.length === 1 ? "registro" : "registros"}
              </span>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-gray-400 text-center py-10">Cargando...</p>
          ) : movements.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">🏦</p>
              <p className="text-sm text-gray-400">Sin movimientos hoy</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {movements.map((m) => {
                const info = tipoLabel[m.tipo] || tipoLabel.ajuste;
                const IconComponent = info.Icon;
                return (
                  <div
                    key={m.id}
                    className="bg-gray-50/60 rounded-xl px-4 py-3.5 border border-[#E5E5EA] flex items-center gap-3 hover:bg-gray-50 transition"
                  >
                    <div className={`w-10 h-10 rounded-xl ${info.bg} flex items-center justify-center flex-shrink-0`}>
                      <IconComponent size={20} stroke={2} className={info.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{info.text}</p>
                      <p className="text-xs text-gray-400 truncate">{m.nota || "—"}</p>
                    </div>
                    <p className={`text-sm font-bold ${m.monto >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {m.monto >= 0 ? "+" : ""}${Math.abs(m.monto).toLocaleString()}
                    </p>
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
