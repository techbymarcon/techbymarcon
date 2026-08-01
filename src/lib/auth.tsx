import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  developerSignIn,
  developerSignOut,
  ensureProfile,
  getProfile,
  updateProfile,
  uploadAvatar,
} from "./content.functions";

export type Session = { email: string; role: "user" | "developer" } | null;

export type Profile = {
  email: string;
  handle: string;
  display_name: string;
  avatar_url: string;
  tier: string;
} | null;

const DEV_EMAIL = "developer";

const AuthCtx = createContext<{
  session: Session;
  profile: Profile;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => void;
  isDeveloper: boolean;
  saveProfile: (p: {
    displayName: string;
    handle: string;
    avatarUrl: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  uploadAvatarFile: (file: File) => Promise<{ ok: boolean; url?: string; error?: string }>;
}>({
  session: null,
  profile: null,
  signIn: async () => ({ ok: false }),
  signOut: () => {},
  isDeveloper: false,
  saveProfile: async () => ({ ok: false }),
  uploadAvatarFile: async () => ({ ok: false }),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [profile, setProfile] = useState<Profile>(null);

  const loadProfile = async (email: string) => {
    try {
      const res = await ensureProfile({ data: { email } });
      setProfile((res.profile as Profile) ?? null);
    } catch {
      try {
        const res = await getProfile({ data: { email } });
        setProfile((res.profile as Profile) ?? null);
      } catch {
        setProfile(null);
      }
    }
  };

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
    getDeveloperStatusSafe()
      .then((developer) => {
        const next = developer
          ? (local ?? { email: DEV_EMAIL, role: "developer" as const })
          : local && local.role === "user"
            ? local
            : null;
        setSession(next);
        if (next) void loadProfile(developer ? DEV_EMAIL : next.email);
      })
      .catch(() => setSession(null));
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
      persist({ email: DEV_EMAIL, role: "developer" });
      await loadProfile(DEV_EMAIL);
      return { ok: true };
    }

    if (password.length < 4) return { ok: false, error: "Password must be at least 4 characters." };
    persist({ email: normalized, role: "user" });
    await loadProfile(normalized);
    return { ok: true };
  };

  return (
    <AuthCtx.Provider
      value={{
        session,
        profile,
        signIn,
        signOut: () => {
          persist(null);
          setProfile(null);
          developerSignOut().catch(() => {
            /* ignore */
          });
        },
        isDeveloper: session?.role === "developer",
        saveProfile: async (p) => {
          if (!session) return { ok: false, error: "Sign in first." };
          const res = await updateProfile({
            data: {
              email: session.email,
              displayName: p.displayName,
              handle: p.handle,
              avatarUrl: p.avatarUrl,
            },
          });
          if (!res.ok) return { ok: false, error: res.error };
          setProfile((res.profile as Profile) ?? null);
          return { ok: true };
        },
        uploadAvatarFile: async (file: File) => {
          if (!session) return { ok: false, error: "Sign in first." };
          if (file.size > 5 * 1024 * 1024) return { ok: false, error: "Image must be under 5 MB." };
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("Could not read that file."));
            reader.readAsDataURL(file);
          });
          const res = await uploadAvatar({ data: { email: session.email, dataUrl } });
          if (!res.ok) return { ok: false, error: res.error };
          if (res.profile) setProfile(res.profile as Profile);
          return { ok: true, url: res.url };
        },
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

async function getDeveloperStatusSafe() {
  const { getDeveloperStatus } = await import("./content.functions");
  const res = await getDeveloperStatus();
  return res.developer;
}

export const useAuth = () => useContext(AuthCtx);
