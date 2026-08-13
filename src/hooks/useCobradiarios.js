import { useEffect, useState } from "react";
import { where, orderBy } from "firebase/firestore";
import { subscribeToCollection } from "../firebase/firestore";
import { crearCobradiario, cambiarEstadoCobradiario } from "../firebase/functions";
import { useAuth } from "../context/AuthContext";

export function useCobradiarios() {
  const { orgId } = useAuth();
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

  async function addCobradiario(data) {
    return crearCobradiario(data);
  }

  async function setEstado(uid, estado) {
    return cambiarEstadoCobradiario(uid, estado);
  }

  return { cobradiarios, loading, addCobradiario, setEstado };
}
