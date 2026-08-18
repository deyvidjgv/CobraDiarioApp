import { useState } from "react";
import { IconMapPin, IconCheck } from "@tabler/icons-react";
import { bloquearEntradaSoloNumeros } from "../../logic/formato";

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

  /**
   * Campos numéricos: se limpian en onChange además de bloquear el
   * teclado, porque el guard de teclas no cubre pegar ni los teclados de
   * Android (que suelen reportar key "Unidentified"). Importa sobre todo
   * en la cédula: useClients la usa como ID del documento tras quitarle
   * los no-dígitos, así que un "1094abc" se guardaba como "1094" y el
   * control de cédulas duplicadas se rompía en silencio.
   */
  function setSoloDigitos(field) {
    return (e) => setForm({ ...form, [field]: e.target.value.replace(/\D/g, "") });
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
        <span className="text-sm font-medium text-primary">Nombre completo *</span>
        <input
          type="text"
          required
          value={form.nombre}
          onChange={set("nombre")}
          className="mt-1 block w-full rounded-xl border border-line px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          placeholder="Juan Pérez"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-primary">Cédula *</span>
        <input
          type="text"
          required
          inputMode="numeric"
          maxLength={15}
          value={form.cedula}
          onChange={setSoloDigitos("cedula")}
          onKeyDown={bloquearEntradaSoloNumeros}
          className="mt-1 block w-full rounded-xl border border-line px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          placeholder="1094220549"
        />
        <p className="text-xs text-primary-light/70 mt-1">
          Identifica al cliente: no pueden existir dos clientes con la misma cédula.
        </p>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-primary">Teléfono *</span>
        <input
          type="tel"
          required
          inputMode="numeric"
          maxLength={15}
          value={form.telefono}
          onChange={setSoloDigitos("telefono")}
          onKeyDown={bloquearEntradaSoloNumeros}
          className="mt-1 block w-full rounded-xl border border-line px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          placeholder="3001234567"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-primary">Dirección</span>
        <input
          type="text"
          value={form.direccion}
          onChange={set("direccion")}
          className="mt-1 block w-full rounded-xl border border-line px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          placeholder="Calle 10 #5-20"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-primary">Barrio</span>
        <input
          type="text"
          value={form.barrio}
          onChange={set("barrio")}
          className="mt-1 block w-full rounded-xl border border-line px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          placeholder="Cordialidad"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-primary">Referencia</span>
        <input
          type="text"
          value={form.referencia}
          onChange={set("referencia")}
          className="mt-1 block w-full rounded-xl border border-line px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          placeholder="Frente a la panadería"
        />
      </label>

      <div>
        <span className="text-sm font-medium text-primary">Ubicación GPS</span>
        <button
          type="button"
          onClick={capturarUbicacion}
          disabled={locating}
          className="mt-1 w-full flex items-center justify-center gap-2 rounded-xl border border-line px-4 py-3 text-sm font-medium text-primary hover:bg-primary-bg/50 transition disabled:opacity-50"
        >
          <IconMapPin size={18} stroke={1.5} />
          {locating
            ? "Obteniendo ubicación..."
            : form.ubicacion
            ? "Ubicación capturada — volver a capturar"
            : "Capturar ubicación actual"}
        </button>
        {locError && <p className="text-xs text-mora mt-1">{locError}</p>}
      </div>

      <label className="flex items-start gap-2.5 rounded-xl border border-line px-4 py-3 cursor-pointer">
        <input
          type="checkbox"
          checked={consentimiento}
          onChange={(e) => setConsentimiento(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-primary/20 text-primary focus:ring-primary-light"
        />
        <span className="text-xs text-primary-light">
          El cliente autoriza el tratamiento de sus datos personales para fines de
          gestión de crédito y cobranza. (Versión {CONSENT_VERSION})
        </span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gold hover:bg-gold/90 text-surface-1 font-medium rounded-xl py-3 flex items-center justify-center gap-2 transition disabled:opacity-50"
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

