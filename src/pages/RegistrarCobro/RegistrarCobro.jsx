import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/layout/Header";
import Badge from "../../components/ui/Badge";
import { useLoans } from "../../hooks/useLoans";
import { useClients } from "../../hooks/useClients";
import { calcularCuotasVencidas } from "../../logic/frecuencia";
import { calcularEstadoMora } from "../../logic/mora";
import { getDocument, toDate } from "../../firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { IconCheck, IconMapPin } from "@tabler/icons-react";

export default function RegistrarCobro() {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const { orgId } = useAuth();
  const { registerPayment } = useLoans();
  const { clients, updateClient } = useClients();

  const [loan, setLoan] = useState(null);
  const [monto, setMonto] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [capturingGps, setCapturingGps] = useState(false);

  useEffect(() => {
    if (!orgId || !loanId) return;
    getDocument(orgId, "loans", loanId).then((doc) => {
      setLoan(doc);
      if (doc) {
        const cuotasVencidas = calcularCuotasVencidas({
          ...doc,
          fechaInicio: toDate(doc.fechaInicio),
        });
        const pagado = doc.montoTotalAPagar - (doc.saldoPendiente ?? 0);
        const mora = calcularEstadoMora(cuotasVencidas, doc.cuota, pagado);
        // Si hay mora, precargar el déficit; si no, la cuota
        setMonto(mora.estado === "mora" ? mora.deficit : doc.cuota);
      }
      setLoading(false);
    });
  }, [orgId, loanId]);

  const client = clients.find((c) => c.id === loan?.clientId);

  function handleCaptureCurrentGps() {
    if (!client?.id) return;
    if (!navigator.geolocation) {
      alert("Geolocalización no disponible.");
      return;
    }
    setCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        updateClient(client.id, { ubicacion: { lat: latitude, lng: longitude } })
          .then(() => alert("Ubicación del cliente guardada con éxito."))
          .catch((e) => alert("Error guardando ubicación: " + e.message))
          .finally(() => setCapturingGps(false));
      },
      (err) => {
        alert("No se pudo obtener la ubicación: " + err.message);
        setCapturingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleCobro(e) {
    e.preventDefault();
    if (!monto || Number(monto) <= 0) return;
    setSaving(true);
    try {
      await registerPayment(loanId, Number(monto));
      setDone(true);
      setTimeout(() => navigate(-1), 1500);
    } catch (err) {
      alert("Error al registrar cobro: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Registrar cobro" showBack />
        <p className="p-6 text-sm text-gray-400">Cargando crédito...</p>
      </>
    );
  }

  if (!loan) {
    return (
      <>
        <Header title="Registrar cobro" showBack />
        <p className="p-6 text-sm text-red-400">Crédito no encontrado</p>
      </>
    );
  }

  const pagado = loan.montoTotalAPagar - (loan.saldoPendiente ?? 0);
  const progreso = Math.min(100, Math.round((pagado / loan.montoTotalAPagar) * 100));

  return (
    <>
      <Header title="Registrar cobro" showBack />

      <div className="p-4 space-y-5">
        {/* Info del cliente */}
        <div className="bg-white rounded-xl p-4 border-thin space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-bg text-primary flex items-center justify-center text-sm font-medium">
                {client?.nombre?.charAt(0) || "?"}
              </div>
              <div>
                <p className="font-medium text-gray-800">{client?.nombre || "Cliente"}</p>
                <p className="text-xs text-gray-400">{client?.telefono}</p>
              </div>
            </div>

            {/* Botón de Google Maps o Capturar GPS */}
            {client?.ubicacion?.lat && client?.ubicacion?.lng ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${client.ubicacion.lat},${client.ubicacion.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-primary-light text-white px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-primary transition shadow-sm shrink-0"
              >
                <IconMapPin size={16} stroke={2} />
                Cómo llegar
              </a>
            ) : (
              <button
                type="button"
                onClick={handleCaptureCurrentGps}
                disabled={capturingGps}
                className="flex items-center gap-1 bg-surface-2 text-primary-light px-2.5 py-1.5 rounded-xl text-xs font-medium hover:bg-primary-bg transition border border-thin shrink-0"
              >
                <IconMapPin size={14} stroke={2} />
                {capturingGps ? "Guardando..." : "Guardar GPS"}
              </button>
            )}
          </div>

          {/* Progreso */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Pagado: ${pagado.toLocaleString()}</span>
              <span>Total: ${loan.montoTotalAPagar.toLocaleString()}</span>
            </div>
            <div className="w-full bg-surface-2 rounded-full h-2">
              <div
                className="bg-primary-light rounded-full h-2 transition-all"
                style={{ width: `${progreso}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 text-right">{progreso}% completado</p>
          </div>
        </div>

        {/* Detalles del crédito */}
        <div className="bg-white rounded-xl p-4 border-thin grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-400 text-xs">Cuota</p>
            <p className="font-medium text-primary">${loan.cuota.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Saldo pendiente</p>
            <p className="font-medium text-gray-700">${(loan.saldoPendiente ?? 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Frecuencia</p>
            <p className="font-medium capitalize">{loan.frecuencia}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Estado</p>
            <Badge status={loan.estado} />
          </div>
        </div>

        {/* Formulario de cobro */}
        {done ? (
          <div className="bg-emerald-50 border-thin border-emerald-200 text-emerald-700 rounded-xl p-5 text-center flex flex-col items-center">
            <IconCheck size={32} stroke={2} className="mb-2" />
            <p className="font-medium">Cobro registrado</p>
            <p className="text-sm opacity-70">Redirigiendo...</p>
          </div>
        ) : (
          <form onSubmit={handleCobro} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Monto a cobrar ($)</span>
              <input
                type="number"
                required
                min="1"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-4 text-2xl font-medium text-center text-primary focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#26215C] hover:bg-[#26215C]/90 text-white font-medium rounded-xl py-4 text-lg transition disabled:opacity-50"
            >
              {saving ? "Registrando..." : "Confirmar cobro"}
            </button>
          </form>
        )}
      </div>
    </>
  );
}

