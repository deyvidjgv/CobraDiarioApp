# Cómo Usar CobraDiarioApp

Este documento explica de forma clara y breve cómo funciona cada parte principal de la aplicación.

## 1. Antes de empezar

- Inicia sesión con el correo y contraseña del cobrador.
- Cada usuario tiene un `orgId` propio en Firebase. Eso significa que los datos están separados por organización.
- Si la app está instalada, el botón de instalación en Configuración estará deshabilitado.

## 2. Página de Inicio

Aquí encuentras accesos rápidos a las funciones principales:

- Nuevo cliente
- Nuevo crédito
- Reportes
- Configuración

No es necesario entender cálculos complejos en esta pantalla; es el panel de trabajo.

## 3. Ruta del Día

Usa esta sección para ver los clientes que debes visitar.

- Se ordenan primero los clientes con mora o pagos vencidos.
- Si el cliente tiene coordenadas GPS guardadas, aparece el botón "Cómo llegar".
- La prioridad se calcula usando los datos del crédito y la fecha de hoy.

## 4. Clientes

- Agrega un nuevo cliente con nombre, teléfono y dirección.
- Si guardas ubicación, luego verás el botón de GPS en el detalle.
- Para eliminar un cliente, debe no tener créditos activos.

## 5. Créditos

Para crear un crédito debes indicar:

- capital
- porcentaje de interés
- número de cuotas
- frecuencia

La app calcula automáticamente:

- monto total a pagar = capital + interés
- cuota = monto total / número de cuotas

En el detalle del crédito puedes ver el saldo y el historial de pagos.

## 6. Registrar Cobro

Aquí se registra cada pago recibido.

- Verás cuánto falta por pagar.
- Si el cliente está en mora, la app puede mostrar recargos.
- El cobro se guarda como movimiento en la caja.
- Si hay ubicación, la app la usa para facilitar el cobro en campo.

## 7. Caja

La caja refleja el flujo financiero del día.

- Cada cobro y movimiento se registra como ingreso o gasto.
- El saldo se calcula sumando todos los movimientos del día.
- No necesitas hacer cálculos manuales: la app los suma por ti.

## 8. Reportes

- Exporta cierres diarios a PDF.
- El reporte incluye la información de caja y los totales.

## 9. Configuración

Aquí ajustas parámetros generales:

- porcentaje de interés
- días hábiles
- moneda
- seguro

También puedes instalar la app como PWA desde esta pantalla.

## 10. Comportamiento offline

- Si no hay internet, puedes seguir trabajando.
- Los datos se sincronizan automáticamente cuando vuelve la conexión.

## 11. Seguridad

- Eliminar créditos o clientes requiere contraseña.
- Eso evita borrados accidentales.

---

### Nota importante

La app muestra los datos y cálculos actuales, pero siempre revisa los montos antes de cerrar cobros importantes. Si algo no coincide, vuelve a abrir la pantalla del crédito y revisa el saldo.
