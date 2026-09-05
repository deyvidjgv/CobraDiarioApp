# CrediDev — Sistema de Gestión de Cobranza Diaria

**CrediDev** es una aplicación progresiva (PWA) para cobradores de campo y administradores de crédito. Está diseñada para funcionar en dispositivos móviles y escritorio, con soporte offline, G[...]

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

CrediDev permite:

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
git clone <URL_DEL_REPOSITORIO> CrediDev
cd CrediDev
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

### Ejecución rápida (demo)

Sigue estos pasos para que cualquiera pueda ejecutar la app localmente usando credenciales de demostración:

1. Copia el ejemplo de variables de entorno:
   cp .env.example .env

2. Edita `.env` y rellena las variables con la configuración de Firebase (o crea un proyecto Firebase de demo).

3. Instala dependencias:
   npm install

4. Ejecuta en modo desarrollo:
   npm run dev

Credenciales de demostración (solo para probar)
- Correo: admin@credidev.com
- Contraseña: 123456

¿Quieres probar sin clonar? Visita la demo en vivo:
https://credidev.netlify.app/

Opcional — usar Firebase Emulator (recomendado para pruebas locales sin tocar un proyecto real):

1. Instala la CLI:
   npm i -g firebase-tools
2. Inicializa emuladores:
   firebase init emulators
3. Inicia emuladores:
   firebase emulators:start

Seguridad rápida
- No subas nunca archivos con claves reales (service account JSON ni .env con valores reales).
- Si decides mantener una demo pública, crea un proyecto Firebase exclusivo para demo y aplica reglas estrictas y/o restricciones de API key por referrer.

---

## Estructura del proyecto

- `src/App.jsx` — enrutador principal
- `src/main.jsx` — punto de entrada
- `src/firebase/` — inicialización de Firebase y CRUD de Firestore
- `src/context/` — contexto de autenticación
- `src/hooks/` — hooks personalizados para clientes, préstamos y caja
- `src/logic/` — lógica de negocio y cálculos financieras
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
  crea uno nuevo por el monto solicitado, sumando solo el interés al
  nuevo total a pagar (el seguro se cobra aparte del saldo del crédito,
  no como deuda)
- Guardar ubicación GPS del cliente

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
role: "admin" | "cobradiario" de cada usuario. Todo usuario existente
se auto-registra como admin de su propia organización la primera vez
que entra (sin migración manual). `firebase/firestore.rules` autoriza
cada operación según ese rol — el cobradiario solo puede tocar sus
propios registros operativos, nunca editar ni borrar movimientos
financieros ya creados; esa capacidad queda reservada al Admin.

---

## Cómo usar

Consulta `ComoUsarApp.md` para un manual sencillo y claro de uso.
