import ProtectedLayout from "./ProtectedLayout";

/**
 * Panel operativo (Plan Maestro, Fase 4). Lo usan tanto el cobradiario como
 * el admin mientras las páginas operativas (clientes, créditos, cobros,
 * ruta, caja) todavía sean compartidas entre roles; el filtrado de datos
 * por rol se implementa página a página en las fases siguientes (5-8).
 * Se deja como componente propio (en vez de reutilizar ProtectedLayout
 * directamente en las rutas) para poder darle nav/header propios de
 * cobradiario más adelante sin tocar App.jsx otra vez.
 */
export default function CobradiarioLayout({ children }) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
