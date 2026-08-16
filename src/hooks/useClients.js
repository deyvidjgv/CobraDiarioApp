import { useState, useEffect } from "react";
import { where, orderBy } from "firebase/firestore";
import {
  subscribeToCollection,
  addDocument,
  setDocument,
  getDocument,
  updateDocument,
  removeDocument,
} from "../firebase/firestore";
import { useAuth } from "../context/AuthContext";

export function useClients() {
  const { orgId, usuario, isCobradiario } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    const constraints = [
      ...(isCobradiario ? [where("cobradiarioId", "==", usuario.uid)] : []),
      orderBy("nombre"),
    ];
    const unsub = subscribeToCollection(
      orgId,
      "clients",
      constraints,
      (docs) => {
        setClients(docs);
        setLoading(false);
      }
    );
    return unsub;
  }, [orgId, isCobradiario, usuario?.uid]);

  // cobradiarioId identifica al dueño operativo del cliente (Plan Maestro,
  // sección 6); las reglas de Firestore exigen que coincida con quien
  // escribe cuando el rol es "cobradiario" (ownsRecord).
  //
  // La cédula ES el id del documento: evita clientes duplicados (si ya
  // existe una cédula, la creación falla con mensaje claro).
  async function addClient(data) {
    const payload = {
      ...data,
      cobradiarioId: data.cobradiarioId || usuario.uid,
      createdBy: usuario.uid,
      estado: data.estado || "activo",
    };
    const cedulaId = (data.cedula || "").replace(/\D/g, "");
    if (cedulaId) {
      const existe = await getDocument(orgId, "clients", cedulaId);
      if (existe) {
        throw new Error(`Ya existe un cliente con la cédula ${data.cedula}`);
      }
      return setDocument(orgId, "clients", cedulaId, payload);
    }
    return addDocument(orgId, "clients", payload);
  }

  async function updateClient(id, data) {
    return updateDocument(orgId, "clients", id, data);
  }

  async function deleteClient(id) {
    return removeDocument(orgId, "clients", id);
  }

  return { clients, loading, addClient, updateClient, deleteClient };
}
