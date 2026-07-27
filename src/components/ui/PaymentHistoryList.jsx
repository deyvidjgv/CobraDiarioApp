import { formatearMonto } from "../../logic/formato";
import { toDate } from "../../logic/dateUtils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { IconCheck, IconClock } from "@tabler/icons-react";

export default function PaymentHistoryList({ payments = [], loading = false }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 border-thin">
        <p className="text-sm text-gray-400">Cargando historial...</p>
      </div>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 border-thin text-center">
        <p className="text-sm text-gray-400">Sin registros de cobro aún</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 border-thin space-y-3">
      <h3 className="text-sm font-medium text-gray-800">Historial de cobros</h3>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {payments.map((payment) => {
          const fecha = toDate(payment.fecha);
          const fechaFormato = format(fecha, "dd MMM, HH:mm", { locale: es });
          const estado = payment.estadoFinalLabel || "Cobro registrado";
          const tipoPago = payment.tipoPago || "Pago";

          return (
            <div
              key={payment.id}
              className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-1">
                  {estado === "Completado" ? (
                    <IconCheck size={18} className="text-emerald-500" stroke={2.5} />
                  ) : (
                    <IconClock size={18} className="text-primary-light" stroke={2.5} />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-700">
                    {tipoPago}
                    {payment.cobradorNombre && (
                      <span className="text-gray-400"> • {payment.cobradorNombre}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{fechaFormato}</p>
                  {payment.detallePagoInfo && (
                    <p className="text-xs text-gray-500 mt-1">{payment.detallePagoInfo}</p>
                  )}
                </div>
              </div>
              <div className="text-right ml-2">
                <p className="text-sm font-medium text-primary">${formatearMonto(payment.monto)}</p>
                <p className="text-xs text-gray-400 mt-1">{estado}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
