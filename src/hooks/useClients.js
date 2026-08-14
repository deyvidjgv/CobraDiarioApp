import { useState, useEffect } from "react";
import { orderBy } from "firebase/firestore";
import {
  subscribeToCollection,
  addDocument,
  updateDocument,
  removeDocument,
} from "../firebase/firestore";
import { useAuth } from "../context/AuthContext";

export function useClients() {
  const { orgId, usuario } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    const unsub = subscribeToCollection(
      orgId,
      "clients",
      [orderBy("nombre")],
      (docs) => {
        setClients(docs);
        setLoading(false);
      }
    );
    return unsub;
  }, [orgId]);

  // cobradiarioId identifica al dueño operativo del cliente (Plan Maestro,
  // sección 6); las reglas de Firestore exigen que coincida con quien
  // escribe cuando el rol es "cobradiario" (ownsRecord).
  async function addClient(data) {
    return addDocument(orgId, "clients", {
      ...data,
      cobradiarioId: data.cobradiarioId || usuario.uid,
      createdBy: usuario.uid,
      estado: data.estado || "activo",
    });
  }

  async function updateClient(id, data) {
    return updateDocument(orgId, "clients", id, data);
  }

  async function deleteClient(id) {
    return removeDocument(orgId, "clients", id);
  }

  return { clients, loading, addClient, updateClient, deleteClient };
}
