import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { iniciarSesion } from '../../firebase/auth';
import { getUserIndex } from '../../firebase/firestore';
import {
  IconCoin,
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconArrowRight,
} from '@tabler/icons-react';

/**
 * Acceso Ãºnico para todos los roles (admin y cobradiario usan el mismo
 * mecanismo email/contraseÃ±a). La separaciÃ³n real de paneles ocurre al
 * entrar: el admin aterriza en su Dashboard y el cobradiario en Inicio.
 *
 * Las cuentas nuevas de ADMIN se crean en /registro (una organizaciÃ³n
 * aparte â€” el sistema se vende a varios negocios). Las cuentas de
 * cobradiario las crea el Admin desde su panel.
 */
export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cred = await iniciarSesion(email, password);
      // Redirigir segÃºn el rol resuelto en userIndex (con fallback a Inicio
      // si el Ã­ndice tarda en aparecer; AuthContext lo corrige al llegar).
      let destino = '/';
      try {
        const index = await getUserIndex(cred.user.uid);
        if (index?.role === 'admin') destino = '/dashboard';
      } catch {
        /* sin Ã­ndice aÃºn: va a Inicio */
      }
      navigate(destino, { replace: true });
    } catch (err) {
      const msgs = {
        'auth/invalid-email': 'Correo no vÃ¡lido',
        'auth/user-not-found': 'No existe una cuenta con este correo',
        'auth/wrong-password': 'ContraseÃ±a incorrecta',
        'auth/invalid-credential': 'Credenciales invÃ¡lidas',
        'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
      };
      setError(msgs[err.code] || 'Error al autenticar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-bg p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md sm:max-w-4xl bg-white rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 sm:grid-cols-2 border border-[#E3DFD8]">
        {/* Header / Panel decorativo */}
        <div className="bg-primary p-8 sm:p-10 flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary-light/20" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />

          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-inner ring-1 ring-black/5">
              <img
                src="/icons/credi-dev-logo.png"
                alt="CrediDev logo"
                className="w-12 h-12 object-contain"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                CrediDev
              </h1>
              <p className="text-white/75 text-sm mt-1">
                GestiÃ³n financiera moderna
              </p>
            </div>
          </div>
        </div>

        {/* Panel del formulario */}
        <div className="p-6 sm:p-10 flex flex-col justify-center bg-white">
          <h2 className="text-2xl font-bold text-primary mb-1">
            Iniciar sesiÃ³n
          </h2>
          <p className="text-sm text-primary-light/70 mb-6">
            Ingresa tus credenciales para continuar
          </p>

          {error && (
            <div className="bg-mora/10 border border-mora/20 text-mora text-sm rounded-xl px-4 py-3 mb-5 flex items-start gap-2">
              <span className="mt-0.5 text-mora/80">âš </span>
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-4">
            {/* Campo correo */}
            <div>
              <label className="block text-sm font-medium text-primary-light mb-1.5">
                Correo electrÃ³nico
              </label>
              <div className="relative">
                <IconMail
                  size={18}
                  stroke={1.5}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-light/70 pointer-events-none"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-surface-1 border border-[#E3DFD8] pl-10 pr-4 py-3 text-sm text-primary placeholder-gray-300 focus:bg-white focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition"
                  placeholder="tu@correo.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Campo contraseÃ±a */}
            <div>
              <label className="block text-sm font-medium text-primary-light mb-1.5">
                ContraseÃ±a
              </label>
              <div className="relative">
                <IconLock
                  size={18}
                  stroke={1.5}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-light/70 pointer-events-none"
                />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-surface-1 border border-[#E3DFD8] pl-10 pr-12 py-3 text-sm text-primary placeholder-gray-300 focus:bg-white focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition"
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary-light/70 hover:text-primary-light transition"
                  aria-label={
                    showPass ? 'Ocultar contraseÃ±a' : 'Mostrar contraseÃ±a'
                  }>
                  {showPass ? (
                    <IconEyeOff
                      size={18}
                      stroke={1.5}
                    />
                  ) : (
                    <IconEye
                      size={18}
                      stroke={1.5}
                    />
                  )}
                </button>
              </div>
            </div>

            {/* BotÃ³n principal */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-primary hover:bg-primary/90 active:scale-[0.98] text-white font-medium rounded-xl py-3.5 flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-primary/10">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Cargando...
                </span>
              ) : (
                <>
                  Entrar
                  <IconArrowRight
                    size={18}
                    stroke={2}
                  />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-primary-light/70 text-xs mt-6 leading-relaxed">
            Â¿Eres cobrador? PÃ­dele tus credenciales a tu administrador.
          </p>
          <div className="mt-4 pt-4 border-t border-[#E3DFD8] text-center">
            <p className="text-sm text-primary-light/75">
              Â¿Nuevo negocio?{' '}
              <Link
                to="/registro"
                className="text-primary-light font-semibold hover:underline">
                Crea tu organizaciÃ³n
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

