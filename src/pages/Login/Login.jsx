import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import gsap from 'gsap';
import Logo from '../../components/ui/Logo';
import { iniciarSesion } from '../../firebase/auth';
import { getUserIndex } from '../../firebase/firestore';
import { DIAMOND_PATH, morphDiamondToPig } from './pigMorph';
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

  const stageRef = useRef(null);
  const outlineWrapRef = useRef(null);
  const morphIconRef = useRef(null);
  const morphShapeRef = useRef(null);
  const coinRef = useRef(null);

  /**
   * Logo -> marranito al iniciar sesión: el rombo se transforma (morph de
   * path via flubber) en el icono real de marranito de @tabler/icons-react,
   * mientras una moneda sale del logo, salta y cae justo al terminar.
   * `landed` resuelve cuando la moneda ya cayó, para no navegar a media
   * animación; `reset()` la corta y vuelve al rombo si el login falla.
   */
  function playPigAnimation() {
    const stage = stageRef.current;
    const outline = outlineWrapRef.current;
    const morphIcon = morphIconRef.current;
    const morphShape = morphShapeRef.current;
    const coin = coinRef.current;
    if (!stage || !coin) return { landed: Promise.resolve(), reset() {} };

    gsap.killTweensOf([outline, morphIcon, coin, stage]);
    gsap.set(outline, { opacity: 1 });
    gsap.set(morphIcon, { opacity: 0 });
    morphShape.setAttribute('d', DIAMOND_PATH);
    gsap.set(coin, { opacity: 0, x: 0, y: 0, rotation: 0, scale: 1, scaleX: 1 });
    gsap.set(stage, { scale: 1 });

    const st = { t: 0 };
    const hopH = stage.getBoundingClientRect().height * 0.55;
    let resolveLanded;
    const landed = new Promise((res) => {
      resolveLanded = res;
    });

    const tl = gsap.timeline();
    tl.to(outline, { opacity: 0, duration: 0.22 }, 0)
      .to(morphIcon, { opacity: 1, duration: 0.22 }, 0)
      .to(
        st,
        {
          t: 1,
          duration: 0.85,
          ease: 'power2.inOut',
          onUpdate() {
            morphShape.setAttribute('d', morphDiamondToPig(st.t));
          },
        },
        0.05
      )
      .set(coin, { opacity: 1, scale: 0.7 }, 0.15)
      .to(coin, { opacity: 1, scale: 1, duration: 0.15, ease: 'back.out(2)' }, 0.15)
      .to(coin, { y: -hopH, rotation: 340, duration: 0.32, ease: 'power2.out' }, 0.18)
      .to(coin, { y: -hopH * 0.4, duration: 0.02 }, 0.5)
      .to(coin, { y: 6, rotation: 680, scale: 0.35, duration: 0.3, ease: 'power2.in' }, 0.5)
      .to(coin, { scaleX: 0.15, duration: 0.08, ease: 'sine.inOut', repeat: 5, yoyo: true }, 0.18)
      .to(coin, { opacity: 0, scale: 0.1, duration: 0.1 }, 0.82)
      .to(stage, { scale: 1.1, duration: 0.1, ease: 'power1.out' }, 0.82)
      .to(stage, { scale: 1, duration: 0.25, ease: 'back.out(2)' }, 0.92)
      .call(() => resolveLanded(), null, 0.95);

    function reset() {
      tl.kill();
      gsap.set(outline, { opacity: 1 });
      gsap.set(morphIcon, { opacity: 0 });
      morphShape.setAttribute('d', DIAMOND_PATH);
      gsap.set(coin, { opacity: 0 });
      gsap.set(stage, { scale: 1 });
    }

    return { landed, reset };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const anim = playPigAnimation();
    try {
      const cred = await iniciarSesion(email, password);
      await anim.landed;
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
      anim.reset();
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
            {/* Al dar clic en Entrar, el rombo se transforma en marranito
                (morph real via flubber) mientras una moneda sale, salta y
                cae — ver playPigAnimation() arriba. */}
            <div
              ref={stageRef}
              className="relative w-10 h-10 tall-sm:w-14 tall-sm:h-14 shrink-0">
              <div
                ref={outlineWrapRef}
                className="absolute inset-0">
                <Logo
                  size={56}
                  className="w-full h-full"
                />
              </div>
              <svg
                ref={morphIconRef}
                viewBox="0 0 24 24"
                className="absolute inset-0 w-full h-full opacity-0">
                <path
                  ref={morphShapeRef}
                  className="text-gold"
                  fill="currentColor"
                  d={DIAMOND_PATH}
                />
              </svg>
              <svg
                ref={coinRef}
                viewBox="0 0 60 60"
                className="absolute opacity-0 pointer-events-none"
                style={{
                  width: '55%',
                  height: '55%',
                  left: '50%',
                  top: '40%',
                  marginLeft: '-27.5%',
                  marginTop: '-27.5%',
                }}>
                <defs>
                  <radialGradient
                    id="loginCoinGrad"
                    cx="35%"
                    cy="30%"
                    r="75%">
                    <stop
                      offset="0%"
                      stopColor="#F4EBD3"
                    />
                    <stop
                      offset="55%"
                      stopColor="#D9C9A3"
                    />
                    <stop
                      offset="100%"
                      stopColor="#A98F5D"
                    />
                  </radialGradient>
                </defs>
                <circle
                  cx="30"
                  cy="30"
                  r="27"
                  fill="url(#loginCoinGrad)"
                  stroke="#8A7550"
                  strokeWidth="2"
                />
                <circle
                  cx="30"
                  cy="30"
                  r="21"
                  fill="none"
                  stroke="#8A7550"
                  strokeWidth="1.4"
                  strokeOpacity=".5"
                />
                <text
                  x="30"
                  y="39"
                  textAnchor="middle"
                  fontFamily="IBM Plex Sans, sans-serif"
                  fontWeight="700"
                  fontSize="26"
                  fill="#0A0A09">
                  $
                </text>
              </svg>
            </div>
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

