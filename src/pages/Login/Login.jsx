import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registrarCobrador, iniciarSesion } from "../../firebase/auth";
import { IconCoin } from "@tabler/icons-react";

export default function Login() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await registrarCobrador(email, password);
      } else {
        await iniciarSesion(email, password);
      }
      navigate("/", { replace: true });
    } catch (err) {
      const msgs = {
        "auth/email-already-in-use": "Este correo ya está registrado",
        "auth/invalid-email": "Correo no válido",
        "auth/weak-password": "La contraseña debe tener al menos 6 caracteres",
        "auth/user-not-found": "No existe una cuenta con este correo",
        "auth/wrong-password": "Contraseña incorrecta",
        "auth/invalid-credential": "Credenciales inválidas",
      };
      setError(msgs[err.code] || "Error al autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4 text-white">
            <IconCoin size={32} stroke={1.5} />
          </div>
          <h1 className="text-2xl font-medium text-white">Cobro Diario</h1>
          <p className="text-white/60 text-sm mt-1">Gestión de cobros simplificada</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20"
        >
          <h2 className="text-lg font-medium text-white mb-5">
            {isRegister ? "Crear cuenta" : "Iniciar sesión"}
          </h2>

          {error && (
            <div className="bg-red-500/20 border-thin border-red-400/30 text-red-200 text-sm rounded-xl px-4 py-2.5 mb-4">
              {error}
            </div>
          )}

          <label className="block mb-4">
            <span className="text-white/70 text-sm">Correo electrónico</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 px-4 py-3 focus:outline-none focus:ring-1 focus:ring-primary-light transition"
              placeholder="tu@correo.com"
            />
          </label>

          <label className="block mb-6">
            <span className="text-white/70 text-sm">Contraseña</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 px-4 py-3 focus:outline-none focus:ring-1 focus:ring-primary-light transition"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-white/90 text-primary font-medium rounded-xl py-3 transition disabled:opacity-50"
          >
            {loading ? "Cargando..." : isRegister ? "Registrarse" : "Entrar"}
          </button>

          <p className="text-center text-white/50 text-sm mt-5">
            {isRegister ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              className="text-primary-light font-medium hover:underline"
            >
              {isRegister ? "Inicia sesión" : "Regístrate"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

