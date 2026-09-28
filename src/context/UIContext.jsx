import { createContext, useContext, useState } from "react";

const UIContext = createContext(null);

/**
 * Estado de UI global:
 *  - drawerOpen: menú lateral tipo hamburguesa (móvil Y escritorio). Antes
 *    la barra de escritorio era estática (siempre visible, solo se podía
 *    contraer a puros iconos); ahora es un cajón que arranca OCULTO y se
 *    abre con el botón ☰ del Header, igual para Admin y Cobradiario —
 *    deja toda la pantalla libre para el contenido hasta que se necesita.
 */
export function UIProvider({ children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <UIContext.Provider value={{ drawerOpen, setDrawerOpen }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI debe usarse dentro de un UIProvider");
  }
  return context;
}
