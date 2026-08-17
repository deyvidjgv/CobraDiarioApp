import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { where, orderBy, limit } from "firebase/firestore";
import Header from "../../components/layout/Header";
import { subscribeToCollection, getDocument } from "../../firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { calcularMoraGlobal } from "../../logic/mora";
import { formatearMonto } from "../../logic/formato";
import { toDate } from "../../logic/dateUtils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAudit, ACCIONES_AUDIT } from "../../hooks/useAudit";
import Badge from "../../components/ui/Badge";
import { IconUsers, IconFileText, IconCash } from "@tabler/icons-react";

/**
 * Ver operaciÃ³n de un cobradiario (Plan Maestro, secciÃ³n 18).
 * El Admin observa SIN compartir credenciales ni suplantar la sesiÃ³n:
 * cada apertura queda registrada en auditLogs como ADMIN_VIEW_AS_USER
 * con el actor real (el Admin) y el cobradiario observado.
 */
export default function OperacionCobradiario() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const { orgId } = useAuth();
  const { registrarEvento } = useAudit();

  const [cob, setCob] = useState(null);
  const [clients, setClients] = useState([]);
  const [loans, setLoans] = useState([]);
  const [cobros, setCobros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("clientes");

  // Carga la ficha y registra la observaciÃ³n (audit append-only)
  useEffect(() => {
    if (!orgId || !uid) return;

    (async () => {
      const ficha = await getDocument(orgId, "users", uid);
      setCob(ficha);
      setLoading(false);
      registrarEvento(ACCIONES_AUDIT.ADMIN_VIEW_AS_USER, {
        entidad: "users",
        entidadId: uid,
        detalle: `Admin observando operaciÃ³n de ${ficha?.nombre ?? uid}`,
      });
    })();

    // Clientes del cobradiario observado
    const unsubClients = subscribeToCollection(
      orgId,
      "clients",
      [where("cobradiarioId", "==", uid), orderBy("nombre")],
      setClients
    );

    const unsubLoans = subscribeToCollection(
      orgId,
      "loans",
      [where("cobradiarioId", "==", uid), orderBy("fechaInicio", "desc")],
      setLoans
    );

    const unsubMovs = subscribeToCollection(
      orgId,
      "movements",
      [where("cobradiarioId", "==", uid), orderBy("fecha", "desc"), limit(50)],
      (docs) => setCobros(docs.filter((d) => d.tipo === "cobro"))
    );

    return () => {
      unsubClients();
      unsubLoans();
      unsubMovs();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, uid]);

  const resumen = useMemo(() => {
    const activos = loans.filter((l) => l.estado === "activo");
    return {
      clientes: clients.length,
      creditosActivos: activos.length,
      cartera: activos.reduce((acc, l) => acc + (l.saldoPendiente ?? 0), 0),
      enMora: activos.filter((l) => calcularMoraGlobal(l).estado === "mora").length,
    };
  }, [clients, loans]);

  if (loading) {
    return (
      <>
        <Header title="Ver operaciÃ³n" showBack />
        <p className="p-6 text-sm text-primary-light/70">Cargando...</p>
      </>
    );
  }

  if (!cob) {
    return (
      <>
        <Header title="Ver operaciÃ³n" showBack />
        <p className="p-6 text-sm text-mora/80">Cobradiario no encontrado</p>
      </>
    );
  }

  const tabs = [
    { id: "clientes", label: `Clientes (${clients.length})`, Icon: IconUsers },
    { id: "creditos", label: `CrÃ©ditos (${loans.length})`, Icon: IconFileText },
    { id: "cobros", label: `Cobros (${cobros.length})`, Icon: IconCash },
  ];

  return (
    <div className="pb-24">
      <Header
        title={`OperaciÃ³n Â· ${cob.nombre || "cobradiario"}`}
        showBack
        backTo="/cobradiarios"
      />

      <div className="p-4 space-y-4">
        {/* Banner de modo observaciÃ³n */}
        <div className="rounded-xl bg-primary-bg border border-primary/20 p-3 text-xs text-primary flex items-center gap-2">
          <IconUsers size={16} stroke={1.5} />
          EstÃ¡s observando la operaciÃ³n en modo solo lectura. Esta vista queda registrada en
          auditorÃ­a.
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 border border-[#E3DFD8]">
            <p className="text-[11px] text-primary-light/70 uppercase">Clientes</p>
            <p className="text-lg font-semibold text-primary">{resumen.clientes}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-[#E3DFD8]">
            <p className="text-[11px] text-primary-light/70 uppercase">CrÃ©ditos activos</p>
            <p className="text-lg font-semibold text-primary">{resumen.creditosActivos}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-[#E3DFD8]">
            <p className="text-[11px] text-primary-light/70 uppercase">Cartera pendiente</p>
            <p className="text-lg font-semibold text-primary">${formatearMonto(resumen.cartera)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-[#E3DFD8]">
            <p className="text-[11px] text-primary-light/70 uppercase">En mora</p>
            <p className={`text-lg font-semibold ${resumen.enMora > 0 ? "text-mora" : "text-primary"}`}>
              {resumen.enMora}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-2 rounded-xl p-1">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition ${
                tab === id ? "bg-white text-primary shadow-sm" : "text-primary-light/75 hover:text-primary"
              }`}
            >
              <Icon size={14} stroke={1.5} />
              {label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="space-y-2">
          {tab === "clientes" &&
            (clients.length === 0 ? (
              <p className="text-sm text-primary-light/70 text-center py-6">Sin clientes asignados</p>
            ) : (
              clients.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-xl px-4 py-3 border border-[#E3DFD8] flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-full bg-primary-bg text-primary flex items-center justify-center text-sm font-medium shrink-0">
                    {c.nombre?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{c.nombre}</p>
                    <p className="text-xs text-primary-light/70 truncate">{c.telefono || c.cedula || ""}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/clientes/${c.id}`)}
                    className="text-xs text-primary-light font-medium shrink-0"
                  >
                    Ver ficha
                  </button>
                </div>
              ))
            ))}

          {tab === "creditos" &&
            (loans.length === 0 ? (
              <p className="text-sm text-primary-light/70 text-center py-6">Sin crÃ©ditos</p>
            ) : (
              loans.map((l) => {
                const mora = calcularMoraGlobal(l);
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => navigate(`/creditos/${l.id}`)}
                    className="w-full bg-white rounded-xl px-4 py-3 border border-[#E3DFD8] flex items-center justify-between gap-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-primary">
                        ${formatearMonto(l.capital)} Â· {l.numeroCuotas} cuotas {l.frecuencia}
                      </p>
                      <p className="text-xs text-primary-light/70">
                        Saldo: ${formatearMonto(l.saldoPendiente ?? 0)}
                      </p>
                    </div>
                    <Badge status={l.estado === "activo" ? mora.estado : l.estado} />
                  </button>
                );
              })
            ))}

          {tab === "cobros" &&
            (cobros.length === 0 ? (
              <p className="text-sm text-primary-light/70 text-center py-6">Sin cobros registrados</p>
            ) : (
              cobros.map((m) => (
                <div
                  key={m.id}
                  className="bg-white rounded-xl px-4 py-3 border border-[#E3DFD8] flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {m.clienteNombre || "Cliente"}
                    </p>
                    <p className="text-xs text-primary-light/70">
                      {format(toDate(m.fecha), "dd MMM yyyy, HH:mm", { locale: es })}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-al-dia">
                    ${formatearMonto(m.monto)}
                  </p>
                </div>
              ))
            ))}
        </div>
      </div>
    </div>
  );
}

