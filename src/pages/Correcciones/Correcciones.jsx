import { useState } from "react";
import Header from "../../components/layout/Header";
import { useCorrections } from "../../hooks/useCorrections";
import { formatearMonto } from "../../logic/formato";
import { IconClipboardCheck, IconCheck, IconX } from "@tabler/icons-react";

export default function Correcciones() {
  const { corrections, loading, aprobarCorreccion, rechazarCorreccion } = useCorrections();
  const [busyId, setBusyId] = useState(null);

  const pendientes = corrections.filter((c) => c.estado === "pendiente");
  const resueltas = corrections.filter((c) => c.estado !== "pendiente");

  async function handleAprobar(req) {
    if (!confirm(`¿Aprobar corrección de $${formatearMonto(Math.abs(req.valorOriginal))} a $${formatearMonto(Math.abs(req.valorCorrecto))}?`)) return;
    setBusyId(req.id);
    try {
      await aprobarCorreccion(req);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleRechazar(req) {
    const motivo = prompt("Motivo del rechazo (opcional):") || "";
    setBusyId(req.id);
    try {
      await rechazarCorreccion(req, motivo);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="pb-24">
      <Header title="Solicitudes de corrección" />

      <div className="p-4 space-y-6">
        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Cargando...</p>
        ) : corrections.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <IconClipboardCheck size={48} stroke={1.5} className="text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No hay solicitudes de corrección</p>
          </div>
        ) : (
          <>
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">
                Pendientes ({pendientes.length})
              </h3>
              {pendientes.length === 0 ? (
                <p className="text-sm text-gray-400">No hay solicitudes pendientes.</p>
              ) : (
                pendientes.map((req) => (
                  <div key={req.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Valor original</span>
                      <span className="font-medium text-gray-800">${formatearMonto(Math.abs(req.valorOriginal))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Valor correcto solicitado</span>
                      <span className="font-medium text-gray-800">${formatearMonto(Math.abs(req.valorCorrecto))}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      <span className="text-gray-400">Motivo: </span>
                      {req.motivo}
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button
                        disabled={busyId === req.id}
                        onClick={() => handleAprobar(req)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium py-2 hover:bg-emerald-600 transition disabled:opacity-50"
                      >
                        <IconCheck size={14} stroke={2} />
                        Aprobar
                      </button>
                      <button
                        disabled={busyId === req.id}
                        onClick={() => handleRechazar(req)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-xs font-medium py-2 hover:bg-red-50 transition disabled:opacity-50"
                      >
                        <IconX size={14} stroke={2} />
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </section>

            {resueltas.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">
                  Resueltas
                </h3>
                {resueltas.map((req) => (
                  <div key={req.id} className="rounded-xl border border-[#E5E5EA] p-4 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        ${formatearMonto(Math.abs(req.valorOriginal))} → ${formatearMonto(Math.abs(req.valorCorrecto))}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          req.estado === "aprobada"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-red-50 text-red-500"
                        }`}
                      >
                        {req.estado === "aprobada" ? "Aprobada" : "Rechazada"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{req.motivo}</p>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
