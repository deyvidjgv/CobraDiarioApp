import { useState, useEffect } from "react";
import FrequencySelector from "../ui/FrequencySelector";
import { calcularTotalesCredito } from "../../logic/credito";

export default function LoanForm({ clients = [], settings = {}, onSubmit, loading = false, onClientChange }) {
  const [form, setForm] = useState({
    clientId: "",
    capital: "",
    interes: settings.interesDefault ?? 20,
    numeroCuotas: "",
    frecuencia: "diario",
    fechaInicio: new Date().toISOString().split("T")[0],
  });

  // Actualizar interés cuando se carguen los settings
  useEffect(() => {
    if (settings.interesDefault != null) {
      setForm((f) => ({ ...f, interes: settings.interesDefault }));
    }
  }, [settings.interesDefault]);

  const preview =
    form.capital && form.numeroCuotas
      ? calcularTotalesCredito(Number(form.capital), Number(form.interes), Number(form.numeroCuotas))
      : null;

  function set(field) {
    return (e) => {
      const value = e.target.value;
      setForm({ ...form, [field]: value });
      // Notificar al padre cuando cambia el cliente seleccionado
      if (field === "clientId" && onClientChange) {
        onClientChange(value);
      }
    };
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      ...form,
      capital: Number(form.capital),
      interes: Number(form.interes),
      numeroCuotas: Number(form.numeroCuotas),
      fechaInicio: new Date(form.fechaInicio + "T00:00:00"),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Cliente */}
      <label className="block">
        <span className="text-sm font-medium text-gray-700">Cliente *</span>
        <select
          required
          value={form.clientId}
          onChange={set("clientId")}
          className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition bg-white"
        >
          <option value="">Seleccionar cliente</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>

      {/* Capital + Interés */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Capital ($) *</span>
          <input
            type="number"
            required
            min="1"
            value={form.capital}
            onChange={set("capital")}
            className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
            placeholder="100,000"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Interés (%) *</span>
          <input
            type="number"
            required
            min="0"
            step="0.1"
            value={form.interes}
            onChange={set("interes")}
            className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          />
        </label>
      </div>

      {/* Cuotas + Fecha */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">N° cuotas *</span>
          <input
            type="number"
            required
            min="1"
            value={form.numeroCuotas}
            onChange={set("numeroCuotas")}
            className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
            placeholder="20"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Fecha inicio *</span>
          <input
            type="date"
            required
            value={form.fechaInicio}
            onChange={set("fechaInicio")}
            className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          />
        </label>
      </div>

      {/* Frecuencia */}
      <div>
        <span className="text-sm font-medium text-gray-700 mb-2 block">Frecuencia de cobro *</span>
        <FrequencySelector value={form.frecuencia} onChange={(v) => setForm({ ...form, frecuencia: v })} />
      </div>

      {/* Preview */}
      {preview && (
        <div className="bg-primary/5 rounded-xl p-4 space-y-1">
          <p className="text-xs font-medium text-primary/60">Vista previa del crédito</p>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total a pagar:</span>
            <span className="font-medium text-primary">${preview.montoTotalAPagar.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Cuota:</span>
            <span className="font-medium text-primary-light">${preview.cuota.toLocaleString()}</span>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary hover:bg-primary-light text-white font-medium rounded-xl py-3 transition disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Crear crédito"}
      </button>
    </form>
  );
}
