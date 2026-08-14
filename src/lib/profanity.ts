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
