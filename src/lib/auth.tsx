import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { developerSignIn, developerSignOut, getDeveloperStatus } from "./content.functions";

export type Session = { email: string; role: "user" | "developer" } | null;

const DEV_EMAIL = "developer";

const AuthCtx = createContext<{
  session: Session;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => void;
  isDeveloper: boolean;
}>({
  session: null,
  signIn: async () => ({ ok: false }),
  signOut: () => {},
  isDeveloper: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem("tbm-session");
    let local: Session = null;
    if (raw) {
      try {
        local = JSON.parse(raw) as Session;
      } catch {
        /* ignore */
      }
    }
    // The developer role is decided by the server-side session cookie, not local storage.
    getDeveloperStatus()
      .then(({ developer }) => {
        if (developer) setSession(local ?? { email: DEV_EMAIL, role: "developer" });
        else setSession(local && local.role === "user" ? local : null);
      })
      .catch(() => setSession(local && local.role === "user" ? local : null));
  }, []);

  const persist = (s: Session) => {
    setSession(s);
    if (s) window.localStorage.setItem("tbm-session", JSON.stringify(s));
    else window.localStorage.removeItem("tbm-session");
  };

  const signIn = async (email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !password) return { ok: false, error: "Enter an email and password." };

    if (normalized === DEV_EMAIL || normalized.startsWith(`${DEV_EMAIL}@`)) {
      const res = await developerSignIn({ data: { password } });
      if (!res.ok) return { ok: false, error: "Wrong developer password." };
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
        signOut: () => {
          persist(null);
          developerSignOut().catch(() => {
            /* ignore */
          });
        },
        isDeveloper: session?.role === "developer",
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
