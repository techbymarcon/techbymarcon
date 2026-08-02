import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Icon, M3Button } from "@/components/m3";
import { Reveal } from "@/components/reveal";
import { Avatar, VerifiedBadge, VerifiedInfo } from "@/components/verified";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Tech by Marcon" },
      {
        name: "description",
        content:
          "Sign in to Tech by Marcon to comment, pick a handle and profile picture, and get a verified badge.",
      },
      { property: "og:title", content: "Sign in — Tech by Marcon" },
      {
        property: "og:description",
        content: "Sign in to comment with a handle, profile picture and verified badge.",
      },
    ],
  }),
  component: Login,
});

function Login() {
  const {
    session,
    profile,
    loginCode,
    signIn,
    signUp,
    signUpWithCode,
    signInWithCode,
    signOut,
    isDeveloper,
    saveProfile,
    uploadAvatarFile,
  } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "code-signin" | "code-signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name);
    setHandle(profile.handle);
    setAvatarUrl(profile.avatar_url);
  }, [profile]);

  const field =
    "w-full rounded-2xl border border-border bg-surface px-5 py-4 text-[16px] outline-none focus:border-primary m3-transition";

  if (session) {
    return (
      <div className="mx-auto max-w-[620px] px-5 py-16 md:py-24">
        <Reveal>
          <div className="rounded-[32px] bg-surface-container p-8 elevation-1">
            <div className="flex items-center gap-4">
              <Avatar src={avatarUrl || undefined} name={displayName || "Member"} size={72} />
              <div className="min-w-0">
                <h1 className="flex items-center gap-2 font-display text-[26px] font-medium">
                  <span className="truncate">{displayName || "Member"}</span>
                  <VerifiedBadge tier={profile?.tier ?? "blue"} />
                </h1>
                <p className="text-[15px] text-muted-foreground">@{handle || "…"}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isDeveloper
                    ? "Golden check — developer account"
                    : "Blue check — verified member"}
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                  Display name
                </span>
                <input
                  className={field}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                  Handle
                </span>
                <input
                  className={field}
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/^@/, ""))}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                  Profile picture — upload from your device (PNG, JPG or animated GIF, max 5 MB)
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  className="w-full rounded-2xl border border-border bg-surface px-5 py-3.5 text-[15px] file:mr-4 file:rounded-full file:border-0 file:bg-secondary-container file:px-4 file:py-2 file:text-[14px] file:font-medium file:text-on-secondary-container"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setStatus("Uploading picture…");
                    const res = await uploadAvatarFile(file);
                    e.target.value = "";
                    if (!res.ok) {
                      setStatus(res.error ?? "Could not upload that image.");
                      return;
                    }
                    setAvatarUrl(res.url ?? "");
                    setStatus("Profile picture updated.");
                  }}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                  …or paste an image URL
                </span>
                <input
                  className={field}
                  placeholder="https://…/avatar.gif"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                />
              </label>
              {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
              <div className="flex flex-wrap gap-3">
                <M3Button
                  variant="filled"
                  onClick={async () => {
                    const res = await saveProfile({ displayName, handle, avatarUrl });
                    setStatus(res.ok ? "Profile saved." : (res.error ?? "Could not save."));
                  }}
                >
                  <Icon name="save" className="text-[20px]" />
                  Save profile
                </M3Button>
                <Link to="/articles">
                  <M3Button variant="tonal">Go to articles</M3Button>
                </Link>
                <M3Button variant="outlined" onClick={signOut}>
                  Sign out
                </M3Button>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <VerifiedInfo className="mt-6" />
        </Reveal>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[620px] px-5 py-16 md:py-24">
      <Reveal>
        <h1 className="font-display text-[36px] leading-tight font-medium md:text-[48px]">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">
          Sign up with just a username and a password — no email, no personal details. You get a
          handle, a profile picture (animated GIFs work) and a blue verified check.
        </p>

        <form
          className="mt-8 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const res =
              mode === "signup"
                ? await signUp(username, password)
                : await signIn(username, password);
            setError(res.ok ? null : (res.error ?? "Sign in failed."));
          }}
        >
          <input
            className={field}
            placeholder="Username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            className={field}
            type="password"
            placeholder="Password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <M3Button type="submit" variant="filled" className="w-full">
            {mode === "signin" ? "Sign in" : "Create account"}
          </M3Button>
          <M3Button
            type="button"
            variant="text"
            className="w-full"
            onClick={() => {
              setError(null);
              setMode(mode === "signin" ? "signup" : "signin");
            }}
          >
            {mode === "signin" ? "New here? Create an account" : "Already a member? Sign in"}
          </M3Button>
        </form>

        <VerifiedInfo className="mt-8" />

        <div className="mt-6 rounded-3xl bg-accent p-6 text-accent-foreground">
          <p className="inline-flex items-center gap-2 text-sm font-medium">
            <Icon name="key" className="text-[18px]" />
            Developer access
          </p>
          <p className="mt-2 text-[15px] leading-relaxed">
            Use <strong>developer</strong> as the username and the developer password to sign in as{" "}
            <strong>@techbymarcon</strong> with the golden check and article editing tools.
          </p>
        </div>
      </Reveal>
    </div>
  );
}
