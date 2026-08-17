import { useState } from "react";

const empty = { nombre: "", cedula: "", celular: "", email: "", password: "" };

export default function CobradiarioForm({ onSubmit, loading = false }) {
  const [form, setForm] = useState(empty);

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
        <span className="text-sm font-medium text-primary">Nombre completo *</span>
        <input
          type="text"
          required
          value={form.nombre}
          onChange={set("nombre")}
          className="mt-1 block w-full rounded-xl border border-[#E3DFD8] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          placeholder="Juan PÃ©rez"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-primary">CÃ©dula</span>
        <input
          type="text"
          value={form.cedula}
          onChange={set("cedula")}
          className="mt-1 block w-full rounded-xl border border-[#E3DFD8] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          placeholder="1094220549"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-primary">Celular</span>
        <input
          type="tel"
          value={form.celular}
          onChange={set("celular")}
          className="mt-1 block w-full rounded-xl border border-[#E3DFD8] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          placeholder="300 123 4567"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-primary">Correo (para iniciar sesiÃ³n) *</span>
        <input
          type="email"
          required
          value={form.email}
          onChange={set("email")}
          className="mt-1 block w-full rounded-xl border border-[#E3DFD8] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          placeholder="cobrador@correo.com"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-primary">ContraseÃ±a temporal *</span>
        <input
          type="text"
          required
          minLength={6}
          value={form.password}
          onChange={set("password")}
          className="mt-1 block w-full rounded-xl border border-[#E3DFD8] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          placeholder="MÃ­nimo 6 caracteres"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary hover:bg-primary-light text-white font-medium rounded-xl py-3 transition disabled:opacity-50"
      >
        {loading ? "Creando..." : "Crear cobradiario"}
      </button>
    </form>
  );
}

