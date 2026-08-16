import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/layout/Header";
import Badge from "../../components/ui/Badge";
import { useAuth } from "../../context/AuthContext";
import { getDocument, subscribeToCollection, toDate } from "../../firebase/firestore";
import { where, orderBy } from "firebase/firestore";
import { calcularMoraGlobal } from "../../logic/mora";
import { formatearMonto } from "../../logic/formato";
import ConfirmarPasswordModal from "../../components/ui/ConfirmarPasswordModal";
import { verificarPassword } from "../../firebase/auth";
import { useLoanActions } from "../../hooks/useLoanActions";
import { IconAlertTriangle, IconCheck, IconTrash, IconBan } from "@tabler/icons-react";

export default function DetalleCredito() {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const { orgId, isAdmin } = useAuth();
  const { deleteLoan, anularLoan } = useLoanActions();
  const [loan, setLoan] = useState(null);
  const [client, setClient] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [processing, setProcessing] = useState(false);

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
      [where("referencia", "==", loanId), orderBy("fecha", "desc")],
      (docs) => {
        // Filtrar solo cobros
        const cobros = docs.filter((d) => d.tipo === "cobro");
        setPayments(cobros);
      }
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
  const mora = calcularMoraGlobal(loan);
  const hasPayments = payments.length > 0;

  async function handleAnular() {
    if (!confirm("¿Anular este crédito? El crédito queda inactivo pero TODO su historial de pagos y movimientos se conserva.")) return;
    try {
      await anularLoan(loanId);
      navigate(client?.id ? `/clientes/${client.id}` : "/clientes", { replace: true });
    } catch (err) {
      alert("Error al anular: " + err.message);
    }
  }

  const handleAction = async (password) => {
    setPasswordError("");
    setProcessing(true);
    try {
      await verificarPassword(password);
      await deleteLoan(loanId);
      setShowConfirm(false);
      navigate(client?.id ? `/clientes/${client.id}` : "/clientes", { replace: true });
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setPasswordError("Contraseña incorrecta. Inténtalo de nuevo.");
      } else {
        setPasswordError(err.message || "Error al verificar la contraseña");
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Header 
        title="Detalle del crédito" 
        showBack 
        modalOpen={showConfirm} 
        closeModal={() => {
          setShowConfirm(false);
          setPasswordError("");
        }}
      />

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
              <p className="font-medium">${formatearMonto(loan.capital)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Interés</p>
              <p className="font-medium">{loan.interesAplicado}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Total a pagar</p>
              <p className="font-medium">${formatearMonto(loan.montoTotalAPagar)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Cuota</p>
              <p className="font-medium text-primary">${formatearMonto(loan.cuota)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Pagado</p>
              <p className="font-medium text-emerald-600">${formatearMonto(pagado)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Saldo pendiente</p>
              <p className="font-medium text-red-600">${formatearMonto(loan.saldoPendiente ?? 0)}</p>
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
              Déficit: ${formatearMonto(mora.deficit)} ({mora.cuotasMora} cuotas atrasadas)
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
                    <p className="text-sm font-medium text-gray-700">${formatearMonto(p.monto)}</p>
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
        
        {/* Zona Peligrosa — solo visible para Admin (inmutabilidad financiera) */}
        {isAdmin && loan.estado === "activo" && (
        <div className="pt-6 space-y-2">
          <button
            onClick={handleAnular}
            className="w-full bg-amber-50 border border-amber-200 text-amber-700 font-medium rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-amber-100 transition"
          >
            <IconBan size={18} stroke={1.5} />
            Anular crédito (conserva historial)
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full bg-red-50 border border-red-100 text-red-600 font-medium rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-red-100 transition"
          >
            <IconTrash size={18} stroke={1.5} />
            Eliminar crédito y sus movimientos
          </button>
        </div>
        )}
      </div>

      <ConfirmarPasswordModal
        isOpen={showConfirm}
        title="Eliminar Crédito"
        description="¿Estás seguro de que deseas eliminar permanentemente este crédito? Esta acción eliminará el crédito y borrará absolutamente todos sus movimientos del historial de la caja (préstamo inicial, pagos, seguros y recargos)."
        warning="⚠ Esta acción altera el flujo de caja histórico y no se puede deshacer."
        onConfirm={handleAction}
        onCancel={() => {
          setShowConfirm(false);
          setPasswordError("");
        }}
        loading={processing}
        error={passwordError}
        confirmText="Confirmar eliminación"
        confirmIcon={<IconTrash size={16} stroke={1.5} />}
      />
    </>
  );
}

