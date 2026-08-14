import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/layout/Header";
import Badge from "../../components/ui/Badge";
import ClientForm from "../../components/forms/ClientForm";
import ConfirmarPasswordModal from "../../components/ui/ConfirmarPasswordModal";
import { useClients } from "../../hooks/useClients";
import { useLoans } from "../../hooks/useLoans";
import { verificarPassword } from "../../firebase/auth";
import { IconMapPin, IconEdit, IconTrash, IconChevronRight, IconPhone } from "@tabler/icons-react";
import { formatearMonto } from "../../logic/formato";

export default function DetalleCliente() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { clients, updateClient, deleteClient } = useClients();
  const { loans } = useLoans(false); // get all loans

  const [client, setClient] = useState(null);
  const [clientLoans, setClientLoans] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Modal de eliminar
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (clients.length > 0) {
      const found = clients.find(c => c.id === clientId);
      if (found) setClient(found);
    }
  }, [clients, clientId]);

  useEffect(() => {
    if (loans.length > 0 && clientId) {
      setClientLoans(loans.filter(l => l.clientId === clientId));
    }
  }, [loans, clientId]);

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-1">
        <p className="text-gray-400 text-sm">Cargando o cliente no encontrado...</p>
      </div>
    );
  }

  const hasActiveLoan = clientLoans.some(l => l.estado === "activo");

  const handleEditSubmit = async (data) => {
    setSaving(true);
    try {
      await updateClient(clientId, data);
      setIsEditing(false);
    } catch (err) {
      alert("Error al actualizar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClient = async (password) => {
    setPasswordError("");
    if (hasActiveLoan) {
       setPasswordError("El cliente tiene un crédito activo.");
       return;
    }
    setDeleting(true);
    try {
      await verificarPassword(password);
      await deleteClient(clientId);
      navigate("/clientes", { replace: true });
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setPasswordError("Contraseña incorrecta. Inténtalo de nuevo.");
      } else {
        setPasswordError(err.message || "Error al verificar la contraseña");
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleMapClick = () => {
    if (client.ubicacion?.lat && client.ubicacion?.lng) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${client.ubicacion.lat},${client.ubicacion.lng}`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  return (
    <div className="pb-24">
      <Header 
        title="Detalle de Cliente" 
        showBack 
        backTo="/clientes"
        modalOpen={showDeleteModal} 
        closeModal={() => {
          setShowDeleteModal(false);
          setPasswordError("");
        }}
      />

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Info Card */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5E5EA] shadow-sm">
          {!isEditing ? (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">{client.nombre}</h2>
                  <div className="flex items-center gap-1.5 mt-1 text-gray-500">
                    <IconPhone size={16} stroke={1.5} />
                    <span className="text-sm">{client.telefono}</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-primary hover:bg-primary-bg rounded-lg transition"
                >
                  <IconEdit size={20} stroke={1.5} />
                </button>
              </div>

              <div className="pt-3 border-t border-[#E5E5EA] space-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Cédula</p>
                  <p className="text-gray-700">{client.cedula || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Dirección</p>
                  <p className="text-gray-700">{client.direccion || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Barrio</p>
                  <p className="text-gray-700">{client.barrio || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Referencia</p>
                  <p className="text-gray-700">{client.referencia || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Autorización de datos</p>
                  <p className="text-gray-700">
                    {client.consentimientoDatos?.autorizado ? "Autorizado" : "No registrada"}
                  </p>
                </div>
              </div>

              {client.ubicacion?.lat && client.ubicacion?.lng && (
                <button
                  onClick={handleMapClick}
                  className="w-full mt-2 bg-surface-1 border border-[#E5E5EA] text-primary font-medium rounded-xl py-2.5 flex items-center justify-center gap-2 hover:bg-surface-2 transition"
                >
                  <IconMapPin size={18} stroke={1.5} />
                  Cómo llegar
                </button>
              )}
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800">Editar Cliente</h3>
                <button onClick={() => setIsEditing(false)} className="text-sm text-gray-500">Cancelar</button>
              </div>
              <ClientForm initial={client} onSubmit={handleEditSubmit} loading={saving} />
            </div>
          )}
        </div>

        {/* Historial de Créditos */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5E5EA] shadow-sm">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Historial de Créditos</h3>
          {clientLoans.length === 0 ? (
            <p className="text-sm text-gray-400">Este cliente no tiene créditos registrados.</p>
          ) : (
            <div className="space-y-3">
              {clientLoans.map((loan) => (
                <div
                  key={loan.id}
                  onClick={() => navigate(`/creditos/${loan.id}`)}
                  className="flex items-center justify-between p-3 rounded-xl border border-[#E5E5EA] hover:bg-surface-1 transition cursor-pointer"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">${formatearMonto(loan.capital)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Pendiente: ${formatearMonto(loan.saldoPendiente ?? 0)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge status={loan.estado} />
                    <IconChevronRight size={18} stroke={1.5} className="text-gray-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Zona Peligrosa */}
        <div className="pt-6">
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={hasActiveLoan}
            className="w-full bg-red-50 border border-red-100 text-red-600 font-medium rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IconTrash size={18} stroke={1.5} />
            Eliminar Cliente
          </button>
          {hasActiveLoan && (
            <p className="text-xs text-center text-red-500 mt-2">
              Este cliente tiene un crédito activo, no se puede eliminar hasta que se completen o anulen sus créditos.
            </p>
          )}
        </div>
      </div>

      <ConfirmarPasswordModal
        isOpen={showDeleteModal}
        title="Eliminar Cliente"
        description={`¿Estás seguro de que deseas eliminar permanentemente a ${client.nombre}?`}
        warning="⚠ Esta acción eliminará su registro de cliente. Si tiene créditos históricos, podrían quedar huérfanos."
        onConfirm={handleDeleteClient}
        onCancel={() => {
          setShowDeleteModal(false);
          setPasswordError("");
        }}
        loading={deleting}
        error={passwordError}
        confirmText="Confirmar eliminación"
      />
    </div>
  );
}
