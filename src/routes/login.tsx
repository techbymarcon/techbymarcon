import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Icon, M3Button } from "@/components/m3";
import { Reveal } from "@/components/reveal";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Tech by Marcon" },
      { name: "description", content: "Sign in to Tech by Marcon as a reader or developer." },
      { property: "og:title", content: "Sign in — Tech by Marcon" },
      { property: "og:description", content: "Sign in as a reader or developer." },
    ],
  }),
  component: Login,
});

function Login() {
  const { session, signIn, signOut, isDeveloper } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const field =
    "w-full rounded-2xl border border-border bg-surface px-5 py-4 text-[16px] outline-none focus:border-primary m3-transition";

  if (session) {
    return (
      <div className="mx-auto max-w-[560px] px-5 py-16 md:py-24">
        <Reveal>
          <div className="rounded-[32px] bg-surface-container p-8 text-center elevation-1">
            <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-primary-container text-on-primary-container">
              <Icon name={isDeveloper ? "build" : "person"} filled className="text-[28px]" />
            </span>
            <h1 className="mt-6 font-display text-[28px] font-medium">
              {isDeveloper ? "Developer mode active" : "You're signed in"}
            </h1>
            <p className="mt-2 text-[16px] text-muted-foreground">{session.email}</p>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              {isDeveloper
                ? "You can create, edit and delete articles, including their photos and text."
                : "Enjoy the guides. Developer tools require a developer account."}
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link to="/articles">
                <M3Button variant="filled">Go to articles</M3Button>
              </Link>
              <M3Button variant="outlined" onClick={signOut}>
                Sign out
              </M3Button>
            </div>
          </div>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[560px] px-5 py-16 md:py-24">
      <Reveal>
        <h1 className="font-display text-[36px] leading-tight font-medium md:text-[48px]">
          Sign in
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">
          Readers can sign in with any email. Developers unlock editing tools.
        </p>

        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const res = signIn(email, password);
            setError(res.ok ? null : (res.error ?? "Sign in failed."));
          }}
        >
          <input
            className={field}
            placeholder="Email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className={field}
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <M3Button type="submit" variant="filled" className="w-full">
            Continue
          </M3Button>
        </form>

        <div className="mt-8 rounded-3xl bg-accent p-6 text-accent-foreground">
          <p className="inline-flex items-center gap-2 text-sm font-medium">
            <Icon name="key" className="text-[18px]" />
            Developer access
          </p>
          <p className="mt-2 text-[15px] leading-relaxed">
            Use <strong>developer</strong> as the email and the developer password to unlock article
            editing.
          </p>
        </div>
      </Reveal>
    </div>
  );
}
