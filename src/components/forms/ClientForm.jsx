import { useState } from "react";

const emptyClient = { nombre: "", telefono: "", direccion: "", referencia: "" };

export default function ClientForm({ initial = null, onSubmit, loading = false }) {
  const [form, setForm] = useState(initial || emptyClient);

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
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
          placeholder="Calle 10 #5-20, Barrio Centro"
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

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary hover:bg-primary-light text-white font-medium rounded-xl py-3 transition disabled:opacity-50"
      >
        {loading ? "Guardando..." : initial ? "Actualizar cliente" : "Guardar cliente"}
      </button>
    </form>
  );
}
