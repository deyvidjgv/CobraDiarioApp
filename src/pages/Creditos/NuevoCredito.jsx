import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layout/Header";
import LoanForm from "../../components/forms/LoanForm";
import { useClients } from "../../hooks/useClients";
import { useLoans } from "../../hooks/useLoans";
import { useAuth } from "../../context/AuthContext";
import { getSettings } from "../../firebase/firestore";
import { construirCredito } from "../../logic/credito";

export default function NuevoCredito() {
  const navigate = useNavigate();
  const { orgId } = useAuth();
  const { clients } = useClients();
  const { addLoan } = useLoans();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    getSettings(orgId).then((s) => {
      if (s) setSettings(s);
    });
  }, [orgId]);

  async function handleSubmit(formData) {
    setLoading(true);
    try {
      const loanDoc = construirCredito(formData, settings);
      await addLoan(loanDoc);
      navigate("/ruta", { replace: true });
    } catch (err) {
      alert("Error al crear crédito: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header title="Nuevo crédito" showBack />
      <div className="p-4">
        <LoanForm
          clients={clients}
          settings={settings}
          onSubmit={handleSubmit}
          loading={loading}
        />
      </div>
    </>
  );
}
