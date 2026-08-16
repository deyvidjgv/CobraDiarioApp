import { useNavigate } from "react-router-dom";
import { IconChevronLeft, IconMenu2, IconLoader2 } from "@tabler/icons-react";
import { useUI } from "../../context/UIContext";
import { useAndroidBack } from "../../hooks/useAndroidBack";

/**
 * Header global de la app.
 *
 * Props:
 *  - title: string — título de la página
 *  - showBack: bool — muestra botón "volver" en la izquierda (el ☰ siempre aparece a la derecha)
 *  - backTo: string|null — ruta a la que debe navegar el botón "volver" en lugar de retroceder en el historial
 *  - right: ReactNode — contenido opcional en la esquina derecha (reemplaza el ☰)
 *  - loading: bool — indica que la página está cargando y deshabilita la navegación de retroceso
 */
export default function Header({ 
  title, 
  showBack = false, 
  backTo = null,
  right = null,
  loading = false,
  modalOpen = false,
  closeModal = () => {}
}) {
  const navigate = useNavigate();
  const { drawerOpen, setDrawerOpen } = useUI();

  // Se inicializa el hook de Android Back aquí para que cada pantalla que use Header tenga la lógica centralizada
  useAndroidBack({ modalOpen, closeModal, showBack, backTo, loading });

  return (
    <>
      <header className="sticky top-0 z-40 bg-gradient-to-r from-[#3B348C] to-primary-light px-4 py-3.5 flex items-center gap-3 shadow-md shadow-primary-light/20">
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
            className={`p-1 -ml-1 rounded-lg transition ${loading ? "opacity-40 cursor-not-allowed" : "hover:bg-white/15"}`}
            aria-label="Volver"
          >
            <IconChevronLeft size={22} stroke={1.5} className="text-white" />
          </button>
        ) : (
          /* Espacio reservado para mantener el título alineado */
          <div className="w-[30px]" aria-hidden="true" />
        )}

        <h1 className="text-lg font-semibold flex-1 text-white tracking-tight truncate">{title}</h1>

        {/* Derecha: contenido personalizado o botón ☰ (solo móvil; en
            escritorio la navegación es la barra lateral estática) */}
        <div className="flex items-center gap-2">
          {loading && (
            <IconLoader2 size={20} stroke={1.5} className="text-white animate-spin" />
          )}
          {right ? (
            <div>{right}</div>
          ) : (
            <button
              id="nav-menu-toggle"
              onClick={() => setDrawerOpen(true)}
              className="md:hidden p-1 -mr-1 rounded-lg hover:bg-white/15 transition"
              aria-label="Abrir menú"
              aria-expanded={drawerOpen}
              aria-controls="nav-drawer"
            >
              <IconMenu2 size={22} stroke={1.5} className="text-white" />
            </button>
          )}
        </div>
      </header>
    </>
  );
}
