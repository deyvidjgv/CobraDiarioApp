import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registrarCobrador, iniciarSesion } from "../../firebase/auth";
import {
  IconCoin,
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconArrowRight,
} from "@tabler/icons-react";

export default function Login() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await registrarCobrador(email, password);
      } else {
        await iniciarSesion(email, password);
      }
      navigate("/", { replace: true });
    } catch (err) {
      const msgs = {
        "auth/email-already-in-use": "Este correo ya está registrado",
        "auth/invalid-email": "Correo no válido",
        "auth/weak-password": "La contraseña debe tener al menos 6 caracteres",
        "auth/user-not-found": "No existe una cuenta con este correo",
        "auth/wrong-password": "Contraseña incorrecta",
        "auth/invalid-credential": "Credenciales inválidas",
      };
      setError(msgs[err.code] || "Error al autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-primary-bg overflow-hidden">
      {/* Header decorativo superior */}
      <div className="bg-primary h-56 flex flex-col items-center justify-center px-6 relative overflow-hidden">
        {/* Círculos decorativos de fondo */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary-light/20" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />

        {/* Ícono y título */}
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-primary-light/30 flex items-center justify-center">
            <IconCoin size={34} stroke={1.5} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-white tracking-tight">
              CobraDiario
            </h1>
            <p className="text-white/60 text-sm mt-0.5">
              Gestión de cobros simplificada
            </p>
          </div>
        </div>
      </div>

      {/* Tarjeta del formulario */}
      <div className="flex-1 -mt-5 bg-primary-bg rounded-t-3xl px-5 pt-7 pb-8">
        <h2 className="text-xl font-semibold text-primary mb-1">
          {isRegister ? "Crear cuenta" : "Iniciar sesión"}
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          {isRegister
            ? "Registra tu cuenta de cobrador"
            : "Ingresa tus credenciales para continuar"}
        </p>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-5 flex items-start gap-2">
            <span className="mt-0.5 text-red-400">⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo correo */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Correo electrónico
            </label>
            <div className="relative">
              <IconMail
                size={18}
                stroke={1.5}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-white border border-[#E5E5EA] pl-10 pr-4 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition"
                placeholder="tu@correo.com"
              />
            </div>
          </div>

          {/* Campo contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <IconLock
                size={18}
                stroke={1.5}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type={showPass ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-white border border-[#E5E5EA] pl-10 pr-12 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                {showPass ? (
                  <IconEyeOff size={18} stroke={1.5} />
                ) : (
                  <IconEye size={18} stroke={1.5} />
                )}
              </button>
            </div>
          </div>

          {/* Botón principal */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-primary hover:bg-primary/90 active:scale-[0.98] text-white font-medium rounded-xl py-3.5 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Cargando...
              </span>
            ) : (
              <>
                {isRegister ? "Crear cuenta" : "Entrar"}
                <IconArrowRight size={18} stroke={2} />
              </>
            )}
          </button>
        </form>

        {/* Toggle Registro / Login */}
        <p className="text-center text-gray-400 text-sm mt-6">
          {isRegister ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            className="text-primary-light font-semibold hover:underline"
          >
            {isRegister ? "Inicia sesión" : "Regístrate"}
          </button>
        </p>
      </div>
    </div>
  );
}
