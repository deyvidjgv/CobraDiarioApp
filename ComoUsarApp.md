# Cómo Usar CrediDev — Manual de Usuario

Bienvenido a **CrediDev**, el sistema de gestión de cobranza diaria. Esta guía te ayudará a dominar cada función de la aplicación.

---

## Contenido

- [Inicio de sesión](#inicio-de-sesión)
- [Pantalla principal (Dashboard)](#pantalla-principal-dashboard)
- [Roles: Admin y Cobradiario](#roles-admin-y-cobradiario)
- [Registrar un cliente](#registrar-un-cliente)
- [Crear un crédito/préstamo](#crear-un-créditopréstamo)
- [Ruta diaria de cobranza](#ruta-diaria-de-cobranza)
- [Registrar un cobro](#registrar-un-cobro)
- [Renovar cartulina](#renovar-cartulina)
- [Llevar la caja](#llevar-la-caja)
- [Generar reportes PDF](#generar-reportes-pdf)
- [Configuración y PWA](#configuración-y-pwa)
- [Trabajar offline](#trabajar-offline)
- [Preguntas frecuentes](#preguntas-frecuentes)

---

## Inicio de sesión

### Crear una cuenta

1. Abre la app en tu navegador: **https://credidev.netlify.app/**
2. Haz clic en **"Registrarse"**
3. Ingresa tu correo electrónico y contraseña
4. Confirma tu correo (recibirás un enlace de verificación)
5. ¡Listo! Ahora eres **Admin** de tu organización

### Credenciales de demostración

Si quieres probar sin crear una cuenta:

- **Correo:** admin@credidev.com
- **Contraseña:** 123456

### Recuperar contraseña

1. En la pantalla de inicio de sesión, haz clic en **"¿Olvidaste tu contraseña?"**
2. Ingresa tu correo
3. Recibirás un enlace para resetear tu contraseña

---

## Pantalla principal (Dashboard)

Después de iniciar sesión, verás el **panel de accesos rápidos** con los siguientes botones:

- **📋 Ruta del día** — Tu lista de cobros programados para hoy
- **➕ Registrar cobro** — Registra un pago de un cliente
- **➕ Nuevo cliente** — Crea un cliente nuevo
- **➕ Nuevo crédito** — Crea un préstamo para un cliente existente
- **📊 Caja** — Visualiza los movimientos de ingresos y egresos
- **📄 Reportes** — Genera reportes PDF (solo Admin)
- **⚙️ Configuración** — Ajusta parámetros de la app y tu organización

Cada sección es intuitiva y te guiará paso a paso.

---

## Roles: Admin y Cobradiario

### ¿Qué es un Admin?

El **Admin** es el dueño de la organización. Sus funciones incluyen:

- Crear y activar cobradiarios
- Ajustar configuración de negocio (interés, seguro, recargo por vencimiento)
- Ver reportes y auditoría de toda la organización
- Aprobar o rechazar correcciones de cobradiarios
- **No opera créditos ni cobros directamente**

### ¿Qué es un Cobradiario?

El **Cobradiario** es el operador de campo. Sus funciones incluyen:

- Gestionar sus propios clientes y créditos
- Registrar cobros en su ruta diaria
- Solicitar correcciones si se equivoca al registrar un monto
- **No puede editar ni borrar movimientos ya creados** (para garantizar auditoría)

### Crear un cobradiario (Solo Admin)

1. Ve a **⚙️ Configuración**
2. Busca la sección **"Gestionar cobradiarios"** o **"Usuarios"**
3. Haz clic en **"Agregar cobradiario"**
4. Ingresa el correo del cobradiario
5. El cobradiario recibirá una invitación para unirse a tu organización

---

## Registrar un cliente

Los clientes son las personas a quienes les prestamos dinero.

### Pasos

1. Desde el **Dashboard**, haz clic en **➕ Nuevo cliente**
2. Rellena los datos:
   - **Nombre completo** (requerido)
   - **Teléfono** (requerido)
   - **Dirección**
   - **Ubicación/GPS** (opcional, pero recomendado para abrir Google Maps)
   - **Correo** (opcional)
   - **Cédula/ID** (opcional, pero recomendado)

3. Haz clic en **"Guardar cliente"**
4. ¡Listo! El cliente aparecerá en tu lista

### Editar o eliminar cliente

La edición de clientes está disponible solo para datos básicos. Para cambios mayores, contacta al Admin.

---

## Crear un crédito/préstamo

Un **crédito** es un préstamo que le haces a un cliente.

### Pasos

1. Desde el **Dashboard**, haz clic en **➕ Nuevo crédito**
2. **Selecciona un cliente** existente (o crea uno primero)
3. Rellena los datos del crédito:
   - **Monto principal** — cantidad prestada
   - **Interés (%)** — porcentaje de ganancia
   - **Seguro** — comisión por protección (se cobra aparte)
   - **Recargo por vencimiento (%)** — penalización si se atrasa
   - **Fecha de desembolso** — cuándo se prestó
   - **Frecuencia de cuotas** — diaria, semanal, quincenal o mensual
   - **Número de cuotas** — cuántas veces paga

4. **Sistema de cálculo automático:**
   - Total a pagar = Monto principal + (Monto principal × Interés %)
   - Cuota regular = Total a pagar ÷ Número de cuotas
   - Recargo = se aplica automáticamente si se atrasa la cuota

5. Haz clic en **"Crear crédito"**
6. ¡Listo! El crédito está activo y aparecerá en la **Ruta del día**

---

## Ruta diaria de cobranza

La **Ruta del día** es tu lista organizada de cobros programados.

### Cómo funciona

- **Agrupación por fecha:** Hoy, Mañana, etc.
- **Ordenamiento por prioridad:**
  - Primero: clientes en mora (atrasados)
  - Después: clientes al día
- **Botón GPS:** Abre Google Maps con la ubicación del cliente

### Filtros disponibles

- **🔍 Filtro "Hoy"** — muestra solo los cobros de hoy
- **🔍 Filtro "Mora"** — muestra todos los clientes atrasados

### Botones de acción

- **📍 GPS** — abre la ubicación del cliente en Google Maps
- **💰 Registrar cobro** — lleva directo a la pantalla de cobro
- **Ver más** — revela más días sin saturar la pantalla

---

## Registrar un cobro

Es el corazón de la app: registrar cuánto pagó cada cliente.

### Pasos

1. Desde **Ruta del día**, haz clic en **💰 Registrar cobro**
2. O desde el **Dashboard**, haz clic en **➕ Registrar cobro** y selecciona un cliente
3. Verás:
   - **Cuota esperada** — cuánto debería pagar hoy
   - **Saldo pendiente** — cuánto le falta pagar en total
   - **Recargos por vencimiento** — si está atrasado, aparecerá el recargo (se suma automáticamente)
   - **Ubicación GPS** — se guarda automáticamente

4. Ingresa el **monto pagado**
   - Puede ser igual a la cuota, menos (abono parcial), o más
   
5. Selecciona la **fecha del pago** (por defecto, hoy)

6. Haz clic en **"Registrar cobro"**

7. ¡Listo! El pago se guardó en:
   - El historial del cliente
   - La caja de la organización
   - Se calcula automáticamente el siguiente vencimiento

### Cobros parciales

Si un cliente paga menos de lo que debe:
- El pago se registra como **abono parcial**
- El saldo pendiente se actualiza
- La próxima cuota se deberá en la fecha programada
- Si se atrasa más, se sumarán recargos

---

## Renovar cartulina

Cuando un cliente termina su crédito actual, puedes **renovar su cartulina** (crear un nuevo crédito).

### Pasos

1. Desde **Ruta del día**, selecciona el cliente cuyo crédito está por terminar
2. Haz clic en **🔄 Renovar cartulina**
3. Verás una pantalla con:
   - Crédito anterior (solo lectura)
   - Nuevo monto solicitado
   - Interés (automático, configurado por Admin)
   - Seguro (se cobra aparte, no se suma a la deuda)

4. Rellena los datos del nuevo crédito:
   - **Nuevo monto principal**
   - **Número de cuotas**
   - **Fecha de desembolso**

5. El sistema **cierra automáticamente** el crédito anterior y crea uno nuevo
6. ¡Listo! El cliente continúa en la ruta con su nuevo crédito

### Diferencia con un nuevo crédito

- **Renovar cartulina:** cierra el anterior, suma solo el interés
- **Nuevo crédito:** es completamente independiente

---

## Llevar la caja

La **Caja** es el registro de todos los movimientos de dinero: ingresos y egresos.

### Movimientos registrados automáticamente

Cuando registras un cobro, se agrega automáticamente a la caja:
- **Ingreso:** +Monto pagado
- **Seguro:** +Monto de seguro (si aplica)
- **Recargo:** +Recargo por vencimiento (si aplica)

### Agregar un movimiento manual

A veces necesitas registrar un egreso (gastos, transporte, etc.):

1. Ve a **📊 Caja**
2. Haz clic en **➕ Agregar movimiento**
3. Selecciona el **tipo:**
   - **Ingreso** — dinero que entra
   - **Egreso** — dinero que sale
4. Ingresa:
   - **Concepto** — qué es (ej: "Transporte", "Almuerzo")
   - **Monto**
   - **Fecha**
5. Haz clic en **"Guardar"**
6. ¡Listo! Aparecerá en el registro de caja

### Saldo diario

La app calcula automáticamente:
- **Ingresos del día** — suma de todos los cobros
- **Egresos del día** — suma de todos los gastos
- **Saldo neto** — Ingresos - Egresos

---

## Generar reportes PDF

Los **reportes** permiten analizar el rendimiento y generar documentos oficiales.

### Tipos de reportes (Solo Admin)

1. **Reporte de clientes** — lista de todos los clientes activos
2. **Reporte de créditos** — detalle de todos los préstamos vigentes
3. **Reporte de cobranza** — resumen de cobros en un período
4. **Reporte de caja** — movimientos de dinero con saldos
5. **Reporte de morosidad** — clientes atrasados
6. **Auditoría** — historial de acciones de cobradiarios

### Cómo generar un reporte

1. Ve a **📄 Reportes**
2. Selecciona el **tipo de reporte**
3. Elige el **período** (hoy, esta semana, este mes, rango personalizado)
4. (Opcional) Filtra por cobradiario o cliente
5. Haz clic en **"Generar PDF"**
6. Se descargará un archivo PDF con el reporte

### Usar el reporte

- Imprime el PDF para registros físicos
- Comparte con tu contador o auditor
- Usa para hacer seguimiento a cobradiarios

---

## Configuración y PWA

### Acceder a configuración

1. Desde el **Dashboard**, haz clic en **⚙️ Configuración**
2. Verás opciones como:

### Configuración personal

- **Cambiar contraseña**
- **Cambiar correo**
- **Cambiar foto de perfil**
- **Cambiar idioma** (si está disponible)

### Configuración de la organización (Admin)

- **Nombre de la organización**
- **Interés por defecto (%)** — se aplica a nuevos créditos
- **Seguro por defecto** — cantidad fija o porcentaje
- **Recargo por vencimiento (%)** — penalización si se atrasa
- **Gestionar cobradiarios** — crear, activar o desactivar usuarios

### Instalar como PWA (Progressive Web App)

La app puede instalarse en tu dispositivo para usarla sin internet.

1. Ve a **⚙️ Configuración**
2. Busca **"Instalar aplicación"** o **"Install as App"**
3. Haz clic en el botón
4. Sigue las instrucciones de tu navegador
5. ¡Listo! Aparecerá un icono en tu pantalla de inicio

**Navegadores compatibles:** Chrome, Edge, Firefox, Safari (iOS 15+)

---

## Trabajar offline

Una de las mejores características de CrediDev es funcionar **sin internet**.

### Cómo funciona

1. **Descarga de datos:** al iniciar sesión, la app descarga tus clientes y créditos localmente
2. **Operación offline:** puedes registrar cobros sin conexión
3. **Sincronización automática:** cuando vuelves a conectarte, todos los cambios se suben a Firestore

### Qué puedes hacer sin internet

✅ Ver tu ruta de cobranza  
✅ Registrar cobros  
✅ Ver detalles de clientes  
✅ Llevar la caja  
✅ Renovar cartulina  

### Qué NO puedes hacer sin internet

❌ Crear nuevos clientes (hasta sincronizar)  
❌ Crear nuevos créditos  
❌ Ver reportes en tiempo real  
❌ Cambiar configuración  

### Sincronizar manualmente

La sincronización es automática. Pero si quieres forzarla:

1. Abre el menú
2. Busca **"Sincronizar"** o **"Refresh"**
3. Haz clic
4. Espera a que se complete

---

## Preguntas frecuentes

### P: ¿Cómo cambio la frecuencia de cuotas de un crédito activo?

R: Los créditos activos no se pueden editar. Si necesitas cambiar la frecuencia, debes:
1. Registrar el saldo pendiente como cobro manual
2. Crear un nuevo crédito con la frecuencia deseada
O contactar al Admin para que lo corrija.

### P: ¿Qué pasa si un cliente paga un monto diferente?

R: La app acepta cualquier monto. Si paga menos, se registra como abono parcial. Si paga más, se descuenta del siguiente vencimiento.

### P: ¿Puedo borrar un cobro registrado?

R: No. Por seguridad, los cobros son inmutables. Si cometiste un error, debes:
1. Solicitar una **corrección** (Admin la revisará)
2. O registrar un **egreso** de la misma cantidad

### P: ¿Dónde veo el historial de cobros de un cliente?

R: Ve a **Ruta del día**, selecciona el cliente y haz clic en **"Ver historial"** o **"Detalles"**.

### P: ¿Cómo sé cuánto dinero tengo en caja hoy?

R: Ve a **📊 Caja** y verás el **saldo neto del día** al inicio o al pie de la página.

### P: ¿Qué pasa si pierdo mi teléfono?

R: Tu cuenta está protegida por contraseña. Solo alguien con tu correo y contraseña puede acceder. Si olvidas la contraseña, usa **"¿Olvidaste tu contraseña?"** en la pantalla de inicio.

### P: ¿Puedo usar la app en múltiples dispositivos?

R: Sí. Inicia sesión con tu cuenta en cualquier dispositivo. Los datos se sincronizarán automáticamente desde Firestore.

### P: ¿Qué pasa si tengo un problema?

R: Contacta al Admin de tu organización. El Admin puede:
- Revisar la auditoría de tu cuenta
- Aprobar o rechazar correcciones
- Resetear tu contraseña
- Desactivar tu cuenta si es necesario

---

## Soporte

¿Problemas o sugerencias? Contacta al equipo de CrediDev a través de:

- **Correo:** soporte@credidev.com
- **GitHub Issues:** [Reportar un bug](https://github.com/deyvidjgv/CobraDiarioApp/issues)
- **Demo en vivo:** https://credidev.netlify.app/

---

**¡Gracias por usar CrediDev! 🚀**
