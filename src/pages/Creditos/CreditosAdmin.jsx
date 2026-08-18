import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layout/Header";
import Badge from "../../components/ui/Badge";
import { useLoans } from "../../hooks/useLoans";
import { useClients } from "../../hooks/useClients";
import { useCobradiarios } from "../../hooks/useCobradiarios";
import { formatearMonto } from "../../logic/formato";
import { IconFileText, IconChevronRight, IconSearch } from "@tabler/icons-react";

/**
 * Panel de créditos del Admin: SOLO LECTURA.
 *
 * El Admin no entrega créditos (ver NuevoCredito) — presta el cobrador y
 * el Admin controla. Esa separación es la que hace que las cifras sean
 * confiables, así que aquí no hay ningún botón de crear: solo ver toda la
 * cartera de la organización, buscar y filtrar.
 */
export default function CreditosAdmin() {
  const navigate = useNavigate();
  const { loans, loading } = useLoans(false); // todos los estados, no solo activos
  const { clients } = useClients();
  const { cobradiarios } = useCobradiarios();

  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("activo");
  const [cobradorId, setCobradorId] = useState("todos");

  const nombrePorCliente = useMemo(
    () => Object.fromEntries(clients.map((c) => [c.id, c.nombre])),
    [clients]
  );
  const nombrePorCobrador = useMemo(
    () => Object.fromEntries(cobradiarios.map((c) => [c.uid, c.nombre])),
    [cobradiarios]
  );

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return loans.filter((l) => {
      if (estado !== "todos" && l.estado !== estado) return false;
      if (cobradorId !== "todos" && l.cobradiarioId !== cobradorId) return false;
      if (!q) return true;
      const cliente = (nombrePorCliente[l.clientId] ?? "").toLowerCase();
      const cobrador = (nombrePorCobrador[l.cobradiarioId] ?? "").toLowerCase();
      return cliente.includes(q) || cobrador.includes(q);
    });
  }, [loans, estado, cobradorId, search, nombrePorCliente, nombrePorCobrador]);

  const totalPendiente = filtrados.reduce((acc, l) => acc + (l.saldoPendiente ?? 0), 0);

  const estados = [
    { key: "activo", label: "Activos" },
    { key: "completado", label: "Completados" },
    { key: "todos", label: "Todos" },
  ];

  return (
    <div className="pb-24">
      <Header title="Créditos" />

      <div className="p-4 space-y-4">
        {/* Buscador */}
        <div className="relative">
          <IconSearch
            size={18}
            stroke={1.5}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-light/70 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente o cobrador"
            className="w-full rounded-xl bg-surface border border-line pl-10 pr-4 py-3 text-sm text-primary placeholder:text-primary/30 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition"
          />
        </div>

        {/* Filtro por estado */}
        <div className="grid grid-cols-3 gap-2">
          {estados.map((e) => (
            <button
              key={e.key}
              type="button"
              onClick={() => setEstado(e.key)}
              className={`rounded-xl border py-2 text-xs font-medium transition ${
                estado === e.key
                  ? "border-gold/40 bg-gold/10 text-primary"
                  : "border-line text-primary-light/70 hover:text-primary"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>

        {/* Filtro por cobrador */}
        {cobradiarios.length > 0 && (
          <select
            value={cobradorId}
            onChange={(e) => setCobradorId(e.target.value)}
            className="w-full rounded-xl bg-surface border border-line px-4 py-3 text-sm text-primary focus:outline-none focus:border-gold transition"
          >
            <option value="todos">Todos los cobradores</option>
            {cobradiarios.map((c) => (
              <option key={c.uid} value={c.uid}>
                {c.nombre}
              </option>
            ))}
          </select>
        )}

        {/* Resumen de lo filtrado */}
        <div className="rounded-xl bg-surface border border-line px-4 py-3 flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-wide text-primary-light/70">
            {filtrados.length} crédito{filtrados.length === 1 ? "" : "s"}
          </span>
          <span className="num text-lg font-semibold text-primary" translate="no">
            ${formatearMonto(totalPendiente)}
          </span>
        </div>

        {/* Listado */}
        {loading ? (
          <p className="text-sm text-primary-light/70 py-10 text-center">Cargando créditos...</p>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <IconFileText size={48} stroke={1.5} className="text-primary-light/50 mb-3" />
            <p className="text-primary-light/75 text-sm">No hay créditos con esos filtros</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtrados.map((loan) => (
              <button
                key={loan.id}
                type="button"
                onClick={() => navigate(`/creditos/${loan.id}`)}
                className="w-full text-left rounded-xl border border-line bg-surface px-4 py-3 flex items-center gap-3 hover:border-primary-light/40 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-primary truncate">
                      {nombrePorCliente[loan.clientId] ?? "Cliente eliminado"}
                    </p>
                    <Badge status={loan.estado} />
                  </div>
                  <p className="text-xs text-primary-light/70 truncate mt-0.5">
                    {nombrePorCobrador[loan.cobradiarioId] ?? "Sin cobrador"}
                  </p>
                  <p className="num text-sm text-primary mt-1" translate="no">
                    ${formatearMonto(loan.saldoPendiente ?? 0)}
                    <span className="text-primary-light/60">
                      {" "}
                      de ${formatearMonto(loan.montoTotalAPagar ?? 0)}
                    </span>
                  </p>
                </div>
                <IconChevronRight size={18} stroke={1.5} className="text-primary-light/50 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
