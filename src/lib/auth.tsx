import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Session = { email: string; role: "user" | "developer" } | null;

const DEV_EMAIL = "developer";
const DEV_PASSWORD = "developerpassword";

const AuthCtx = createContext<{
  session: Session;
  signIn: (email: string, password: string) => { ok: boolean; error?: string };
  signOut: () => void;
  isDeveloper: boolean;
}>({ session: null, signIn: () => ({ ok: false }), signOut: () => {}, isDeveloper: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem("tbm-session");
    if (raw) {
      try {
        setSession(JSON.parse(raw) as Session);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const persist = (s: Session) => {
    setSession(s);
    if (s) window.localStorage.setItem("tbm-session", JSON.stringify(s));
    else window.localStorage.removeItem("tbm-session");
  };

  const signIn = (email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !password) return { ok: false, error: "Enter an email and password." };
    if (normalized === DEV_EMAIL || normalized.startsWith(`${DEV_EMAIL}@`)) {
      if (password !== DEV_PASSWORD) return { ok: false, error: "Wrong developer password." };
      persist({ email: normalized, role: "developer" });
      return { ok: true };
    }
    if (password.length < 4) return { ok: false, error: "Password must be at least 4 characters." };
    persist({ email: normalized, role: "user" });
    return { ok: true };
  };

  return (
    <AuthCtx.Provider
      value={{
        session,
        signIn,
        signOut: () => persist(null),
        isDeveloper: session?.role === "developer",
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
