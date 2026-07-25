import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layout/Header";
import ClientRow from "../../components/ui/ClientRow";
import { useClients } from "../../hooks/useClients";
import { useLoans } from "../../hooks/useLoans";
import { calcularCuotasVencidas } from "../../logic/frecuencia";
import { calcularEstadoMora } from "../../logic/mora";
import { toDate } from "../../firebase/firestore";

export default function RutaDelDia() {
  const navigate = useNavigate();
  const { clients } = useClients();
  const { loans, loading } = useLoans();

  // Enriquecer cada crédito activo con su estado de mora y datos del cliente
  const rutaOrdenada = useMemo(() => {
    const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

    return loans
      .map((loan) => {
        const cuotasVencidas = calcularCuotasVencidas({
          ...loan,
          fechaInicio: toDate(loan.fechaInicio),
        });
        const pagadoAcumulado = loan.montoTotalAPagar - (loan.saldoPendiente ?? 0);
        const mora = calcularEstadoMora(cuotasVencidas, loan.cuota, pagadoAcumulado);
        const client = clientMap[loan.clientId] || {};

        return { ...loan, mora, client };
      })
      .sort((a, b) => {
        // mora primero, luego al_dia, luego adelantado
        const order = { mora: 0, al_dia: 1, adelantado: 2 };
        return (order[a.mora.estado] ?? 3) - (order[b.mora.estado] ?? 3);
      });
  }, [loans, clients]);

  return (
    <div className="pb-24">
      <Header title="Ruta de hoy" />

      <div className="p-4 space-y-3">
        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Cargando ruta...</p>
        ) : rutaOrdenada.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-4xl block mb-3">📋</span>
            <p className="text-gray-500 text-sm">No hay créditos activos todavía</p>
            <button
              onClick={() => navigate("/creditos/nuevo")}
              className="mt-4 text-primary-light font-medium text-sm hover:underline"
            >
              Crear primer crédito →
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400">{rutaOrdenada.length} créditos activos</p>
            {rutaOrdenada.map((item) => (
              <ClientRow
                key={item.id}
                name={item.client.nombre || "Cliente"}
                phone={item.client.telefono}
                status={item.mora.estado}
                subtitle={
                  item.mora.estado === "mora"
                    ? `Debe ${item.mora.cuotasMora} cuotas — $${item.mora.deficit.toLocaleString()}`
                    : `Cuota: $${item.cuota.toLocaleString()}`
                }
                ubicacion={item.client.ubicacion}
                onClick={() => navigate(`/cobro/${item.id}`)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
