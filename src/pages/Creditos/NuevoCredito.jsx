import { useState, useEffect } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import Header from "../../components/layout/Header";
import LoanForm from "../../components/forms/LoanForm";
import { useClients } from "../../hooks/useClients";
import { useLoans } from "../../hooks/useLoans";
import { useAuth } from "../../context/AuthContext";
import { getSettings } from "../../firebase/firestore";
import { construirCredito } from "../../logic/credito";
import { IconMapPin, IconCurrentLocation } from "@tabler/icons-react";

export default function NuevoCredito() {
  const navigate = useNavigate();
  const { orgId, usuario, isAdmin } = useAuth();
  const { clients, updateClient } = useClients();
  const { addLoan } = useLoans();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  // Cliente preseleccionado al llegar desde su perfil. Se pasa por query
  // string y no por state del router porque así sobrevive a un recargo de
  // la PWA y al botón atrás de Android.
  const [searchParams] = useSearchParams();
  const clientIdInicial = searchParams.get("clientId") ?? "";
  // Estado React: clientId seleccionado en el formulario (fuente única de verdad)
  const [selectedClientId, setSelectedClientId] = useState(clientIdInicial);

  useEffect(() => {
    if (!orgId) return;
    getSettings(orgId).then((s) => {
      if (s) setSettings(s);
    });
  }, [orgId]);

  // Prestar es operación de cobradiario (Plan Maestro, sección 5): el Admin
  // controla el dinero y a los cobradiarios, pero no entrega créditos.
  // IMPORTANTE: este return va después de TODOS los hooks — isAdmin arranca
  // en false y cambia de forma asíncrona, así que ponerlo antes de un hook
  // (como estaba) provoca "Rendered fewer hooks than expected" en el
  // re-render donde el rol resuelve a admin.
  if (isAdmin) return <Navigate to="/" replace />;

  async function handleSubmit(formData) {
    setLoading(true);
    try {
      const client = clients.find((c) => c.id === formData.clientId);
      const loanDoc = construirCredito(formData, settings);
      await addLoan(loanDoc, {
        clienteNombre: client?.nombre ?? null,
        cobradorNombre: usuario?.displayName ?? null,
      });
      navigate("/ruta", { replace: true });
    } catch (err) {
      alert("Error al crear crédito: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Captura opcional de ubicación GPS y la guarda en el cliente
  function handleCaptureLocation() {
    // Usa el estado React, no el DOM
    if (!selectedClientId) {
      alert("Selecciona un cliente antes de capturar la ubicación.");
      return;
    }
    if (!navigator.geolocation) {
      alert("Geolocalización no está disponible en este navegador.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateClient(selectedClientId, { ubicacion: { lat: latitude, lng: longitude } })
          .then(() => alert("Ubicación guardada exitosamente."))
          .catch((e) => {
            console.error(e);
            alert("No se pudo guardar la ubicación.");
          });
      },
      (error) => {
        console.warn(error);
        alert("No se pudo obtener la ubicación: " + error.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <>
      <Header title="Nuevo crédito" showBack />
      <div className="p-4">
        <LoanForm
          clients={clients}
          settings={settings}
          onSubmit={handleSubmit}
          loading={loading}
          onClientChange={setSelectedClientId}
          initialClientId={clientIdInicial}
        />
        {/* Botón opcional para capturar ubicación del cliente */}
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={handleCaptureLocation}
            className="flex items-center gap-2 bg-gold text-surface-1 rounded-xl py-2 px-4 hover:bg-gold/90 transition"
          >
            <IconCurrentLocation size={18} stroke={2} />
            Capturar ubicación del cliente
          </button>
        </div>
      </div>
    </>
  );
}
