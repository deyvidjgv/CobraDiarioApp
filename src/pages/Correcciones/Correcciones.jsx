import { useState } from "react";
import Header from "../../components/layout/Header";
import ConfirmarPasswordModal from "../../components/ui/ConfirmarPasswordModal";
import { verificarPassword } from "../../firebase/auth";
import { useCorrections } from "../../hooks/useCorrections";
import { formatearMonto, round2 } from "../../logic/formato";
import { IconClipboardCheck, IconCheck, IconX } from "@tabler/icons-react";

export default function Correcciones() {
  const { corrections, loading, aprobarCorreccion, rechazarCorreccion } = useCorrections();
  // Aprobar/rechazar ajusta caja y el saldo del crédito, así que exige la
  // misma confirmación por contraseña que borrar crédito/movimiento/cliente
  // — antes usaba confirm()/prompt() nativos, sin ninguna verificación.
  const [pendingAction, setPendingAction] = useState(null); // { req, tipo: "aprobar" | "rechazar", motivo? }
  const [processing, setProcessing] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const pendientes = corrections.filter((c) => c.estado === "pendiente");
  const resueltas = corrections.filter((c) => c.estado !== "pendiente");

  function iniciarAprobar(req) {
    setPasswordError("");
    setPendingAction({ req, tipo: "aprobar" });
  }

  function iniciarRechazar(req) {
    const motivo = prompt("Motivo del rechazo (opcional):") || "";
    setPasswordError("");
    setPendingAction({ req, tipo: "rechazar", motivo });
  }

  function cerrarModal() {
    setPendingAction(null);
    setPasswordError("");
  }

  async function confirmarAccion(password) {
    if (!pendingAction) return;
    setPasswordError("");
    setProcessing(true);
    try {
      await verificarPassword(password);
      if (pendingAction.tipo === "aprobar") {
        await aprobarCorreccion(pendingAction.req);
      } else {
        await rechazarCorreccion(pendingAction.req, pendingAction.motivo);
      }
      setPendingAction(null);
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setPasswordError("Contraseña incorrecta. Inténtalo de nuevo.");
      } else {
        setPasswordError(err.message || "No se pudo completar la acción.");
      }
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="pb-24">
      <Header title="Solicitudes de corrección" />

      <div className="p-4 space-y-6">
        {loading ? (
          <p className="text-sm text-primary-light/70 py-10 text-center">Cargando...</p>
        ) : corrections.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <IconClipboardCheck size={48} stroke={1.5} className="text-primary-light/50 mb-3" />
            <p className="text-primary-light/75 text-sm">No hay solicitudes de corrección</p>
          </div>
        ) : (
          <>
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-primary-light/70 tracking-wider">
                Pendientes ({pendientes.length})
              </h3>
              {pendientes.length === 0 ? (
                <p className="text-sm text-primary-light/70">No hay solicitudes pendientes.</p>
              ) : (
                pendientes.map((req) => (
                  <div key={req.id} className="rounded-xl border border-gold/30 bg-gold/10 p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-primary-light/75">Valor original</span>
                      <span className="font-medium text-primary">${formatearMonto(Math.abs(req.valorOriginal))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-primary-light/75">Valor correcto solicitado</span>
                      <span className="font-medium text-primary">${formatearMonto(Math.abs(req.valorCorrecto))}</span>
                    </div>
                    <p className="text-sm text-primary-light">
                      <span className="text-primary-light/70">Motivo: </span>
                      {req.motivo}
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button
                        disabled={pendingAction?.req.id === req.id}
                        onClick={() => iniciarAprobar(req)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-al-dia text-surface-1 text-xs font-medium py-2 hover:bg-al-dia/90 transition disabled:opacity-50"
                      >
                        <IconCheck size={14} stroke={2} />
                        Aprobar
                      </button>
                      <button
                        disabled={pendingAction?.req.id === req.id}
                        onClick={() => iniciarRechazar(req)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-surface border border-mora/20 text-mora text-xs font-medium py-2 hover:bg-mora/10 transition disabled:opacity-50"
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
                <h3 className="text-xs font-semibold uppercase text-primary-light/70 tracking-wider">
                  Resueltas
                </h3>
                {resueltas.map((req) => {
                  const diferencia = round2((req.valorCorrecto ?? 0) - (req.valorOriginal ?? 0));
                  return (
                    <div key={req.id} className="rounded-xl border border-line p-4 space-y-2">
                      <div className="flex justify-between items-start gap-3">
                        <p className="text-xs text-primary-light/70 flex-1">{req.motivo}</p>
                        <span
                          className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                            req.estado === "aprobada"
                              ? "bg-al-dia/10 text-al-dia"
                              : "bg-mora/10 text-mora"
                          }`}
                        >
                          {req.estado === "aprobada" ? "Aprobada" : "Rechazada"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-primary-light/75">Monto original</span>
                        <span className="font-medium text-primary">${formatearMonto(Math.abs(req.valorOriginal))}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-primary-light/75">Monto corregido</span>
                        <span className="font-medium text-primary">${formatearMonto(Math.abs(req.valorCorrecto))}</span>
                      </div>
                      {req.estado === "aprobada" && (
                        <div className="flex justify-between text-sm">
                          <span className="text-primary-light/75">Diferencia</span>
                          <span className={`font-medium ${diferencia >= 0 ? "text-al-dia" : "text-mora"}`}>
                            {diferencia >= 0 ? "+" : "-"}${formatearMonto(Math.abs(diferencia))}
                          </span>
                        </div>
                      )}
                      {req.estado === "aprobada" && req.loanId && (
                        <div className="flex justify-between text-sm border-t border-line pt-2 mt-1">
                          <span className="text-primary-light/75">Saldo del crédito ajustado</span>
                          <span className="font-medium text-primary">
                            ${formatearMonto(req.saldoAntes)} → ${formatearMonto(req.saldoDespues)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            )}
          </>
        )}
      </div>

      <ConfirmarPasswordModal
        isOpen={Boolean(pendingAction)}
        title={pendingAction?.tipo === "aprobar" ? "Aprobar corrección" : "Rechazar corrección"}
        description={
          pendingAction?.tipo === "aprobar"
            ? `Vas a aprobar el cambio de $${formatearMonto(Math.abs(pendingAction.req.valorOriginal))} a $${formatearMonto(Math.abs(pendingAction.req.valorCorrecto))}. Esto ajusta la caja y, si el movimiento corregido era un cobro, también el saldo pendiente del crédito.`
            : "Vas a rechazar esta solicitud de corrección."
        }
        onConfirm={confirmarAccion}
        onCancel={cerrarModal}
        loading={processing}
        error={passwordError}
        confirmText={pendingAction?.tipo === "aprobar" ? "Aprobar" : "Rechazar"}
        confirmIcon={
          pendingAction?.tipo === "aprobar" ? (
            <IconCheck size={16} stroke={1.5} />
          ) : (
            <IconX size={16} stroke={1.5} />
          )
        }
        confirmColor={
          pendingAction?.tipo === "aprobar" ? "bg-al-dia hover:bg-al-dia/90" : "bg-mora/100 hover:bg-mora"
        }
      />
    </div>
  );
}

