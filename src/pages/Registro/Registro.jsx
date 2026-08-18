import { useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import Logo from '../../components/ui/Logo';
import { useAuth } from '../../context/AuthContext';
import {
  IconBrandWhatsapp,
  IconMail,
  IconArrowRight,
  IconChecklist,
} from '@tabler/icons-react';

const WHATSAPP_NUMERO = '573044212892';
const CONTACTO_EMAIL = 'deyvidjgv12@gmail.com';

const MENSAJE_WHATSAPP = 'Hola, quiero información sobre CrediDev para mi negocio.';
const ASUNTO_EMAIL = 'Información sobre CrediDev';

const BENEFICIOS = [
  'Control de clientes, créditos y cobros diarios',
  'Caja, reportes y auditoría en tiempo real',
  'Cuentas separadas para tus cobradores',
];

/**
 * Punto de contacto para negocios nuevos interesados en CrediDev — NO crea
 * cuentas de Firebase Auth ni organizaciones. Las cuentas de Admin se dan
 * de alta manualmente: cualquier cuenta de Firebase Auth que inicia sesión
 * sin tener userIndex/{uid} se vuelve Admin de una organización nueva en
 * automático (ver AuthContext.jsx). Así que, tras el contacto, basta con
 * crear la cuenta en Firebase Console → Authentication → "Add user" y
 * compartirle las credenciales al negocio — el resto lo hace la app sola
 * en su primer login por /login.
 */
export default function Registro() {
  const { usuario } = useAuth();

  const yaHabiaSesion = useRef(!!usuario);
  if (yaHabiaSesion.current)
    return (
      <Navigate
        to="/"
        replace
      />
    );

  const linkWhatsapp = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(MENSAJE_WHATSAPP)}`;
  // Enlace de composición web de Gmail en vez de mailto: — el correo de
  // contacto es Gmail, y mailto: depende de que el dispositivo tenga una
  // app de correo predeterminada configurada (a veces abre un selector
  // genérico en vez de ir directo a componer).
  const linkEmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACTO_EMAIL)}&su=${encodeURIComponent(ASUNTO_EMAIL)}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-bg p-4 sm:p-6 lg:p-8">
      <div className="w-full min-w-0 max-w-md sm:max-w-4xl bg-surface rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 sm:grid-cols-2 border border-line">
        {/* Panel decorativo */}
        <div className="bg-obsidian p-8 sm:p-10 flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gold/[0.04]" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-primary/[0.03]" />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <Logo size={56} />
            <div>
              <h1 className="font-display text-3xl font-semibold text-primary tracking-tight">
                CrediDev
              </h1>
              <p className="text-primary-light text-sm mt-1">
                Gestión financiera moderna
              </p>
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div className="p-6 sm:p-10 flex flex-col justify-center bg-surface">
          <h2 className="text-2xl font-bold text-primary mb-1">
            ¿Quieres llevar tu negocio a CrediDev?
          </h2>
          <p className="text-sm text-primary-light/70 mb-6">
            Escríbenos y configuramos tu organización — luego entras con tus
            propias credenciales desde el inicio de sesión.
          </p>

          <ul className="space-y-2.5 mb-7">
            {BENEFICIOS.map((beneficio) => (
              <li
                key={beneficio}
                className="flex items-start gap-2.5 text-sm text-primary-light">
                <IconChecklist
                  size={18}
                  stroke={1.5}
                  className="text-gold shrink-0 mt-0.5"
                />
                <span>{beneficio}</span>
              </li>
            ))}
          </ul>

          <div className="space-y-3">
            <a
              href={linkWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-gold hover:bg-gold/90 active:scale-[0.98] text-surface-1 font-medium rounded-xl py-3.5 flex items-center justify-center gap-2 transition-all shadow-md shadow-black/40">
              <IconBrandWhatsapp
                size={18}
                stroke={1.5}
              />
              Escribir por WhatsApp
              <IconArrowRight
                size={18}
                stroke={2}
              />
            </a>

            <a
              href={linkEmail}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-surface-1 hover:bg-surface-1/70 active:scale-[0.98] text-primary font-medium rounded-xl py-3.5 flex items-center justify-center gap-2 transition-all border border-line">
              <IconMail
                size={18}
                stroke={1.5}
              />
              Enviar correo
            </a>
          </div>

          <p className="text-center text-primary-light/70 text-sm mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              className="text-primary-light font-semibold hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
