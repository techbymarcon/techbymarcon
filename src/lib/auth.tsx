import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  developerSignIn,
  developerSignOut,
  getSessionInfo,
  lookupLegacyAccount,
  migrateLegacyAccount,
  updateProfile,
  uploadAvatar,
  userSignIn,
  userSignUp,
} from "./content.functions";

export type Session = { role: "user" | "developer" } | null;

export type Profile = {
  handle: string;
  display_name: string;
  avatar_url: string;
  tier: string;
} | null;

const DEV_USERNAME = "developer";

type Result = { ok: boolean; error?: string; retryAfter?: number };

const AuthCtx = createContext<{
  session: Session;
  profile: Profile;
  signIn: (username: string, password: string) => Promise<Result>;
  signUp: (username: string, password: string) => Promise<Result>;
  checkLegacyAccount: (
    handle: string,
  ) => Promise<Result & { displayName?: string; message?: string }>;
  migrateAccount: (handle: string, username: string, password: string) => Promise<Result>;

  signOut: () => void;
  isDeveloper: boolean;
  banned: boolean;
  banReason: string;
  isModerator: boolean;
  saveProfile: (p: {
    displayName: string;
    handle: string;
    avatarUrl: string;
  }) => Promise<Result>;
  uploadAvatarFile: (file: File) => Promise<{ ok: boolean; url?: string; error?: string }>;
}>({
  session: null,
  profile: null,
  signIn: async () => ({ ok: false }),
  signUp: async () => ({ ok: false }),
  checkLegacyAccount: async () => ({ ok: false }),
  migrateAccount: async () => ({ ok: false }),
  signOut: () => {},
  isDeveloper: false,
  banned: false,
  banReason: "",
  isModerator: false,
  saveProfile: async () => ({ ok: false }),
  uploadAvatarFile: async () => ({ ok: false }),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [moderator, setModerator] = useState(false);
  const [ban, setBan] = useState<{ banned: boolean; reason: string }>({
    banned: false,
    reason: "",
  });

  // Identity always comes from the server-side httpOnly session cookie.
  const sync = async () => {
    try {
      const info = await getSessionInfo();
      setSession(info.signedIn ? { role: info.developer ? "developer" : "user" } : null);
      setProfile((info.profile as Profile) ?? null);
      setModerator(Boolean(info.moderator));
      setBan({ banned: Boolean(info.banned), reason: info.banReason ?? "" });
    } catch {
      setSession(null);
      setProfile(null);
      setModerator(false);
      setBan({ banned: false, reason: "" });
    }
  };

  useEffect(() => {
    void sync();
  }, []);

  const signIn = async (username: string, password: string) => {
    const normalized = username.trim().toLowerCase().replace(/^@/, "");
    if (!normalized || !password) return { ok: false, error: "Enter a username and password." };

    try {
      if (normalized === DEV_USERNAME) {
        const res = await developerSignIn({ data: { password } });
        if (!res.ok)
          return {
            ok: false,
            error: res.error ?? "Wrong developer password.",
            retryAfter: res.retryAfter,
          };
        await sync();
        return { ok: true };
      }

      const res = await userSignIn({ data: { username: normalized, password } });
      if (!res.ok) return { ok: false, error: res.error, retryAfter: res.retryAfter };
      await sync();
      return { ok: true };
    } catch {
      return { ok: false, error: "Something went wrong. Please try again." };
    }
  };

  const signUp = async (username: string, password: string) => {
    const normalized = username.trim().toLowerCase().replace(/^@/, "");
    if (!normalized || !password) return { ok: false, error: "Enter a username and password." };
    try {
      const res = await userSignUp({ data: { username: normalized, password } });
      if (!res.ok) return { ok: false, error: res.error };
      await sync();
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: `Sign-up failed: ${err instanceof Error ? err.message : "please try again."}`,
      };
    }
  };





  const checkLegacyAccount = async (handle: string) => {
    try {
      const res = await lookupLegacyAccount({ data: { handle } });
      if (!res.ok) return { ok: false, error: res.error };
      return { ok: true, displayName: res.displayName, message: res.message };
    } catch {
      return { ok: false, error: "Something went wrong. Please try again." };
    }
  };

  const migrateAccount = async (handle: string, username: string, password: string) => {
    try {
      const res = await migrateLegacyAccount({
        data: { handle, username: username.trim().toLowerCase().replace(/^@/, ""), password },
      });
      if (!res.ok) return { ok: false, error: res.error };
      await sync();
      return { ok: true };
    } catch {
      return { ok: false, error: "Something went wrong. Please try again." };
    }
  };

  return (
    <AuthCtx.Provider
      value={{
        session,
        profile,
        signIn,
        signUp,
        checkLegacyAccount,
        migrateAccount,
        signOut: () => {
          setSession(null);
          setProfile(null);
              setModerator(false);
          setBan({ banned: false, reason: "" });
          developerSignOut().catch(() => {
            /* ignore */
          });
        },
        banned: ban.banned,
        banReason: ban.reason,
        isDeveloper: session?.role === "developer",
        isModerator: session?.role === "developer" || moderator,
        saveProfile: async (p) => {
          if (!session) return { ok: false, error: "Sign in first." };
          const res = await updateProfile({
            data: {
              displayName: p.displayName,
              handle: p.handle,
              avatarUrl: p.avatarUrl,
            },
          });
          if (!res.ok) return { ok: false, error: res.error };
          setProfile(res.profile ?? null);
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
          const res = await uploadAvatar({ data: { dataUrl } });
          if (!res.ok) return { ok: false, error: res.error };
          if (res.profile) setProfile(res.profile);
          return { ok: true, url: res.url };
        },
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
