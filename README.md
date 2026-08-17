# CobraDiarioApp — Sistema de Gestión de Cobranza Diaria

**CobraDiarioApp** es una aplicación progresiva (PWA) para cobradores de campo y administradores de crédito. Está diseñada para funcionar en dispositivos móviles y escritorio, con soporte offline, GPS y reportes.

Construida con **React 18**, **Vite**, **Tailwind CSS** y **Firebase Firestore**.

---

## Contenido

- [Resumen](#resumen)
- [Instalación](#instalación)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Firestore y datos](#firestore-y-datos)
- [Funciones principales](#funciones-principales)
- [PWA e instalación](#pwa-e-instalación)
- [Roles: Admin y Cobradiario](#roles-admin-y-cobradiario)
- [Mejoras recientes](#mejoras-recientes)
- [Cómo usar](#cómo-usar)

---

## Resumen

CobraDiarioApp permite:

- Registrar clientes y créditos
- Controlar la ruta diaria de cobranza
- Registrar cobros individuales y calcular recargos
- Llevar la caja con ingresos y egresos
- Generar reportes PDF
- Instalar la app como PWA
- Trabajar offline y sincronizar con Firestore

---

## Instalación

### Requisitos

- Node.js 18 o superior
- npm o yarn
- Proyecto Firebase con Firestore y Authentication habilitados

### Pasos

1. Clona el repositorio:
```bash
git clone <URL_DEL_REPOSITORIO> CobraDiarioApp
cd CobraDiarioApp/cobro-diario-app
```

2. Instala dependencias:
```bash
npm install
```

3. Crea un archivo `.env` con la configuración de Firebase:
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

4. Ejecuta en modo desarrollo:
```bash
npm run dev
```

5. Compila para producción:
```bash
npm run build
```

---

## Estructura del proyecto

- `src/App.jsx` — enrutador principal
- `src/main.jsx` — punto de entrada
- `src/firebase/` — inicialización de Firebase y CRUD de Firestore
- `src/context/` — contexto de autenticación
- `src/hooks/` — hooks personalizados para clientes, préstamos y caja
- `src/logic/` — lógica de negocio y cálculos financieros
- `src/components/` — componentes reutilizables de UI y layout
- `src/pages/` — pantallas de la aplicación
- `src/styles/index.css` — estilos globales
- `firebase/firestore.rules` — reglas de seguridad de Firestore (por rol admin/cobradiario)
- `tests/firestore.rules.test.js` — pruebas de esas reglas contra el emulador (`npm run test:rules`)

---

## Firestore y datos

La app usa un modelo multitenant. Todos los datos se guardan bajo `organizations/{orgId}`.

Colecciones principales:

- `clients` — datos generales del cliente
- `loans` — créditos y préstamos
- `movements` — caja, cobros, nuevos préstamos, gastos y recargos
- `settings` — configuración de la organización

Datos clave:

- `clientId` vincula créditos con clientes
- `ubicacion` se guarda en el cliente y permite abrir Google Maps
- `movements` refleja el flujo de caja diario

---

## Funciones principales

### Inicio

- Panel de accesos rápidos
- Controles principales para el flujo de trabajo

### Ruta del Día

- Lista principal agrupada por el próximo día de cobro de cada crédito
  (Hoy, Mañana, y así sucesivamente), con "Ver más" para ir revelando
  días siguientes sin saturar la pantalla
- Dentro de cada día, ordena por prioridad: mora primero, luego al día
- Filtro "Hoy" (la ruta del día actual) y filtro "Mora" (todos los
  créditos atrasados sin importar cuándo les toque la próxima cuota,
  separados entre mora general y mora que además cobra hoy)
- Incluye botón GPS para abrir Google Maps

### Registrar Cobro

- Registrar pagos por cliente (incluye abonos parciales)
- Ver saldo pendiente y recargos por vencimiento (se aplican solos al
  registrar el cobro, sin paso manual)
- Renovar cartulina en cualquier momento: cierra el crédito actual y
  crea uno nuevo por el monto solicitado, sumando interés y seguro
  (si está activo) al nuevo total a pagar
- Guardar ubicación GPS del cliente

### Clientes

- Crear y editar clientes
- Eliminar cliente con contraseña si no tiene créditos activos
- Ver historial de créditos relacionados

### Créditos

- Crear préstamos con capital, interés y cuotas
- Ver saldo y pagos realizados
- Eliminar crédito con contraseña y limpiar movimientos asociados

### Caja

- Registrar ingresos y egresos manuales
- Ver saldo diario
- Registrar movimientos para mantener el histórico financiero

### Reportes

- Exportar cierres diarios a PDF
- Ver historial de cierres y caja

### Configuración

- Ajustar interés por defecto, seguro/comisión y recargo por vencimiento
  (solo el Admin puede modificar estas reglas de negocio)
- Botón de instalación PWA
- El botón se desactiva cuando la app ya está instalada

---

## PWA e instalación

- La app puede instalarse como PWA en navegadores compatibles
- El botón de instalación está en la pantalla de Configuración
- Se deshabilita cuando la app ya está instalada
- La app usa persistencia local de Firestore para funcionar offline

---

## Roles: Admin y Cobradiario

La app opera con dos roles sobre el mismo modelo multitenant
(`organizations/{orgId}`):

- **Admin** — dueño de la organización. Crea/activa/desactiva
  cobradiarios, ajusta las reglas de negocio (interés, seguro, recargo
  por vencimiento), aprueba o rechaza correcciones, y ve reportes,
  dashboard y auditoría de toda la organización. No opera créditos ni
  cobros directamente.
- **Cobradiario** — hace el trabajo operativo: gestiona sus propios
  clientes y créditos, registra cobros en su ruta diaria, y solicita
  correcciones cuando se equivoca al registrar un monto (los cobros y
  préstamos son inmutables — nunca se editan ni se borran directamente).

`userIndex/{uid}` + `organizations/{orgId}/users/{uid}` guardan el
`role: "admin" | "cobradiario"` de cada usuario. Todo usuario existente
se auto-registra como admin de su propia organización la primera vez
que entra (sin migración manual). `firebase/firestore.rules` autoriza
cada operación según ese rol — el cobradiario solo puede tocar sus
propios registros operativos, nunca editar ni borrar movimientos
financieros ya creados; esa capacidad queda reservada al Admin.

### Cómo se crean los cobradiarios (sin backend)

El hosting es **Netlify (frontend) + Firebase en plan Spark (gratis)** —
por eso no se usa Cloud Functions (requieren plan Blaze). Crear un
cobradiario corre 100% en el navegador:

1. `src/firebase/secondaryAuth.js` abre una **instancia secundaria** de
   Firebase solo para crear la cuenta de Auth del cobradiario, sin cerrar
   la sesión del Admin en la instancia principal.
2. Con esa sesión (la del Admin, sin interrupciones) se registra la ficha
   del cobradiario en Firestore (`registerCobradiarioMember` en
   `src/firebase/firestore.js`).
3. `firebase/firestore.rules` autoriza esa escritura solo si quien la hace
   es un admin activo de esa organización, y solo puede *crear* (nunca
   sobreescribir) esos documentos.

Desactivar un cobradiario hoy es solo a nivel de datos (le bloquea el
acceso a la organización); su cuenta de Auth sigue existiendo porque no
hay backend para deshabilitarla — es la limitación aceptada de quedarse
en el plan gratis.

### Probar las reglas de Firestore

Hay pruebas automatizadas contra el emulador real de Firestore (no
mocks) en `tests/firestore.rules.test.js`:

```bash
npm run test:rules
```

Requiere Java (el emulador de Firestore lo necesita) y `firebase-tools`
(ya está en `devDependencies`). Esto es **solo herramienta de
desarrollo**: no se instala ni se despliega para los usuarios finales ni
en Netlify.

---

## Mejoras recientes

- Rediseño visual completo: tema oscuro "Obsidiana + champán", tipografías
  Instrument Sans / IBM Plex Sans / JetBrains Mono, íconos en `public/iconos/`
- Responsive revisado a fondo para móvil/tablet (breakpoint en `1024px`,
  antes `768px`), ya que la app se usa mayoritariamente desde el celular
- Ruta del Día rediseñada: agrupación por próximo día de cobro con
  prioridad de mora, filtros Hoy/Mora, badge de pendientes en la barra
  inferior
- Corrección de saldo: aprobar una corrección ahora también ajusta el
  saldo pendiente del crédito (antes solo cuadraba la caja) y muestra el
  desglose completo (monto original, corregido, diferencia) a cobrador y
  admin
- Renovación de cartulina: número de cuotas editable, seguro sumado al
  total a pagar (no solo restado del efectivo entregado), y separador de
  miles en los montos
- Recargo por vencimiento se aplica automáticamente al registrar un cobro
  sobre un crédito vencido, sin paso manual
- Navegación atrás mejorada para evitar volver a créditos eliminados
- Header muestra spinner de carga mientras la página está cargando
- Botón de confirmación de modal estandarizado para móviles
- Soporte de instalación PWA más robusto

---

## Cómo usar

Consulta `ComoUsarApp.md` para un manual sencillo y claro de uso.
