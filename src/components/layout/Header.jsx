import { useNavigate } from 'react-router-dom';
import { IconChevronLeft, IconMenu2, IconLoader2 } from '@tabler/icons-react';
import { useUI } from '../../context/UIContext';
import { useAndroidBack } from '../../hooks/useAndroidBack';

/**
 * Header global de la app.
 *
 * Props:
 *  - title: string â€” tÃ­tulo de la pÃ¡gina
 *  - showBack: bool â€” muestra botÃ³n "volver" en la izquierda (el â˜° siempre aparece a la derecha)
 *  - backTo: string|null â€” ruta a la que debe navegar el botÃ³n "volver" en lugar de retroceder en el historial
 *  - right: ReactNode â€” contenido opcional en la esquina derecha (reemplaza el â˜°)
 *  - loading: bool â€” indica que la pÃ¡gina estÃ¡ cargando y deshabilita la navegaciÃ³n de retroceso
 */
export default function Header({
  title,
  showBack = false,
  backTo = null,
  right = null,
  loading = false,
  modalOpen = false,
  closeModal = () => {},
}) {
  const navigate = useNavigate();
  const { drawerOpen, setDrawerOpen } = useUI();

  // Se inicializa el hook de Android Back aquÃ­ para que cada pantalla que use Header tenga la lÃ³gica centralizada
  useAndroidBack({ modalOpen, closeModal, showBack, backTo, loading });

  return (
    <>
      <header className="sticky top-0 z-40 bg-gradient-to-r from-[#1A1917] via-[#3A3733] to-[#3A3733] px-4 py-3.5 flex items-center gap-3 shadow-md shadow-black/20">
        {showBack ? (
          /* BotÃ³n volver a la izquierda */
          <button
            type="button"
            onClick={() => {
              if (loading) return;
              if (backTo) {
                navigate(backTo, { replace: true });
              } else {
                navigate(-1);
              }
            }}
            disabled={loading}
            aria-disabled={loading}
            className={`p-1 -ml-1 rounded-lg transition ${loading ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/15'}`}
            aria-label="Volver">
            <IconChevronLeft
              size={22}
              stroke={1.5}
              className="text-white"
            />
          </button>
        ) : (
          /* Espacio reservado para mantener el tÃ­tulo alineado */
          <div
            className="w-[30px]"
            aria-hidden="true"
          />
        )}

        <h1 className="text-lg font-semibold flex-1 text-white tracking-tight truncate">
          {title}
        </h1>

        {/* Derecha: contenido personalizado o botÃ³n â˜° (solo mÃ³vil; en
            escritorio la navegaciÃ³n es la barra lateral estÃ¡tica) */}
        <div className="flex items-center gap-2">
          {loading && (
            <IconLoader2
              size={20}
              stroke={1.5}
              className="text-white animate-spin"
            />
          )}
          {right ? (
            <div>{right}</div>
          ) : (
            <button
              id="nav-menu-toggle"
              onClick={() => setDrawerOpen(true)}
              className="md:hidden p-1 -mr-1 rounded-lg hover:bg-white/15 transition"
              aria-label="Abrir menÃº"
              aria-expanded={drawerOpen}
              aria-controls="nav-drawer">
              <IconMenu2
                size={22}
                stroke={1.5}
                className="text-white"
              />
            </button>
          )}
        </div>
      </header>
    </>
  );
}

