import { useState } from "react";
import { IconMapPin, IconCheck } from "@tabler/icons-react";

const CONSENT_VERSION = "1.0";

const emptyClient = {
  nombre: "",
  cedula: "",
  telefono: "",
  direccion: "",
  barrio: "",
  referencia: "",
  ubicacion: null,
  consentimientoDatos: null,
};

export default function ClientForm({ initial = null, onSubmit, loading = false }) {
  const [form, setForm] = useState(() => ({ ...emptyClient, ...initial }));
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const [consentimiento, setConsentimiento] = useState(
    Boolean(initial?.consentimientoDatos?.autorizado)
  );

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  function capturarUbicacion() {
    if (!navigator.geolocation) {
      setLocError("Este dispositivo no soporta GPS.");
      return;
    }
    setLocating(true);
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          ubicacion: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        }));
        setLocating(false);
      },
      () => {
        setLocError("No se pudo obtener la ubicación. Verifica los permisos.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!consentimiento) {
      setLocError("Debes registrar la autorización de tratamiento de datos.");
      return;
    }
    onSubmit({
      ...form,
      consentimientoDatos: {
        autorizado: true,
        fecha: form.consentimientoDatos?.fecha || new Date().toISOString(),
        version: CONSENT_VERSION,
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-gray-700">Nombre completo *</span>
        <input
          type="text"
          required
          value={form.nombre}
          onChange={set("nombre")}
          className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          placeholder="Juan Pérez"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-gray-700">Cédula *</span>
        <input
          type="text"
          required
          inputMode="numeric"
          value={form.cedula}
          onChange={set("cedula")}
          className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          placeholder="1094220549"
        />
        <p className="text-xs text-gray-400 mt-1">
          Identifica al cliente: no pueden existir dos clientes con la misma cédula.
        </p>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-gray-700">Teléfono *</span>
        <input
          type="tel"
          required
          value={form.telefono}
          onChange={set("telefono")}
          className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          placeholder="300 123 4567"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-gray-700">Dirección</span>
        <input
          type="text"
          value={form.direccion}
          onChange={set("direccion")}
          className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          placeholder="Calle 10 #5-20"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-gray-700">Barrio</span>
        <input
          type="text"
          value={form.barrio}
          onChange={set("barrio")}
          className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          placeholder="Cordialidad"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-gray-700">Referencia</span>
        <input
          type="text"
          value={form.referencia}
          onChange={set("referencia")}
          className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          placeholder="Frente a la panadería"
        />
      </label>

      <div>
        <span className="text-sm font-medium text-gray-700">Ubicación GPS</span>
        <button
          type="button"
          onClick={capturarUbicacion}
          disabled={locating}
          className="mt-1 w-full flex items-center justify-center gap-2 rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm font-medium text-primary hover:bg-primary-bg/50 transition disabled:opacity-50"
        >
          <IconMapPin size={18} stroke={1.5} />
          {locating
            ? "Obteniendo ubicación..."
            : form.ubicacion
            ? "Ubicación capturada — volver a capturar"
            : "Capturar ubicación actual"}
        </button>
        {locError && <p className="text-xs text-red-500 mt-1">{locError}</p>}
      </div>

      <label className="flex items-start gap-2.5 rounded-xl border border-[#E5E5EA] px-4 py-3 cursor-pointer">
        <input
          type="checkbox"
          checked={consentimiento}
          onChange={(e) => setConsentimiento(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary-light"
        />
        <span className="text-xs text-gray-600">
          El cliente autoriza el tratamiento de sus datos personales para fines de
          gestión de crédito y cobranza. (Versión {CONSENT_VERSION})
        </span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary hover:bg-primary-light text-white font-medium rounded-xl py-3 flex items-center justify-center gap-2 transition disabled:opacity-50"
      >
        {loading ? (
          "Guardando..."
        ) : (
          <>
            <IconCheck size={18} stroke={2} />
            {initial ? "Actualizar cliente" : "Guardar cliente"}
          </>
        )}
      </button>
    </form>
  );
}
