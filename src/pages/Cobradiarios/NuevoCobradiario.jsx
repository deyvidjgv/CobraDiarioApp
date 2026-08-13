import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layout/Header";
import CobradiarioForm from "../../components/forms/CobradiarioForm";
import { useCobradiarios } from "../../hooks/useCobradiarios";

export default function NuevoCobradiario() {
  const navigate = useNavigate();
  const { addCobradiario } = useCobradiarios();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data) {
    setLoading(true);
    try {
      await addCobradiario(data);
      navigate("/cobradiarios", { replace: true });
    } catch (err) {
      alert("Error al crear el cobradiario: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header title="Nuevo cobradiario" showBack />
      <div className="p-4">
        <CobradiarioForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </>
  );
}
