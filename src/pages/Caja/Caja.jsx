import { useState } from "react";
import Header from "../../components/layout/Header";
import { useMovements } from "../../hooks/useMovements";
import { construirMovimiento, TIPOS_MOVIMIENTO } from "../../logic/caja";
import { useAuth } from "../../context/AuthContext";
import {
  IconArrowUpRight,
  IconArrowDownRight,
  IconPlus,
  IconMinus,
} from "@tabler/icons-react";

export default function Caja() {
  const { orgId } = useAuth();
  const { movements, loading, saldo, addMovement, cerrarCaja } = useMovements();
  const [modalType, setModalType] = useState(null); // "gasto" | "base" | null
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);

  const entradas = movements.filter((m) => m.monto > 0).reduce((a, m) => a + m.monto, 0);
  const salidas = Math.abs(movements.filter((m) => m.monto < 0).reduce((a, m) => a + m.monto, 0));

  async function handleForm(e) {
    e.preventDefault();
    if (!monto) return;
    setSaving(true);
    try {
      const isBase = modalType === "base";
      const mov = construirMovimiento({
        tipo: isBase ? TIPOS_MOVIMIENTO.INGRESO_BASE : TIPOS_MOVIMIENTO.GASTO,
        monto: Number(monto),
        orgId,
        nota: nota || (isBase ? "Ingreso de base" : "Gasto"),
      });
      await addMovement(mov);
      setMonto("");
      setNota("");
      setModalType(null);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const tipoLabel = {
    cobro: { text: "Cobro", color: "text-emerald-600", Icon: IconArrowUpRight },
    prestamo_nuevo: { text: "Préstamo", color: "text-red-600", Icon: IconArrowDownRight },
    gasto: { text: "Gasto", color: "text-red-600", Icon: IconArrowDownRight },
    ajuste: { text: "Ajuste", color: "text-amber-600", Icon: IconMinus },
    ingreso_base: { text: "Base", color: "text-emerald-600", Icon: IconArrowUpRight },
  };

  return (
    <div className="pb-24">
      <Header title="Caja" />

      <div className="p-4 space-y-4">
        {/* Saldo */}
        <div className="bg-primary rounded-xl p-5 text-white">
          <p className="text-sm opacity-70">Saldo del día</p>
          <p className="text-3xl font-medium mt-1">${saldo.toLocaleString()}</p>
          <div className="flex gap-6 mt-3 text-sm">
            <div>
              <p className="opacity-60">Entradas</p>
              <p className="font-medium text-emerald-300">+${entradas.toLocaleString()}</p>
            </div>
            <div>
              <p className="opacity-60">Salidas</p>
              <p className="font-medium text-red-300">-${salidas.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setModalType("base")}
            className="bg-emerald-50 border-thin border-emerald-100 rounded-xl py-3 px-1 text-[13px] font-medium text-emerald-700 hover:bg-emerald-100 transition flex items-center justify-center gap-1"
          >
            <IconPlus size={16} stroke={2} /> Ingresar base
          </button>
          <button
            onClick={() => setModalType("gasto")}
            className="bg-red-50 border-thin border-red-100 rounded-xl py-3 px-1 text-[13px] font-medium text-red-700 hover:bg-red-100 transition flex items-center justify-center gap-1"
          >
            <IconMinus size={16} stroke={2} /> Gasto
          </button>
        </div>

        {/* Modal */}
        {modalType && (
          <form onSubmit={handleForm} className="bg-white rounded-xl p-4 border-thin space-y-3">
            <h3 className="text-sm font-medium text-gray-700">
              {modalType === "base" ? "Ingresar dinero (Base)" : "Registrar gasto"}
            </h3>
            <input
              type="number"
              required
              min="1"
              placeholder="Monto ($)"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
            />
            <input
              type="text"
              placeholder="Nota (opcional)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="w-full rounded-xl border border-[#E5E5EA] px-4 py-3 text-sm focus:outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light transition"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="flex-1 py-2 rounded-xl border border-[#E5E5EA] text-sm font-medium text-gray-500 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-light transition disabled:opacity-50"
              >
                {saving ? "..." : "Guardar"}
              </button>
            </div>
          </form>
        )}

        {/* Movimientos del día */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Movimientos de hoy</h3>
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Cargando...</p>
          ) : movements.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin movimientos hoy</p>
          ) : (
            <div className="space-y-2">
              {movements.map((m) => {
                const info = tipoLabel[m.tipo] || tipoLabel.ajuste;
                const IconComponent = info.Icon;
                return (
                  <div key={m.id} className="bg-white rounded-xl px-4 py-3 border-thin flex items-center gap-3">
                    <IconComponent size={24} stroke={2} className={info.color} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700">{info.text}</p>
                      <p className="text-xs text-gray-400 truncate">{m.nota || "—"}</p>
                    </div>
                    <p className={`text-sm font-medium ${m.monto >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {m.monto >= 0 ? "+" : ""}${Math.abs(m.monto).toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

