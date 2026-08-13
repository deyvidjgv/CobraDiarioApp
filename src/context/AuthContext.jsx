import { createContext, useContext, useEffect, useState } from "react";
import { escucharSesion } from "../firebase/auth";
import { getUserIndex, bootstrapAdminUser } from "../firebase/firestore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [role, setRole] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsubscribe = escucharSesion(async (user) => {
      setUsuario(user);

      if (!user) {
        setOrgId(null);
        setRole(null);
        setCargando(false);
        return;
      }

      // Todo usuario debe tener userIndex/{uid}. Si no existe (cuentas
      // creadas antes de introducir roles), se crea como admin de su
      // propia organización — es el comportamiento que ya tenía.
      let index = await getUserIndex(user.uid);
      if (!index) {
        index = await bootstrapAdminUser(user.uid, {
          email: user.email,
          nombre: user.displayName,
        });
      }

      setOrgId(index.organizationId);
      setRole(index.role);
      setCargando(false);
    });
    return unsubscribe;
  }, []);

  const isAdmin = role === "admin";
  const isCobradiario = role === "cobradiario";

  return (
    <AuthContext.Provider value={{ usuario, orgId, role, isAdmin, isCobradiario, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
