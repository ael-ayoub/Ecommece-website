import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as adminAuth from "../api/adminAuth";
import type { AdminSession } from "../api/adminAuth";
import { onSessionExpired } from "../api/client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  admin: AdminSession | null;
  status: AuthStatus;
  setAdmin: (admin: AdminSession) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdminState] = useState<AdminSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    onSessionExpired(() => {
      setAdminState(null);
      setStatus("unauthenticated");
    });

    adminAuth
      .me()
      .then((res) => {
        setAdminState(res.admin);
        setStatus("authenticated");
      })
      .catch(() => {
        setStatus("unauthenticated");
      });
  }, []);

  function setAdmin(next: AdminSession) {
    setAdminState(next);
    setStatus("authenticated");
  }

  async function logout() {
    try {
      await adminAuth.logout();
    } finally {
      setAdminState(null);
      setStatus("unauthenticated");
    }
  }

  return <AuthContext.Provider value={{ admin, status, setAdmin, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
