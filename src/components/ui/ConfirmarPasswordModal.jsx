import { useState } from "react";
import { IconAlertTriangle, IconLock, IconEye, IconEyeOff, IconTrash } from "@tabler/icons-react";

export default function ConfirmarPasswordModal({
  isOpen,
  title,
  description,
  warning,
  onConfirm,
  onCancel,
  loading = false,
  error = "",
  confirmText = "Confirmar",
  confirmIcon = <IconTrash size={16} stroke={1.5} />,
  confirmColor = "bg-mora/100 hover:bg-mora",
}) {
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password) {
      onConfirm(password);
    }
  };

  const handleCancel = () => {
    setPassword("");
    setShowPass(false);
    onCancel();
  };

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] transition-opacity"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <form onSubmit={handleSubmit} className="bg-surface rounded-2xl p-6 border border-line space-y-4 shadow-xl max-w-lg w-full">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center flex-shrink-0">
              <IconAlertTriangle size={24} stroke={1.5} className="text-gold" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-primary">{title}</h3>
              <p className="text-xs text-primary-light/75 mt-1 leading-relaxed">
                {description}
                {warning && (
                  <>
                    <br />
                    <span className="text-gold font-medium">{warning}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Error de contraseña */}
          {error && (
            <div className="bg-mora/10 border border-mora/20 text-mora text-xs rounded-xl px-3.5 py-2.5 flex items-center gap-2">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Campo de confirmación de contraseña */}
          <div>
            <label className="block text-xs font-medium text-primary-light mb-1.5">
              Ingresa tu contraseña para autorizar:
            </label>
            <div className="relative">
              <IconLock
                size={18}
                stroke={1.5}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-light/70 pointer-events-none"
              />
              <input
                type={showPass ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña de usuario"
                className="w-full rounded-xl border border-line bg-surface-1 pl-10 pr-10 py-3 text-sm text-primary placeholder:text-primary/30 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary-light/70 hover:text-primary-light transition"
              >
                {showPass ? (
                  <IconEyeOff size={18} stroke={1.5} />
                ) : (
                  <IconEye size={18} stroke={1.5} />
                )}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2 flex-col sm:flex-row">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-line text-xs sm:text-sm font-medium text-primary-light/75 hover:bg-surface-1 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className={`flex-1 min-w-0 px-4 py-3 rounded-xl text-surface-1 text-xs sm:text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2 sm:gap-3 ${confirmColor}`}
            >
              <span className="flex-none flex items-center justify-center w-5 h-5">
                {confirmIcon}
              </span>
              <span className="min-w-0 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                {loading ? "Verificando..." : confirmText}
              </span>
              <span className={`flex-none w-3 h-3 rounded-full border-2 border-surface-1/40 border-t-surface-1 ${loading ? "animate-spin visible" : "invisible"}`} />
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

