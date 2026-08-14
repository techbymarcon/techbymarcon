/**
 * Forum language filter.
 *
 * Shared by the composer (live warning next to the post button) and the server
 * (hard rejection), so both sides always agree on what counts as a swear word.
 */

const WORDS = [
  "anal",
  "anus",
  "arse",
  "arsehole",
  "ass",
  "asshole",
  "bastard",
  "bitch",
  "bitches",
  "blowjob",
  "bollocks",
  "boner",
  "bullshit",
  "clit",
  "cock",
  "coon",
  "crap",
  "cum",
  "cunt",
  "dick",
  "dickhead",
  "dildo",
  "douche",
  "dyke",
  "fag",
  "faggot",
  "fuck",
  "fucker",
  "fucking",
  "fuk",
  "goddamn",
  "handjob",
  "hoe",
  "jerkoff",
  "jizz",
  "kike",
  "motherfucker",
  "nigga",
  "nigger",
  "nutsack",
  "paki",
  "piss",
  "prick",
  "pussy",
  "queer",
  "retard",
  "retarded",
  "rape",
  "rapist",
  "shit",
  "shitty",
  "slut",
  "spic",
  "tits",
  "titties",
  "twat",
  "wank",
  "wanker",
  "whore",
];

/** Fold common letter-swaps (f*ck, sh1t, @ss) back to plain letters. */
function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/[3]/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/[0]/g, "o")
    .replace(/[$5]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/[^a-z]+/g, " ");
}

/** The first swear word found in the text, or null when it's clean. */
export function findProfanity(...parts: (string | null | undefined)[]): string | null {
  const words = normalize(parts.filter(Boolean).join(" ")).split(/\s+/).filter(Boolean);
  const set = new Set(WORDS);
  for (const word of words) {
    if (set.has(word)) return word;
    // Strip simple plural/possessive endings before checking again.
    const stem = word.replace(/(s|es|ed|ing)$/, "");
    if (stem.length > 2 && set.has(stem)) return stem;
  }
  return null;
}

export const hasProfanity = (...parts: (string | null | undefined)[]) =>
  findProfanity(...parts) !== null;

export const PROFANITY_WARNING =
  "You included a swear word! The post has a high chance of being deleted.";

export const PROFANITY_REJECTION =
  "Your post contained a swear word, so it was deleted. Please keep the forum clean.";

/**
 * Escalating live warning for the worst slur, used by the forum composer while
 * the user is still typing. Returns the strongest stage found in the text.
 */
export type SlurStage = { message: string; shake: number };

const SLUR_STAGES: { prefix: string; stage: SlurStage }[] = [
  { prefix: "nig", stage: { message: "Be careful what you type here.", shake: 1 } },
  {
    prefix: "nigg",
    stage: {
      message: "Not only will your post get deleted, but also your account will be banned.",
      shake: 25,
    },
  },
  {
    prefix: "nigga",
    stage: { message: "Don't you dare send that. I swear, you will be banned.", shake: 0 },
  },
  { prefix: "nigge", stage: { message: "TRUST ME! You do not want to do this.", shake: 75 } },
  { prefix: "nigger", stage: { message: "Don't send that. I swear to everyone.", shake: 0 } },
];

export function slurStage(...parts: (string | null | undefined)[]): SlurStage | null {
  const text = normalize(parts.filter(Boolean).join(" ")).replace(/\s+/g, "");
  let found: SlurStage | null = null;
  for (const { prefix, stage } of SLUR_STAGES) {
    if (text.includes(prefix)) found = stage;
  }
  return found;
}
