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
  const { orgId } = useAuth();
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

  async function addClient(data) {
    return addDocument(orgId, "clients", data);
  }

  async function updateClient(id, data) {
    return updateDocument(orgId, "clients", id, data);
  }

  async function deleteClient(id) {
    return removeDocument(orgId, "clients", id);
  }

  return { clients, loading, addClient, updateClient, deleteClient };
}
