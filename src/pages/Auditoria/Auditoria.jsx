import Header from "../../components/layout/Header";
import { useAuditFeed } from "../../hooks/useAudit";
import { toDate } from "../../logic/dateUtils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { IconHistory, IconUser } from "@tabler/icons-react";

const estilosAccion = {
  cliente_creado: { color: "text-emerald-600", bg: "bg-emerald-50", label: "Cliente creado" },
  cliente_actualizado: { color: "text-blue-600", bg: "bg-blue-50", label: "Cliente actualizado" },
  credito_creado: { color: "text-primary", bg: "bg-primary-bg", label: "Crédito creado" },
  credito_actualizado: { color: "text-blue-600", bg: "bg-blue-50", label: "Crédito actualizado" },
  credito_anulado: { color: "text-amber-600", bg: "bg-amber-50", label: "Crédito anulado" },
  credito_eliminado: { color: "text-red-600", bg: "bg-red-50", label: "Crédito eliminado" },
  cobro_registrado: { color: "text-emerald-600", bg: "bg-emerald-50", label: "Cobro registrado" },
  correccion_solicitada: { color: "text-amber-600", bg: "bg-amber-50", label: "Corrección solicitada" },
  correccion_aprobada: { color: "text-emerald-600", bg: "bg-emerald-50", label: "Corrección aprobada" },
  correccion_rechazada: { color: "text-red-600", bg: "bg-red-50", label: "Corrección rechazada" },
  movimiento_caja: { color: "text-gray-600", bg: "bg-gray-100", label: "Movimiento de caja" },
  movimiento_eliminado: { color: "text-red-600", bg: "bg-red-50", label: "Movimiento eliminado" },
  visita_registrada: { color: "text-primary", bg: "bg-primary-bg", label: "Visita registrada" },
  settings_actualizadas: { color: "text-blue-600", bg: "bg-blue-50", label: "Configuración cambiada" },
  admin_view_as_user: { color: "text-primary", bg: "bg-primary-bg", label: "Admin observó operación" },
};

export default function Auditoria() {
  const { logs, loading } = useAuditFeed(100);

  return (
    <div className="pb-24">
      <Header title="Auditoría" />

      <div className="p-4 space-y-4">
        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Cargando actividad...</p>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <IconHistory size={48} stroke={1.5} className="text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">Aún no hay actividad registrada</p>
            <p className="text-gray-400 text-xs mt-1">
              Los cobros, créditos y correcciones aparecerán aquí.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400">Últimos {logs.length} eventos</p>
            <div className="space-y-2">
              {logs.map((log) => {
                const estilo = estilosAccion[log.accion] || {
                  color: "text-gray-600",
                  bg: "bg-gray-100",
                  label: log.accion,
                };
                const fecha = toDate(log.createdAt);
                return (
                  <div
                    key={log.id}
                    className="rounded-xl border border-[#E5E5EA] bg-white p-4 flex items-start gap-3"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg ${estilo.bg} ${estilo.color} flex items-center justify-center shrink-0`}
                    >
                      <IconUser size={18} stroke={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={`text-sm font-medium ${estilo.color}`}>{estilo.label}</p>
                        <p className="text-[11px] text-gray-400 shrink-0">
                          {format(fecha, "dd MMM, HH:mm", { locale: es })}
                        </p>
                      </div>
                      {log.detalle && (
                        <p className="text-xs text-gray-600 mt-0.5 break-words">{log.detalle}</p>
                      )}
                      <p className="text-[11px] text-gray-400 mt-1">
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
