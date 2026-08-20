import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../../components/ui/Logo';
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
      // Redirigir según el rol resuelto en userIndex (con fallback a Inicio
      // si el índice tarda en aparecer; AuthContext lo corrige al llegar).
      let destino = '/';
      try {
        const index = await getUserIndex(cred.user.uid);
        if (index?.role === 'admin') destino = '/dashboard';
      } catch {
        /* sin índice aún: va a Inicio */
      }
      navigate(destino, { replace: true });
    } catch (err) {
      const msgs = {
        'auth/invalid-email': 'Correo no válido',
        'auth/user-not-found': 'No existe una cuenta con este correo',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/invalid-credential': 'Credenciales inválidas',
        'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
      };
      setError(msgs[err.code] || 'Error al autenticar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-primary-bg p-4 sm:p-6 lg:p-8">
      <div className="w-full min-w-0 max-w-md sm:max-w-4xl max-h-[95dvh] overflow-y-auto bg-surface rounded-3xl shadow-xl grid grid-cols-1 sm:grid-cols-2 border border-line">
        {/* Header / Panel decorativo — la versión grande (logo+título+
            subtítulo apilados) solo cabe si hay ancho Y alto de sobra
            (`tall-sm`, ver tailwind.config.js). Un celular en horizontal
            supera los 640px de ancho pero tiene poco alto — con solo `sm`
            (ancho) se le mostraba igual el panel grande en una pantalla
            demasiado baja para contenerlo, y por eso hacía falta scroll.
            Las columnas (grid-cols-2) sí quedan solo por ancho: usar el
            ancho disponible en horizontal siempre ayuda, nunca estorba. */}
        <div className="bg-obsidian p-4 tall-sm:p-10 flex flex-row tall-sm:flex-col justify-center items-center gap-3 tall-sm:gap-4 text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gold/[0.04]" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-primary/[0.03]" />

          <div className="relative z-10 flex flex-row tall-sm:flex-col items-center gap-3 tall-sm:gap-4">
            <Logo size={40} className="tall-sm:hidden" />
            <Logo size={56} className="hidden tall-sm:block" />
            <div>
              <h1 className="font-display text-lg tall-sm:text-3xl font-semibold text-primary tracking-tight">
                CrediDev
              </h1>
              <p className="hidden tall-sm:block text-primary-light text-sm mt-1">
                Gestión financiera moderna
              </p>
            </div>
          </div>
        </div>

        {/* Panel del formulario */}
        <div className="p-5 tall-sm:p-10 flex flex-col justify-center bg-surface">
          <h2 className="text-xl tall-sm:text-2xl font-bold text-primary mb-1">
            Iniciar sesión
          </h2>
          <p className="text-sm text-primary-light/70 mb-4 tall-sm:mb-6">
            Ingresa tus credenciales para continuar
          </p>

          {error && (
            <div className="bg-mora/10 border border-mora/20 text-mora text-sm rounded-xl px-4 py-3 mb-5 flex items-start gap-2">
              <span className="mt-0.5 text-mora/80">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-4">
            {/* Campo correo */}
            <div>
              <label className="block text-sm font-medium text-primary-light mb-1.5">
                Correo electrónico
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
                  className="w-full rounded-xl bg-surface-1 border border-line pl-10 pr-4 py-3 text-sm text-primary placeholder:text-primary/30 focus:bg-surface focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition"
                  placeholder="tu@correo.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Campo contraseña */}
            <div>
              <label className="block text-sm font-medium text-primary-light mb-1.5">
                Contraseña
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
                  className="w-full rounded-xl bg-surface-1 border border-line pl-10 pr-12 py-3 text-sm text-primary placeholder:text-primary/30 focus:bg-surface focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary-light/70 hover:text-primary-light transition"
                  aria-label={
                    showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'
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

            {/* Botón principal */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gold hover:bg-gold/90 active:scale-[0.98] text-surface-1 font-medium rounded-xl py-3.5 flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-black/40">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-surface-1/30 border-t-surface-1 rounded-full animate-spin" />
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

          <p className="text-center text-primary-light/70 text-xs mt-4 sm:mt-6 leading-relaxed">
            ¿Eres cobrador? Pídele tus credenciales a tu administrador.
          </p>
          <div className="mt-3 pt-3 sm:mt-4 sm:pt-4 border-t border-line text-center">
            <p className="text-sm text-primary-light/75">
              ¿Nuevo negocio?{' '}
              <Link
                to="/registro"
                className="text-primary-light font-semibold hover:underline">
                Crea tu organización
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

