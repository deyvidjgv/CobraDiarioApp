import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layout/Header";
import ClientForm from "../../components/forms/ClientForm";
import { useClients } from "../../hooks/useClients";

export default function NuevoCliente() {
  const navigate = useNavigate();
  const { addClient } = useClients();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data) {
    setLoading(true);
    try {
      await addClient(data);
      navigate("/clientes", { replace: true });
    } catch (err) {
      alert("Error al guardar: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header title="Nuevo cliente" showBack />
      <div className="p-4">
        <ClientForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </>
  );
}
