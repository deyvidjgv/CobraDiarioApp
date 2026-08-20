import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";

/**
 * Grupo colapsable de secciones de Configuración, agrupadas por nivel de
 * riesgo (General / Reglas de negocio / Zona de riesgo). La animación usa
 * la técnica CSS `grid-template-rows: 0fr → 1fr` en vez de medir alturas
 * por JS o depender de una librería — no hay ninguna en el proyecto.
 */
export default function SeccionAcordeon({ title, icon, defaultOpen = false, tono = "normal", children }) {
  const [open, setOpen] = useState(defaultOpen);
  const esRiesgo = tono === "riesgo";

  return (
    <div
      className={`rounded-2xl border overflow-hidden ${
        esRiesgo ? "border-mora/20 bg-mora/[0.03]" : "border-line"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-3 px-4 py-4 text-left transition ${
          esRiesgo ? "text-mora" : "text-primary"
        }`}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </span>
        <IconChevronDown
          size={18}
          stroke={2}
          className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""} ${
            esRiesgo ? "text-mora/70" : "text-primary-light/60"
          }`}
        />
      </button>
      <div className="grid transition-[grid-template-rows] duration-300 ease-in-out" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4 space-y-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
