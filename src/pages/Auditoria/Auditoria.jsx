import Header from "../../components/layout/Header";
import { useAuditFeed } from "../../hooks/useAudit";
import { toDate } from "../../logic/dateUtils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { IconHistory, IconUser } from "@tabler/icons-react";

const estilosAccion = {
  cliente_creado: { color: "text-al-dia", bg: "bg-emerald-50", label: "Cliente creado" },
  cliente_actualizado: { color: "text-adelanto", bg: "bg-adelanto/10", label: "Cliente actualizado" },
  credito_creado: { color: "text-primary", bg: "bg-primary-bg", label: "CrÃ©dito creado" },
  credito_actualizado: { color: "text-adelanto", bg: "bg-adelanto/10", label: "CrÃ©dito actualizado" },
  credito_anulado: { color: "text-gold", bg: "bg-amber-50", label: "CrÃ©dito anulado" },
  credito_eliminado: { color: "text-mora", bg: "bg-mora/10", label: "CrÃ©dito eliminado" },
  cobro_registrado: { color: "text-al-dia", bg: "bg-emerald-50", label: "Cobro registrado" },
  correccion_solicitada: { color: "text-gold", bg: "bg-amber-50", label: "CorrecciÃ³n solicitada" },
  correccion_aprobada: { color: "text-al-dia", bg: "bg-emerald-50", label: "CorrecciÃ³n aprobada" },
  correccion_rechazada: { color: "text-mora", bg: "bg-mora/10", label: "CorrecciÃ³n rechazada" },
  movimiento_caja: { color: "text-primary-light", bg: "bg-surface-2", label: "Movimiento de caja" },
  movimiento_eliminado: { color: "text-mora", bg: "bg-mora/10", label: "Movimiento eliminado" },
  visita_registrada: { color: "text-primary", bg: "bg-primary-bg", label: "Visita registrada" },
  settings_actualizadas: { color: "text-adelanto", bg: "bg-adelanto/10", label: "ConfiguraciÃ³n cambiada" },
  admin_view_as_user: { color: "text-primary", bg: "bg-primary-bg", label: "Admin observÃ³ operaciÃ³n" },
};

export default function Auditoria() {
  const { logs, loading } = useAuditFeed(100);

  return (
    <div className="pb-24">
      <Header title="AuditorÃ­a" />

      <div className="p-4 space-y-4">
        {loading ? (
          <p className="text-sm text-primary-light/70 py-10 text-center">Cargando actividad...</p>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <IconHistory size={48} stroke={1.5} className="text-primary-light/50 mb-3" />
            <p className="text-primary-light/75 text-sm">AÃºn no hay actividad registrada</p>
            <p className="text-primary-light/70 text-xs mt-1">
              Los cobros, crÃ©ditos y correcciones aparecerÃ¡n aquÃ­.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-primary-light/70">Ãšltimos {logs.length} eventos</p>
            <div className="space-y-2">
              {logs.map((log) => {
                const estilo = estilosAccion[log.accion] || {
                  color: "text-primary-light",
                  bg: "bg-surface-2",
                  label: log.accion,
                };
                const fecha = toDate(log.createdAt);
                return (
                  <div
                    key={log.id}
                    className="rounded-xl border border-[#E3DFD8] bg-white p-4 flex items-start gap-3"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg ${estilo.bg} ${estilo.color} flex items-center justify-center shrink-0`}
                    >
                      <IconUser size={18} stroke={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={`text-sm font-medium ${estilo.color}`}>{estilo.label}</p>
                        <p className="text-[11px] text-primary-light/70 shrink-0">
                          {format(fecha, "dd MMM, HH:mm", { locale: es })}
                        </p>
                      </div>
                      {log.detalle && (
                        <p className="text-xs text-primary-light mt-0.5 break-words">{log.detalle}</p>
                      )}
                      <p className="text-[11px] text-primary-light/70 mt-1">
                        {log.actorNombre || log.actorId}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

