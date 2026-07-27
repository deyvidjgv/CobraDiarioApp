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

- Muestra los clientes que deben ser visitados hoy
- Prioriza los clientes con mora
- Incluye botón GPS para abrir Google Maps

### Registrar Cobro

- Registrar pagos por cliente
- Ver saldo pendiente y recargos
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

- Ajustar interés, días hábiles, moneda y seguro
- Botón de instalación PWA
- El botón se desactiva cuando la app ya está instalada

---

## PWA e instalación

- La app puede instalarse como PWA en navegadores compatibles
- El botón de instalación está en la pantalla de Configuración
- Se deshabilita cuando la app ya está instalada
- La app usa persistencia local de Firestore para funcionar offline

---

## Mejoras recientes

- Navegación atrás mejorada para evitar volver a créditos eliminados
- Header muestra spinner de carga mientras la página está cargando
- Botón de confirmación de modal estandarizado para móviles
- Iconos del menú actualizados para `Cobro Diario` y `Caja`
- Soporte de instalación PWA más robusto

---

## Cómo usar

Consulta `ComoUsarApp.md` para un manual sencillo y claro de uso.
