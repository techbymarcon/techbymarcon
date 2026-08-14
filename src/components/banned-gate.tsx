import { M3Button, Icon } from "@/components/m3";
import { useAuth } from "@/lib/auth";
import type { ReactNode } from "react";

/** Banned members can't use the site — they only see this screen and a sign-out button. */
export function BannedGate({ children }: { children: ReactNode }) {
  const { banned, banReason, signOut } = useAuth();

  if (!banned) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-[520px] rounded-[32px] border border-border/60 glass p-8 text-center elevation-2">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/12 text-destructive">
          <Icon name="gavel" className="text-[32px]" />
        </span>
        <h1 className="mt-6 font-display text-[30px] font-medium">
          Your account has been banned.
        </h1>
        <p className="mt-3 text-[15px] text-muted-foreground">
          {banReason
            ? `Reason: ${banReason}`
            : "No reason was provided by the moderation team."}
        </p>
        <M3Button className="mt-8" onClick={() => signOut()}>
          <Icon name="logout" className="text-[20px]" />
          Sign out
        </M3Button>
      </div>
    </div>
  );
}
