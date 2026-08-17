# CrediDev — Rediseño premium minimalista (paleta 1b: hueso + grafito)

Copia estos archivos sobre tu repo respetando las rutas. Todos usan los tokens de
Tailwind que ya existen (`primary`, `surface-1`, `mora`…): solo cambian los valores,
así que el resto de las páginas se actualiza solo.

## Archivos que reemplazas
| Ruta | Qué cambia |
| --- | --- |
| tailwind.config.js | paleta nueva + Manrope / JetBrains Mono |
| index.html | fuentes de Google + theme-color |
| src/styles/index.css | fondo hueso, bordes #E3DFD8, sin degradado índigo |
| src/components/ui/Badge.jsx | estados con tokens, sin colores por defecto de Tailwind |
| src/components/ui/MetricCard.jsx | superficies neutras, cifra en mono |
| src/components/ui/ClientRow.jsx | 1 sola acción por fila (`···`), objetivo táctil de 44px |
| src/components/layout/ProtectedLayout.jsx | monta la barra inferior en móvil |
| src/pages/RutaDelDia/RutaDelDia.jsx | progreso, 3 filtros, hoja de acciones, deshacer |

## Archivos nuevos
- src/components/ui/RouteProgress.jsx — encabezado de progreso de la ruta
- src/components/ui/VisitActionSheet.jsx — hoja inferior con las gestiones + contacto
- src/components/ui/UndoToast.jsx — aviso con "Deshacer"
- src/components/layout/BottomNav.jsx — barra inferior de 5 (Inicio · Ruta · Clientes · Caja · Más)

## Nota sobre "Deshacer"
Las visitas son inmutables (`useVisits` solo tiene `registrarVisita`), así que el
deshacer NO borra nada: la gestión se retiene 5 segundos en memoria y solo se
escribe en Firestore si el usuario no la deshace. No hay que tocar el hook.

## Pendiente de tu lado
Reemplaza `public/icons/credi-dev-logo.png` por el logo con fondo transparente
(SVG idealmente); el PNG actual tiene fondo gris y se ve como caja sobre hueso.
