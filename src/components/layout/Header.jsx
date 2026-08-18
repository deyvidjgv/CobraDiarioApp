import { useNavigate } from 'react-router-dom';
import { IconChevronLeft, IconLoader2 } from '@tabler/icons-react';
import { useAndroidBack } from '../../hooks/useAndroidBack';

/**
 * Header global de la app.
 *
 * Props:
 *  - title: string — título de la página
 *  - showBack: bool — muestra botón "volver" en la izquierda
 *  - backTo: string|null — ruta a la que debe navegar el botón "volver" en lugar de retroceder en el historial
 *  - right: ReactNode — contenido opcional en la esquina derecha
 *  - loading: bool — indica que la página está cargando y deshabilita la navegación de retroceso
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

  // Se inicializa el hook de Android Back aquí para que cada pantalla que use Header tenga la lógica centralizada
  useAndroidBack({ modalOpen, closeModal, showBack, backTo, loading });

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface-1/95 backdrop-blur border-b border-line px-4 py-3.5 flex items-center gap-3">
        {showBack ? (
          /* Botón volver a la izquierda */
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
            className={`p-1 -ml-1 rounded-lg transition ${loading ? 'opacity-40 cursor-not-allowed' : 'hover:bg-surface-2'}`}
            aria-label="Volver">
            <IconChevronLeft
              size={22}
              stroke={1.5}
              className="text-primary"
            />
          </button>
        ) : (
          /* Espacio reservado para mantener el título alineado */
          <div
            className="w-[30px]"
            aria-hidden="true"
          />
        )}

        <h1 className="font-display text-lg font-semibold flex-1 text-primary tracking-tight truncate">
          {title}
        </h1>

        {/* Derecha: contenido personalizado de la página (la navegación en
            móvil vive en BottomNav; en escritorio lg+, en la barra lateral). */}
        <div className="flex items-center gap-2">
          {loading && (
            <IconLoader2
              size={20}
              stroke={1.5}
              className="text-gold animate-spin"
            />
          )}
          {right && <div>{right}</div>}
        </div>
      </header>
    </>
  );
}

