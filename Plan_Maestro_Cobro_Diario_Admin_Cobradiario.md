# COBRO DIARIO — PLAN MAESTRO DE EVOLUCIÓN

**Arquitectura ADMIN + COBRADIARIOS · React + Firebase + Firestore + PWA**

> Documento de trabajo para implementar sobre el proyecto existente. **No reescribir desde cero.**

---

## 1. Objetivo del proyecto

Transformar la aplicación actual Cobro Diario en una plataforma centralizada de administración de cartera y cobranza.

El **Admin** será responsable de crear y controlar las cuentas de los cobradiarios y tendrá visibilidad completa de:

- clientes
- créditos
- cobros
- cartera
- rutas
- caja
- reportes
- rendimiento
- auditoría

El **Cobradiario** tendrá una experiencia operativa limitada y enfocada en trabajar en campo.

### Regla principal

> El cobradiario puede **CREAR y REGISTRAR** información operativa, pero no puede **ALTERAR la historia financiera**.

---

## 2. Estado actual que debe conservarse

La implementación debe partir del proyecto actual y conservar:

- React y estructura actual de `src/`.
- Firebase Authentication y Firestore.
- Modelo multitenant bajo `organizations/{orgId}`.
- Clientes, créditos, movimientos, caja, rutas, cobros y reportes existentes.
- Persistencia offline de Firestore.
- PWA e instalación.
- Lógica financiera existente cuando sea correcta.
- Diseño visual y componentes reutilizables existentes.
- Navegación y mejoras recientes ya implementadas.

---

## 3. Nueva arquitectura funcional

| ADMIN | COBRADIARIO | REGLA |
|---|---|---|
| Dashboard global | Inicio operativo | Experiencias separadas |
| Gestionar cobradiarios | Clientes | Solo Admin administra usuarios |
| Todos los clientes | Crear/consultar sus clientes | Cobradiario no ve toda la organización |
| Todos los créditos | Crear/consultar créditos autorizados | Condiciones históricas quedan congeladas |
| Todos los cobros | Registrar cobros | Cobros no se editan/borran directamente |
| Cartera y mora | Ruta del día | Admin tiene visión global |
| Caja global | Historial/caja limitada | Movimientos financieros auditables |
| Reportes | Perfil | Configuración global solo Admin |
| Auditoría | — | Toda acción relevante deja trazabilidad |
| Ver operación de cobradiario | — | No compartir credenciales |

---

## 4. Estructura de Firestore propuesta

Mantener el multitenant existente y ampliar las colecciones:

```text
organizations/{orgId}
  users
  clients
  loans
  movements
  visits
  routes
  auditLogs
  cashClosings
  settings
  correctionRequests   (fase posterior)
  notifications        (opcional/futuro)
```

---

## 5. Roles y permisos

### ADMIN

Puede:

- Crear, activar y desactivar cobradiarios.
- Ver toda la organización.
- Ver y administrar clientes, créditos, cobros, cartera, rutas, caja y reportes.
- Configurar tasas, días de cobro, moneda, seguro, mora y reglas administrativas.
- Aprobar o rechazar créditos si se activa el flujo de aprobación.
- Consultar auditoría.
- Ver la operación de un cobradiario sin compartir sus credenciales.

### COBRADIARIO

Puede:

- Crear clientes.
- Crear créditos según reglas configuradas por Admin.
- Ver ruta del día.
- Registrar cobros.
- Capturar ubicación GPS.
- Consultar historial de sus cobros.
- Consultar sus clientes y créditos autorizados.

No puede:

- Modificar configuración global.
- Editar/eliminar cobros históricos.
- Eliminar movimientos financieros.
- Administrar usuarios.
- Consultar información de otros cobradiarios.

---

## 6. Modelo de datos recomendado

### `users`

```js
{
  uid,
  nombre,
  cedula,
  celular,
  email,
  role: "admin" | "cobradiario",
  estado: "activo" | "inactivo",
  createdAt,
  createdBy,
  ultimaConexion
}
```

### `clients`

```js
{
  nombre,
  cedula,
  celular,
  direccion,
  barrio,
  referencia,
  ubicacion: { lat, lng },
  cobradiarioId,
  createdBy,
  createdAt,
  estado,
  consentimientoDatos: {
    autorizado,
    fecha,
    version
  }
}
```

### `loans`

```js
{
  clientId,
  cobradiarioId,
  createdBy,
  capital,
  interesAplicado,
  seguro,
  totalPactado,
  numeroCuotas,
  valorCuota,
  periodicidad,
  diaPago,
  fechaCredito,
  saldoPendiente,
  estado,
  createdAt
}
```

### `payments / cobros`

```js
{
  clientId,
  loanId,
  cobradiarioId,
  createdBy,
  valor,
  fecha,
  hora,
  ubicacion,
  movementId,
  createdAt
}
```

### `visits`

```js
{
  clientId,
  loanId,
  cobradiarioId,
  fecha,
  hora,
  ubicacion,
  resultado
}
```

### `movements`

```js
{
  type,
  amount,
  clientId,
  loanId,
  cobradiarioId,
  createdBy,
  createdAt,
  metadata
}
```

### `auditLogs`

```js
{
  action,
  userId,
  userRole,
  cobradiarioId,
  clientId,
  loanId,
  timestamp,
  metadata
}
```

---

## 7. Formulario de cliente

El panel del cobradiario debe pedir como mínimo:

- Nombre completo.
- Cédula.
- Celular.
- Dirección.
- Barrio.
- Referencia, por ejemplo: Ferretería.
- Ubicación GPS.
- Autorización para tratamiento de datos.

La ficha debe conservar los datos de identificación y ubicación necesarios para la operación.

La autorización de tratamiento debe quedar registrada junto con fecha y versión del texto aceptado.

---

## 8. Modelo de crédito validado con la referencia proporcionada

La ficha de crédito debe poder representar el modelo mostrado en la referencia:

| Campo | Ejemplo |
|---|---|
| Cliente | Miguel Herrera |
| Documento | 1094220549 |
| Barrio | Cordialidad |
| Referencia | Ferretería |
| Valor prestado | $200.000 |
| Interés aplicado | 20% |
| Total a pagar | $240.000 |
| Cuotas | 6 |
| Valor cuota | $40.000 |
| Seguro | $0 |
| Estado | Activo |
| Día de pago | Sábado |
| Fecha crédito | 30/07/2026 |
| Período de cobro | Semanal |
| Saldo inicial | $240.000 |

### Validación

`$200.000 + 20% = $240.000`

`$240.000 / 6 = $40.000 por cuota`

La tasa aplicada y las condiciones del crédito deben quedar **congeladas como fotografía histórica**.

---

## 9. Estados de crédito

- `BORRADOR`
- `PENDIENTE_APROBACION`
- `ACTIVO`
- `EN_MORA`
- `PAGADO`
- `CANCELADO`
- `ANULADO`

---

## 10. Regla de inmutabilidad financiera

> **No borrar ni modificar silenciosamente información financiera.**

Reglas:

- Un cobro registrado no puede ser editado o eliminado directamente por el cobradiario.
- Un crédito creado no puede cambiar libremente capital, interés, total, cuotas, valor de cuota, periodicidad o fecha.
- Si existe un error, crear una solicitud de corrección.
- La corrección aprobada debe conservar el registro original y dejar trazabilidad.
- Los movimientos financieros deben anularse/corregirse con motivo, usuario y fecha, no desaparecer.

---

## 11. Solicitudes de corrección

Flujo:

1. Cobradiario selecciona **Solicitar corrección**.
2. Indica el valor correcto y el motivo.
3. Admin revisa.
4. Admin aprueba o rechaza.
5. El sistema conserva el original, la solicitud y la resolución.
6. Registrar la acción en `auditLogs`.

---

## 12. Ruta del día y visitas

La ruta debe mostrar:

- Clientes que deben pagar hoy.
- Clientes atrasados y en mora priorizados.
- Clientes pendientes.
- Botón GPS / Google Maps.
- Registro de visita con fecha, hora, ubicación y resultado.
- Clientes visitados.
- Clientes no visitados.
- Clientes cobrados.
- Clientes sin pago.

El Admin puede revisar rutas por fecha y cobradiario.

---

## 13. Dashboard administrativo

Mostrar como mínimo:

- Dinero colocado.
- Cartera pendiente.
- Cobrado hoy.
- Cobrado este mes.
- Cartera vencida.
- Mora.
- Cobradiarios activos.
- Clientes.
- Créditos activos.
- Clientes nuevos.
- Créditos creados.
- Cobros registrados.

---

## 14. Rendimiento por cobradiario

Mostrar:

- Clientes asignados.
- Clientes visitados.
- Cobros realizados.
- Valor esperado.
- Valor cobrado.
- Efectividad de cobro.
- Mora.
- Créditos nuevos.
- Clientes nuevos.
- Última conexión.
- Actividad reciente.

### Fórmula base

`efectividad = (cobrado / esperado) × 100`

---

## 15. Administración de clientes, créditos y cobros

### Clientes

- Buscar por nombre, cédula y celular.
- Filtrar por cobradiario, estado y fecha.
- Ver ficha, créditos, cobros, ruta y actividad.

### Créditos

- Filtrar por cobradiario, cliente, cédula, estado, fecha, monto y mora.
- Ver capital, interés aplicado, total, saldo, cuotas, pagos y estado.

### Cobros

- Filtrar por cobradiario, cliente, cédula y rango de fechas.
- Ver fecha, hora, valor, saldo, ubicación y usuario que registró.

### Cartera

Clasificar:

- Al día.
- Por vencer.
- Vencida.
- En mora.
- Pagada.

Filtros:

- Cobradiario.
- Cliente.
- Días de mora.
- Monto.

---

## 16. Caja y control del dinero

Conservar la lógica actual de movimientos.

Diferenciar:

- Cobros.
- Créditos entregados.
- Gastos.
- Ingresos.
- Recargos.
- Otros movimientos.

El Admin puede ver caja:

- Global.
- Por cobradiario.
- Por fecha.

Mostrar:

- Cobros registrados.
- Créditos entregados.
- Gastos.
- Saldo/control.

No permitir alterar movimientos históricos sin trazabilidad.

---

## 17. Auditoría

Acciones mínimas a registrar:

```text
LOGIN
LOGOUT

CREATE_CLIENT
UPDATE_CLIENT

CREATE_LOAN
UPDATE_LOAN
CANCEL_LOAN

APPROVE_LOAN
REJECT_LOAN

CREATE_PAYMENT

CORRECTION_REQUEST
CORRECTION_APPROVED
CORRECTION_REJECTED

CREATE_MOVEMENT
UPDATE_SETTINGS

LOCATION_CAPTURED

ADMIN_VIEW_AS_USER
```

Cada evento debe permitir conocer:

- Usuario.
- Rol.
- Fecha/hora.
- Organización.
- Cobradiario relacionado.
- Cliente relacionado, si aplica.
- Crédito relacionado, si aplica.
- Datos relevantes de la acción.

---

## 18. Ver operación del cobradiario

El Admin debe poder seleccionar un cobradiario y abrir una vista de su operación.

**No se deben compartir contraseñas ni convertir la sesión del Admin en la del cobradiario.**

Debe existir separación entre:

- Usuario real = Admin.
- Usuario observado = Cobradiario.

Registrar:

`ADMIN_VIEW_AS_USER`

Si el Admin realiza una acción durante esta vista, el `auditLog` debe indicar claramente que el actor fue el Admin y, si aplica, el cobradiario observado.

---

## 19. Configuración

La configuración debe ser exclusivamente administrativa.

Puede incluir:

- Interés por defecto.
- Días de cobro.
- Moneda.
- Seguro.
- Recargos/mora.
- Aprobación de créditos ON/OFF.
- Reglas operativas.
- Configuración de caja.

---

## 20. Seguridad de Firestore

> **La seguridad no puede depender únicamente de ocultar botones en React.**

Implementar reglas Firestore por:

- Rol.
- Organización.
- Cobradiario.
- Tipo de documento.
- Operación permitida.

### Admin

Acceso administrativo a los recursos de su organización.

### Cobradiario

Lectura limitada y creación de recursos operativos autorizados.

Debe quedar sin escritura sobre:

- `settings`
- `auditLogs`
- movimientos históricos
- usuarios

Además:

- Validar `organizationId`.
- Validar `cobradiarioId`.
- Impedir acceso a datos de otros cobradiarios.
- Probar las reglas con casos permitidos y prohibidos.

---

## 21. PWA y funcionamiento offline

Mantener:

- Instalación PWA.
- Persistencia offline de Firestore.
- Funcionamiento offline del flujo operativo.

Prevenir:

- Duplicación de cobros.
- Duplicación de movimientos.
- Inconsistencias al sincronizar.

Usar identificadores/idempotencia cuando sea necesario.

---

## 22. Reportes

El Admin debe poder generar:

- Cierre diario.
- Reporte por cobradiario.
- Clientes.
- Créditos.
- Cobros.
- Mora.
- Caja.
- Resumen financiero.
- Exportación PDF.

El cobradiario puede consultar únicamente los reportes permitidos para su operación.

---

## 23. Fases de implementación

| Fase | Entregable |
|---|---|
| ✅ FASE 0 — Respaldo | Backup/exportación, Git commit y revisión del estado estable |
| ✅ FASE 1 — Roles | ADMIN/COBRADIARIO, users y autorización |
| ✅ FASE 2 — Seguridad | Firestore Security Rules y pruebas de permisos |
| ✅ FASE 3 — Cobradiarios | Crear, activar, desactivar, consultar (desempeño detallado queda para Fase 13) |
| ✅ FASE 4 — Paneles | AdminLayout y CobradiarioLayout con rutas protegidas |
| ✅ FASE 5 — Clientes | Nuevo modelo de cliente y compatibilidad con existentes |
| ✅ FASE 6 — Créditos | Modelo completo, condiciones históricas y estados |
| ✅ FASE 7 — Cobros | Cobros inmutables y correcciones |
| ✅ FASE 8 — Rutas | visits/routes, GPS y resultados de visita |
| ✅ FASE 9 — Auditoría | auditLogs y actividad |
| ✅ FASE 10 — Dashboard | KPIs, cartera y rendimiento |
| ✅ FASE 11 — Reportes | Filtros, cierres y PDF |
| ✅ FASE 12 — Caja | Control financiero global y por cobradiario |
| ✅ FASE 13 — Desempeño | Efectividad, mora y productividad |
| ✅ FASE 14 — Ver operación | Vista administrativa auditada |
| ✅ FASE 15 — QA | Pruebas de lógica y reglas (tests/logic + tests/rules) |

---

## 24. Pruebas mínimas de aceptación

| Prueba | Cobradiario | Admin |
|---|---:|---:|
| Crear cliente | ✓ | ✓ |
| Crear crédito | ✓ | ✓ |
| Registrar cobro | ✓ | ✓ / consultar |
| Ver ruta | ✓ | ✓ |
| Ver historial propio | ✓ | ✓ |
| Ver todos los clientes | ✗ | ✓ |
| Cambiar configuración | ✗ | ✓ |
| Eliminar/modificar cobro histórico | ✗ | ✗ directo; usar corrección |
| Administrar cobradiarios | ✗ | ✓ |
| Ver auditoría | ✗ | ✓ |
| Ver operación de cobradiario | ✗ | ✓ |

---

## 25. Reglas para Claude durante la implementación

1. **NO REESCRIBIR LA APLICACIÓN DESDE CERO.**
2. Analizar primero la implementación existente.
3. Hacer cambios incrementales.
4. No eliminar campos existentes de Firestore sin migración.
5. No romper clientes, créditos, movimientos, rutas, caja o reportes existentes.
6. Antes de cambiar una función, identificar dependencias en hooks, lógica, componentes y páginas.
7. Mantener compatibilidad con datos antiguos.
8. Después de cada fase, ejecutar pruebas y verificar regresión.
9. No confiar únicamente en permisos visuales del frontend.
10. Priorizar seguridad y consistencia financiera sobre cambios visuales.

---

## 26. Prioridades

| Prioridad | Área |
|---|---|
| P0 | Seguridad, roles y separación de permisos |
| P0 | Integridad de créditos, cobros y movimientos |
| P0 | Compatibilidad con datos existentes |
| P1 | Clientes + créditos + cobros |
| P1 | Auditoría |
| P1 | Admin Dashboard |
| P1 | Gestión de cobradiarios |
| P2 | Rutas + visitas + GPS |
| P2 | Caja |
| P2 | Reportes avanzados |
| P3 | Métricas adicionales y mejoras visuales |

---

## 27. Resultado final esperado

La aplicación debe funcionar como **dos experiencias conectadas dentro de la misma organización**.

### COBRADIARIO

Herramienta rápida y limitada para:

- Clientes.
- Créditos.
- Ruta.
- Cobros.
- Historial.
- GPS.

### ADMIN

Centro de control para:

- Usuarios.
- Cobradiarios.
- Clientes.
- Créditos.
- Cobros.
- Cartera.
- Mora.
- Rutas.
- Dinero.
- Caja.
- Rendimiento.
- Reportes.
- Auditoría.
- Configuración.

Cada cliente, crédito, cobro, visita y movimiento debe poder rastrearse hasta el usuario que lo creó o registró.

La información financiera histórica no debe desaparecer ni modificarse silenciosamente.

La arquitectura debe quedar preparada para crecer a más cobradiarios y más organizaciones.

---

## 28. Checklist final de entrega

- [ ] Roles ADMIN/COBRADIARIO implementados.
- [x] Firestore Security Rules probadas.
- [x] Admin puede crear y administrar cobradiarios.
- [ ] Cobradiario tiene panel limitado.
- [x] Formulario de cliente completo.
- [ ] Créditos conservan condiciones históricas.
- [ ] Cobros son auditables e inmutables.
- [x] Correcciones funcionan mediante solicitud.
- [ ] Rutas y visitas registran GPS.
- [ ] Auditoría registra acciones críticas.
- [ ] Dashboard financiero Admin.
- [ ] Rendimiento por cobradiario.
- [ ] Cartera y mora.
- [ ] Caja global y por cobradiario.
- [ ] Reportes y PDF.
- [ ] Ver operación del cobradiario.
- [ ] PWA conservada.
- [ ] Offline conservado.
- [ ] Datos existentes migrados/compatibles.
- [ ] Pruebas de regresión completadas.

---

# INSTRUCCIÓN PRINCIPAL PARA CLAUDE

Implementar este plan **sobre el proyecto Cobro Diario existente**, no crear una aplicación nueva.

Antes de modificar código:

1. Revisar la estructura actual.
2. Identificar autenticación, contexto, hooks, lógica financiera, componentes y páginas.
3. Identificar cómo se almacenan actualmente clientes, créditos, movimientos y configuraciones.
4. Identificar qué datos existentes deben migrarse.
5. Proponer primero la estrategia de migración y seguridad.
6. Implementar por fases.
7. Después de cada fase comprobar que el sistema anterior sigue funcionando.
8. No eliminar funcionalidad existente sin justificarlo.
9. No cambiar cálculos financieros sin validar sus consecuencias.
10. La seguridad debe implementarse también en Firestore, no solo en la interfaz.

**Objetivo:** evolucionar Cobro Diario a una plataforma profesional de administración de cobranza con un **Admin central** y múltiples **Cobradiarios operativos**, manteniendo la información histórica, trazabilidad y seguridad.
