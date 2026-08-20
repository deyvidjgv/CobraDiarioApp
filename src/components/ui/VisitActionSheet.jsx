import { useEffect } from "react";
import { IconPhone, IconBrandWhatsapp, IconMapPin } from "@tabler/icons-react";

/**
 * Hoja inferior de acciones de un cliente de la ruta.
 * Orden por frecuencia real de uso: cobrar (primario) → no encontrado →
 * promesa → no pagó. Lo negativo al final y sin color de alarma.
 * Todos los objetivos táctiles ≥ 48px, en la zona natural del pulgar.
 */
export default function VisitActionSheet({
  open,
  item,
  onClose,
  onCobrar,
  onGestion,
  montoCuota = null,
}) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || !item) return null;

  const client = item.client || {};
  const tel = (client.telefono || "").replace(/[^0-9]/g, "");
  const enMora = item.mora?.estado === "mora";

  const gestiones = [
    { resultado: "no_encontrado", label: "No encontrado" },
    { resultado: "promesa_pago", label: "Promesa de pago" },
    { resultado: "no_pago", label: "No pag\u00f3", muted: true },
  ];

  function abrirMapa() {
    const u = client.ubicacion;
    if (!u?.lat || !u?.lng) return;
    window.open(
      "https://www.google.com/maps/dir/?api=1&destination=" + u.lat + "," + u.lng,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={onClose} />

      <div
        role="dialog"
        aria-label={"Acciones de " + (client.nombre || "cliente")}
        className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-surface-1 rounded-t-3xl sm:rounded-3xl sm:mb-6 px-5 pt-3.5 pb-6 pb-safe flex flex-col gap-5 shadow-2xl"
      >
        <div className="w-9 h-1 rounded-full bg-primary/15 mx-auto" />

        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-primary tracking-tight">
            {client.nombre || "Cliente"}
          </h2>
          <p className={"num text-xs " + (enMora ? "text-mora" : "text-primary/50")}>
            {item.subtitleSheet}
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onCobrar}
            className="h-14 rounded-2xl bg-gold text-surface-1 px-5 flex items-center justify-between font-bold text-base active:scale-[0.99] transition"
          >
            <span>Registrar cobro</span>
            {montoCuota && <span className="num text-sm font-medium text-surface-1/70">{montoCuota}</span>}
          </button>

          {gestiones.map((g) => (
            <button
              key={g.resultado}
              type="button"
              onClick={() => onGestion(g.resultado)}
              className={
                "h-[52px] rounded-2xl bg-surface border border-line px-5 flex items-center text-[15px] font-semibold transition hover:border-primary/25 " +
                (g.muted ? "text-primary/60" : "text-primary")
              }
            >
              {g.label}
            </button>
          ))}
        </div>

        {(tel || client.ubicacion?.lat) && (
          <div className="flex flex-col gap-2.5">
            <span className="eyebrow">Contacto</span>
            <div className="grid grid-cols-3 gap-2.5">
              <a
                href={tel ? "tel:" + tel : undefined}
                aria-disabled={!tel}
                className={
                  "h-12 rounded-xl bg-surface-2 flex items-center justify-center gap-2 text-sm font-semibold text-primary " +
                  (tel ? "" : "opacity-40 pointer-events-none")
                }
              >
                <IconPhone size={16} stroke={1.8} /> Llamar
              </a>
              <a
                href={tel ? "https://wa.me/57" + tel : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  "h-12 rounded-xl bg-surface-2 flex items-center justify-center gap-2 text-sm font-semibold text-primary " +
                  (tel ? "" : "opacity-40 pointer-events-none")
                }
              >
                <IconBrandWhatsapp size={16} stroke={1.8} /> WhatsApp
              </a>
              <button
                type="button"
                onClick={abrirMapa}
                disabled={!client.ubicacion?.lat}
                className="h-12 rounded-xl bg-surface-2 flex items-center justify-center gap-2 text-sm font-semibold text-primary disabled:opacity-40"
              >
                <IconMapPin size={16} stroke={1.8} /> Mapa
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
