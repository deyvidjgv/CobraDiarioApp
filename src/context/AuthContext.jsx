import { createContext, useContext, useEffect, useState } from "react";
import { escucharSesion } from "../firebase/auth";
import { getUserIndex, bootstrapAdminUser, ensureOrganizationDoc } from "../firebase/firestore";

const AuthContext = createContext(null);

/**
 * Resuelve la organización y el rol de la sesión. Toda cuenta debe tener
 * userIndex/{uid}; si no existe, la cuenta es nueva (creada desde Firebase
 * Console) y se convierte en admin de su propia organización. Si la cuenta
 * ya era admin dueño, se asegura que el documento raíz de la organización
 * exista (las cuentas viejas lo tenían "fantasma").
 */
async function resolverMembresia(user) {
  const perfil = { email: user.email, nombre: user.displayName };

  let index = await getUserIndex(user.uid);
  if (!index) {
    index = await bootstrapAdminUser(user.uid, perfil);
  } else if (index.role === "admin" && index.organizationId === user.uid) {
    // Reparación no crítica: si falla, la app sigue funcionando.
    try {
      await ensureOrganizationDoc(user.uid, perfil);
    } catch (err) {
      console.warn("[auth] no se pudo reparar la organización:", err.code, err.message);
    }
  }
  return index;
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [role, setRole] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorSesion, setErrorSesion] = useState(null);

  useEffect(() => {
    // onAuthStateChanged puede dispararse de nuevo (logout/login rápido)
    // antes de que termine la resolución anterior: solo se aplica el
    // resultado de la última.
    let ultimaResolucion = 0;

    const unsubscribe = escucharSesion(async (user) => {
      const resolucion = ++ultimaResolucion;
      setErrorSesion(null);

      if (!user) {
        setUsuario(null);
        setOrgId(null);
        setRole(null);
        setCargando(false);
        return;
      }

      setCargando(true);
      try {
        const index = await resolverMembresia(user);
        if (resolucion !== ultimaResolucion) return;
        setOrgId(index.organizationId);
        setRole(index.role);
      } catch (err) {
        if (resolucion !== ultimaResolucion) return;
        console.error("[auth] no se pudo cargar la organización:", err);
        setOrgId(null);
        setRole(null);
        setErrorSesion(
          err?.code === "permission-denied"
            ? "Tu cuenta no tiene permisos para acceder a la organización. Contacta al administrador."
            : "No se pudo cargar tu organización. Revisa tu conexión e inténtalo de nuevo."
        );
      }
      setUsuario(user);
      setCargando(false);
    });
    return unsubscribe;
  }, []);

  const isAdmin = role === "admin";
  const isCobradiario = role === "cobradiario";

  return (
    <AuthContext.Provider
      value={{ usuario, orgId, role, isAdmin, isCobradiario, cargando, errorSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
