import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layout/Header";
import { useCobradiarios } from "../../hooks/useCobradiarios";
import { IconUsersGroup, IconPlus, IconPower, IconEye } from "@tabler/icons-react";

export default function Cobradiarios() {
  const navigate = useNavigate();
  const { cobradiarios, loading, setEstado } = useCobradiarios();
  const [busyUid, setBusyUid] = useState(null);

  async function handleToggle(c) {
    const nuevoEstado = c.estado === "activo" ? "inactivo" : "activo";
    const verbo = nuevoEstado === "activo" ? "activar" : "desactivar";
    if (!confirm(`¿Seguro que quieres ${verbo} a ${c.nombre}?`)) return;

    setBusyUid(c.uid);
    try {
      await setEstado(c.uid, nuevoEstado);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setBusyUid(null);
    }
  }

  return (
    <div className="pb-24">
      <Header title="Cobradiarios" />

      <div className="p-4 space-y-4">
        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Cargando cobradiarios...</p>
        ) : cobradiarios.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <IconUsersGroup size={48} stroke={1.5} className="text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">Aún no has creado ningún cobradiario</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cobradiarios.map((c) => (
              <div
                key={c.id}
                className="w-full flex items-center gap-3 rounded-xl px-4 py-3 border border-thin bg-white"
              >
                <div className="w-10 h-10 rounded-full bg-primary-bg text-primary flex items-center justify-center text-sm font-medium shrink-0">
                  {c.nombre?.[0]?.toUpperCase() || "?"}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{c.nombre}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {c.email} {c.celular ? `· ${c.celular}` : ""}
                  </p>
                </div>

                <span
                  className={`text-[11px] font-medium px-2 py-1 rounded-full shrink-0 ${
                    c.estado === "activo"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {c.estado === "activo" ? "Activo" : "Inactivo"}
                </span>

                <button
                  type="button"
                  onClick={() => navigate(`/cobradiarios/operacion/${c.uid}`)}
                  title="Ver operación (solo lectura, auditado)"
                  className="p-2 text-gray-400 hover:text-primary hover:bg-primary-bg/50 rounded-lg transition shrink-0"
                >
                  <IconEye size={18} stroke={1.5} />
                </button>

                <button
                  type="button"
                  disabled={busyUid === c.uid}
                  onClick={() => handleToggle(c)}
                  title={c.estado === "activo" ? "Desactivar" : "Activar"}
                  className="p-2 text-gray-400 hover:text-primary hover:bg-primary-bg/50 rounded-lg transition shrink-0 disabled:opacity-40"
                >
                  <IconPower size={18} stroke={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate("/cobradiarios/nuevo")}
        className="fixed bottom-8 right-4 w-14 h-14 bg-primary-light text-white rounded-full flex items-center justify-center hover:scale-105 transition z-30"
        aria-label="Nuevo cobradiario"
      >
        <IconPlus size={28} stroke={2} />
      </button>
    </div>
  );
}
