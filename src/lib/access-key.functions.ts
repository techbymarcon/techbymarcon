import { createServerFn } from "@tanstack/react-start";
import {
  DEFAULT_FORUM_RULES,
  currentKey,
  forumRules,
  keyAllows,
  saveForumRules,
  type ForumRules,
  type KeyTier,
  type Scope,
} from "./access-key.server";

export type AccessKeyInfo = {
  key: string;
  tier: KeyTier;
  scopes: Scope[];
  issuedAt: number;
} | null;

/** The signed-in session's encrypted access key (minted on demand, gone at sign out). */
export const getAccessKey = createServerFn({ method: "GET" }).handler(
  async (): Promise<AccessKeyInfo> => {
    const current = await currentKey();
    if (!current) return null;
    return {
      key: current.key,
      tier: current.payload.tier,
      scopes: current.payload.scopes,
      issuedAt: current.payload.iat,
    };
  },
);

export const getForumRules = createServerFn({ method: "GET" }).handler(
  async (): Promise<ForumRules> => {
    try {
      return await forumRules();
    } catch {
      return DEFAULT_FORUM_RULES;
    }
  },
);

/** Only green (moderator) and gold (developer) keys may change posting limits. */
export const setForumRules = createServerFn({ method: "POST" })
  .inputValidator((data: { postCooldownSeconds: number; maxPostsPerDay: number }) => data)
  .handler(async ({ data }) => {
    if (!(await keyAllows("forum:ratelimit"))) {
      return { ok: false as const, error: "Your key does not allow changing post limits." };
    }
    const rules: ForumRules = {
      postCooldownSeconds: Math.min(86400, Math.max(0, Math.round(Number(data.postCooldownSeconds) || 0))),
      maxPostsPerDay: Math.min(500, Math.max(0, Math.round(Number(data.maxPostsPerDay) || 0))),
    };
    await saveForumRules(rules);
    return { ok: true as const, rules };
  });
