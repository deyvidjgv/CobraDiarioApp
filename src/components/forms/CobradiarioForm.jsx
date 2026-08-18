import { useState } from "react";
import { bloquearEntradaSoloNumeros } from "../../logic/formato";

const empty = { nombre: "", cedula: "", celular: "", email: "", password: "" };

export default function CobradiarioForm({ onSubmit, loading = false }) {
  const [form, setForm] = useState(empty);

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  /**
   * Campos numéricos: se limpian en onChange además de bloquear el
   * teclado, porque el guard de teclas no cubre pegar ni los teclados
   * de Android (que suelen reportar key "Unidentified").
   */
  function setSoloDigitos(field) {
    return (e) => setForm({ ...form, [field]: e.target.value.replace(/\D/g, "") });
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
      </label>

      <label className="block">
        <span className="text-sm font-medium text-primary">Celular</span>
        <input
          type="tel"
          inputMode="numeric"
          maxLength={15}
          value={form.celular}
          onChange={setSoloDigitos("celular")}
          onKeyDown={bloquearEntradaSoloNumeros}
          className="mt-1 block w-full rounded-xl border border-line px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          placeholder="3001234567"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-primary">Correo (para iniciar sesión) *</span>
        <input
          type="email"
          required
          value={form.email}
          onChange={set("email")}
          className="mt-1 block w-full rounded-xl border border-line px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          placeholder="cobrador@correo.com"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-primary">Contraseña temporal *</span>
        <input
          type="text"
          required
          minLength={6}
          value={form.password}
          onChange={set("password")}
          className="mt-1 block w-full rounded-xl border border-line px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
          placeholder="Mínimo 6 caracteres"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gold hover:bg-gold/90 text-surface-1 font-medium rounded-xl py-3 transition disabled:opacity-50"
      >
        {loading ? "Creando..." : "Crear cobradiario"}
      </button>
    </form>
  );
}

