import { useState, useEffect } from "react";
import Header from "../../components/layout/Header";
import { useAuth } from "../../context/AuthContext";
import { getSettings, saveSettings } from "../../firebase/firestore";
import { cerrarSesion } from "../../firebase/auth";
import { useNavigate } from "react-router-dom";

export default function Configuracion() {
  const navigate = useNavigate();
  const { orgId } = useAuth();
  const [form, setForm] = useState({
    interesDefault: 20,
    diasHabilesDefault: [1, 2, 3, 4, 5, 6],
    moneda: "COP",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    getSettings(orgId).then((s) => {
      if (s) setForm((f) => ({ ...f, ...s }));
      setLoading(false);
    });
  }, [orgId]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings(orgId, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    if (!confirm("¿Cerrar sesión?")) return;
    await cerrarSesion();
    navigate("/login", { replace: true });
  }

  const diasSemana = [
    { value: 0, label: "Dom" },
    { value: 1, label: "Lun" },
    { value: 2, label: "Mar" },
    { value: 3, label: "Mié" },
    { value: 4, label: "Jue" },
    { value: 5, label: "Vie" },
    { value: 6, label: "Sáb" },
  ];

  function toggleDia(dia) {
    setForm((f) => {
      const actual = f.diasHabilesDefault || [];
      return {
        ...f,
        diasHabilesDefault: actual.includes(dia)
          ? actual.filter((d) => d !== dia)
          : [...actual, dia].sort(),
      };
    });
  }

  if (loading) {
    return (
      <div className="pb-24">
        <Header title="Configuración" />
        <p className="p-6 text-sm text-gray-400">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <Header title="Configuración" />

      <div className="p-4 space-y-5">
        <form onSubmit={handleSave} className="space-y-5">
          {/* Interés */}
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Interés por defecto (%)</span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={form.interesDefault}
              onChange={(e) => setForm({ ...form, interesDefault: Number(e.target.value) })}
              className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
            />
            <p className="text-xs text-gray-400 mt-1">
              Se usará como plantilla al crear créditos nuevos. No afecta créditos existentes.
            </p>
          </label>

          {/* Días hábiles */}
          <div>
            <span className="text-sm font-medium text-gray-700 block mb-2">Días de cobro por defecto</span>
            <div className="flex gap-1.5">
              {diasSemana.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDia(d.value)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
                    (form.diasHabilesDefault || []).includes(d.value)
                      ? "bg-primary-light text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Moneda */}
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Moneda</span>
            <select
              value={form.moneda}
              onChange={(e) => setForm({ ...form, moneda: e.target.value })}
              className="mt-1 block w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition bg-white"
            >
              <option value="COP">COP — Peso colombiano</option>
              <option value="USD">USD — Dólar</option>
              <option value="MXN">MXN — Peso mexicano</option>
            </select>
          </label>

          {/* Guardar */}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary hover:bg-primary-light text-white font-medium rounded-xl py-3 transition disabled:opacity-50"
          >
            {saving ? "Guardando..." : saved ? "✓ Guardado" : "Guardar configuración"}
          </button>
        </form>

        {/* Cerrar sesión */}
        <div className="pt-4 border-t border-[#E5E5EA]">
          <button
            onClick={handleLogout}
            className="w-full border border-red-300 text-red-600 font-medium rounded-xl py-3 hover:bg-red-50 transition"
          >
            Cerrar sesión
          </button>
        </div>

        <p className="text-center text-xs text-gray-300">Cobro Diario v0.1.0</p>
      </div>
    </div>
  );
}
