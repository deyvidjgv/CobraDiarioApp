import { useRef, useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { registrarCobrador } from '../../firebase/auth';
import { getUserIndex, saveSettings } from '../../firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import {
  IconCoin,
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconArrowRight,
  IconBuildingStore,
  IconUser,
} from '@tabler/icons-react';

const inputCls =
  'w-full rounded-xl bg-surface-1 border border-[#E3DFD8] pl-10 pr-4 py-3 text-sm text-primary placeholder-gray-300 focus:bg-white focus:outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/20 transition';

/**
 * Registro de una NUEVA organizaciÃ³n (para vender el sistema): cada
 * registro crea la cuenta de Administrador dueÃ±a de su propia
 * organizaciÃ³n, aislada de las demÃ¡s. Las cuentas de cobradiario NUNCA
 * se crean aquÃ­ â€” las crea el Admin dentro de su panel.
 */
export default function Registro() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [negocio, setNegocio] = useState('');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Quien ya tiene sesiÃ³n al ENTRAR aquÃ­ no debe registrar otra
  // organizaciÃ³n (crear la cuenta reemplazarÃ­a su sesiÃ³n actual). Se
  // captura al montar: durante el registro la sesiÃ³n cambia al usuario
  // nuevo y NO debe redirigir.
  const yaHabiaSesion = useRef(!!usuario);
  if (yaHabiaSesion.current)
    return (
      <Navigate
        to="/"
        replace
      />
    );

  /**
   * Espera a que el AuthContext complete el bootstrap de la organizaciÃ³n
   * (userIndex + ficha admin) tras el login automÃ¡tico del usuario nuevo.
   * No lo hacemos desde aquÃ­ para no chocar con Ã©l (el userIndex es
   * inmutable: dos bootstraps simultÃ¡neos harÃ­an fallar a uno).
   */
  async function esperarOrganizacion(uid, intentos = 20) {
    for (let i = 0; i < intentos; i++) {
      const index = await getUserIndex(uid).catch(() => null);
      if (index) return index;
      await new Promise((r) => setTimeout(r, 250));
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('La contraseÃ±a debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      // 1. Crear la cuenta (queda con la sesiÃ³n iniciada del nuevo admin).
      const cred = await registrarCobrador(email, password, nombre);

      // 2. El AuthContext bootstrap la organizaciÃ³n (orgId = uid). Esperar.
      const index = await esperarOrganizacion(cred.user.uid);

      // 3. Guardar el nombre del negocio (ya somos admin de la org).
      if (index) {
        try {
          await saveSettings(index.organizationId, {
            nombreNegocio: negocio || '',
          });
        } catch {
          /* no bloquea el registro si falla */
        }
      }

      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use':
          'Este correo ya tiene una cuenta â€” inicia sesiÃ³n',
        'auth/invalid-email': 'Correo no vÃ¡lido',
        'auth/weak-password': 'La contraseÃ±a debe tener al menos 6 caracteres',
        'auth/operation-not-allowed': 'Registro no habilitado en Firebase Auth',
      };
      setError(msgs[err.code] || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-bg p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md sm:max-w-4xl bg-white rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 sm:grid-cols-2 border border-[#E3DFD8]">
        {/* Panel decorativo */}
        <div className="bg-primary p-8 sm:p-10 flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary-light/20" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center shadow-inner ring-1 ring-white/20 backdrop-blur-sm">
              <img
                src="/icons/icon-192.png"
                alt="CrediDev logo"
                className="w-12 h-12 object-contain"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                CrediDev
              </h1>
              <p className="text-white/75 text-sm mt-1">
                Crea la cuenta de tu negocio y empieza a operar
              </p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="p-6 sm:p-10 flex flex-col justify-center bg-white">
          <h2 className="text-2xl font-bold text-primary mb-1">
            Crear organizaciÃ³n
          </h2>
          <p className="text-sm text-primary-light/70 mb-6">
            SerÃ¡s el <strong>Administrador</strong> de tu negocio: tus datos
            quedan aislados y tÃº creas las cuentas de tus cobradores.
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
            <div>
              <label className="block text-sm font-medium text-primary-light mb-1.5">
                Nombre del negocio
              </label>
              <div className="relative">
                <IconBuildingStore
                  size={18}
                  stroke={1.5}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-light/70 pointer-events-none"
                />
                <input
                  type="text"
                  required
                  value={negocio}
                  onChange={(e) => setNegocio(e.target.value)}
                  className={inputCls}
                  placeholder="Ej. PrÃ©stamos DoÃ±a Ana"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-light mb-1.5">
                Tu nombre
              </label>
              <div className="relative">
                <IconUser
                  size={18}
                  stroke={1.5}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-light/70 pointer-events-none"
                />
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className={inputCls}
                  placeholder="Ana MarÃ­a GÃ³mez"
                />
              </div>
            </div>

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
                  className={inputCls}
                  placeholder="tu@correo.com"
                  autoComplete="email"
                />
              </div>
            </div>

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
                  className={inputCls + ' !pr-12'}
                  placeholder="MÃ­nimo 6 caracteres"
                  autoComplete="new-password"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-primary hover:bg-primary/90 active:scale-[0.98] text-white font-medium rounded-xl py-3.5 flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-primary/10">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Creando organizaciÃ³n...
                </span>
              ) : (
                <>
                  Crear mi organizaciÃ³n
                  <IconArrowRight
                    size={18}
                    stroke={2}
                  />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-primary-light/70 text-sm mt-6">
            Â¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              className="text-primary-light font-semibold hover:underline">
              Inicia sesiÃ³n
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

