import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Header from "../../components/layout/Header";
import Badge from "../../components/ui/Badge";
import { useAuth } from "../../context/AuthContext";
import { getDocument, subscribeToCollection, toDate } from "../../firebase/firestore";
import { where, orderBy } from "firebase/firestore";
import { calcularCuotasVencidas } from "../../logic/frecuencia";
import { calcularEstadoMora } from "../../logic/mora";
import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";

export default function DetalleCredito() {
  const { loanId } = useParams();
  const { orgId } = useAuth();
  const [loan, setLoan] = useState(null);
  const [client, setClient] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || !loanId) return;

    // Cargar crédito
    getDocument(orgId, "loans", loanId).then((doc) => {
      setLoan(doc);
      if (doc?.clientId) {
        getDocument(orgId, "clients", doc.clientId).then(setClient);
      }
      setLoading(false);
    });

    // Suscribirse a pagos de este crédito
    const unsub = subscribeToCollection(
      orgId,
      "movements",
      [where("referencia", "==", loanId), where("tipo", "==", "cobro"), orderBy("fecha", "desc")],
      setPayments
    );
    return unsub;
  }, [orgId, loanId]);

  if (loading) {
    return (
      <>
        <Header title="Detalle del crédito" showBack />
        <p className="p-6 text-sm text-gray-400">Cargando...</p>
      </>
    );
  }

  if (!loan) {
    return (
      <>
        <Header title="Detalle del crédito" showBack />
        <p className="p-6 text-sm text-red-400">Crédito no encontrado</p>
      </>
    );
  }

  const pagado = loan.montoTotalAPagar - (loan.saldoPendiente ?? 0);
  const progreso = Math.min(100, Math.round((pagado / loan.montoTotalAPagar) * 100));
  const cuotasVencidas = calcularCuotasVencidas({
    ...loan,
    fechaInicio: toDate(loan.fechaInicio),
  });
  const mora = calcularEstadoMora(cuotasVencidas, loan.cuota, pagado);

  return (
    <>
      <Header title="Detalle del crédito" showBack />

      <div className="p-4 space-y-4">
        {/* Cliente */}
        <div className="bg-white rounded-xl p-4 border-thin flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-bg text-primary flex items-center justify-center font-medium">
            {client?.nombre?.charAt(0) || "?"}
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-800">{client?.nombre || "Cliente"}</p>
            <p className="text-xs text-gray-400">{client?.telefono}</p>
          </div>
          <Badge status={mora.estado} />
        </div>

        {/* Resumen */}
        <div className="bg-white rounded-xl p-4 border-thin space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">Capital</p>
              <p className="font-medium">${loan.capital?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Interés</p>
              <p className="font-medium">{loan.interesAplicado}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Total a pagar</p>
              <p className="font-medium">${loan.montoTotalAPagar?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Cuota</p>
              <p className="font-medium text-primary">${loan.cuota?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Pagado</p>
              <p className="font-medium text-emerald-600">${pagado.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Saldo pendiente</p>
              <p className="font-medium text-red-600">${(loan.saldoPendiente ?? 0).toLocaleString()}</p>
            </div>
          </div>

          {/* Barra de progreso */}
          <div>
            <div className="w-full bg-surface-2 rounded-full h-2.5">
              <div className="bg-primary-light rounded-full h-2.5 transition-all" style={{ width: `${progreso}%` }} />
            </div>
            <p className="text-xs text-gray-400 text-right mt-1">{progreso}% completado</p>
          </div>
        </div>

        {/* Mora info */}
        {mora.estado === "mora" && (
          <div className="bg-red-50 border-thin border-red-200 rounded-xl p-4 text-sm">
            <p className="font-medium text-red-700 flex items-center gap-1">
              <IconAlertTriangle size={18} stroke={2} /> En mora
            </p>
            <p className="text-red-600 mt-1">
              Déficit: ${mora.deficit.toLocaleString()} ({mora.cuotasMora} cuotas atrasadas)
            </p>
          </div>
        )}

        {/* Historial de pagos */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Historial de pagos</h3>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aún no hay pagos registrados</p>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="bg-white rounded-xl px-4 py-3 border-thin flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-700">${p.monto?.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">
                      {toDate(p.fecha).toLocaleDateString("es-CO", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                    <IconCheck size={14} stroke={2} />
                    <span>Cobro</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

