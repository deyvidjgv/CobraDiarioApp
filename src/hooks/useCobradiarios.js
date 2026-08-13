import { useEffect, useState } from "react";
import { where, orderBy } from "firebase/firestore";
import { subscribeToCollection, registerCobradiarioMember, updateDocument } from "../firebase/firestore";
import { crearCuentaCobradiario } from "../firebase/secondaryAuth";
import { useAuth } from "../context/AuthContext";

export function useCobradiarios() {
  const { orgId, usuario } = useAuth();
  const [cobradiarios, setCobradiarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    const unsub = subscribeToCollection(
      orgId,
      "users",
      [where("role", "==", "cobradiario"), orderBy("nombre")],
      (docs) => {
        setCobradiarios(docs);
        setLoading(false);
      }
    );
    return unsub;
  }, [orgId]);

  // Crea la cuenta de Auth (instancia secundaria, no afecta la sesión del
  // Admin) y luego registra su ficha en Firestore con la sesión principal.
  async function addCobradiario({ nombre, cedula, celular, email, password }) {
    const uid = await crearCuentaCobradiario(email, password, nombre);
    await registerCobradiarioMember(orgId, uid, {
      email,
      nombre,
      cedula,
      celular,
      createdBy: usuario.uid,
    });
    return { uid };
  }

  // Activa/desactiva a nivel de datos: un cobradiario "inactivo" pierde
  // acceso a la organización por firestore.rules (isActiveMember), aunque
  // su cuenta de Auth siga técnicamente existiendo (no hay backend para
  // deshabilitarla, ver conversación sobre plan gratis/Fase 3).
  async function setEstado(uid, estado) {
    return updateDocument(orgId, "users", uid, { estado });
  }

  return { cobradiarios, loading, addCobradiario, setEstado };
}
