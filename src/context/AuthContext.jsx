import { createContext, useContext, useEffect, useState } from "react";
import { escucharSesion } from "../firebase/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsubscribe = escucharSesion((user) => {
      setUsuario(user);
      setCargando(false);
    });
    return unsubscribe;
  }, []);

  // El orgId de este cobrador es directamente su uid (ver firestore.rules)
  const orgId = usuario?.uid ?? null;

  return (
    <AuthContext.Provider value={{ usuario, orgId, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
