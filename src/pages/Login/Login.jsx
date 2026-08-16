import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { iniciarSesion } from "../../firebase/auth";
import { getUserIndex } from "../../firebase/firestore";
import { IconCoin, IconMail, IconLock, IconEye, IconEyeOff, IconArrowRight } from "@tabler/icons-react";

/**
 * Acceso único para todos los roles (admin y cobradiario usan el mismo
 * mecanismo email/contraseña). La separación real de paneles ocurre al
 * entrar: el admin aterriza en su Dashboard y el cobradiario en Inicio.
 *
 * Las cuentas nuevas de ADMIN se crean en /registro (una organización
 * aparte — el sistema se vende a varios negocios). Las cuentas de
 * cobradiario las crea el Admin desde su panel.
 */
export default function Login() {
  const navigate = useNavigate();
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
      const cred = await iniciarSesion(email, password);
      // Redirigir según el rol resuelto en userIndex (con fallback a Inicio
      // si el índice tarda en aparecer; AuthContext lo corrige al llegar).
      let destino = "/";
      try {
        const index = await getUserIndex(cred.user.uid);
        if (index?.role === "admin") destino = "/dashboard";
      } catch {
        /* sin índice aún: va a Inicio */
      }
      navigate(destino, { replace: true });
    } catch (err) {
      const msgs = {
        "auth/invalid-email": "Correo no válido",
        "auth/user-not-found": "No existe una cuenta con este correo",
        "auth/wrong-password": "Contraseña incorrecta",
        "auth/invalid-credential": "Credenciales inválidas",
        "auth/too-many-requests": "Demasiados intentos. Espera un momento.",
      };
      setError(msgs[err.code] || "Error al autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-bg p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md sm:max-w-4xl bg-white rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 sm:grid-cols-2 border border-[#E5E5EA]">
        {/* Header / Panel decorativo */}
        <div className="bg-primary p-8 sm:p-10 flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary-light/20" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />

          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-primary-light/30 flex items-center justify-center shadow-inner">
              <IconCoin size={42} stroke={1.5} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">CobraDiario</h1>
              <p className="text-white/70 text-sm mt-1">Gestión de cobros simplificada</p>
            </div>
          </div>
        </div>

        {/* Panel del formulario */}
        <div className="p-6 sm:p-10 flex flex-col justify-center bg-white">
          <h2 className="text-2xl font-bold text-primary mb-1">Iniciar sesión</h2>
          <p className="text-sm text-gray-400 mb-6">
            Ingresa tus credenciales para continuar
          </p>

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
                  className="w-full rounded-xl bg-gray-50 border border-[#E5E5EA] pl-10 pr-4 py-3 text-sm text-gray-800 placeholder-gray-300 focus:bg-white focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition"
                  placeholder="tu@correo.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Campo contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Contraseña</label>
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
                  className="w-full rounded-xl bg-gray-50 border border-[#E5E5EA] pl-10 pr-12 py-3 text-sm text-gray-800 placeholder-gray-300 focus:bg-white focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPass ? <IconEyeOff size={18} stroke={1.5} /> : <IconEye size={18} stroke={1.5} />}
                </button>
              </div>
            </div>

            {/* Botón principal */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-primary hover:bg-primary/90 active:scale-[0.98] text-white font-medium rounded-xl py-3.5 flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-primary/10"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Cargando...
                </span>
              ) : (
                <>
                  Entrar
                  <IconArrowRight size={18} stroke={2} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-gray-400 text-xs mt-6 leading-relaxed">
            ¿Eres cobrador? Pídele tus credenciales a tu administrador.
          </p>
          <div className="mt-4 pt-4 border-t border-[#E5E5EA] text-center">
            <p className="text-sm text-gray-500">
              ¿Nuevo negocio?{" "}
              <Link to="/registro" className="text-primary-light font-semibold hover:underline">
                Crea tu organización
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
