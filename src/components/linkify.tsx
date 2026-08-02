import { Fragment } from "react";

const URL_RE = /((?:https?:\/\/|www\.)[^\s<>()]+[^\s<>().,!?:;'"]|[\w.+-]+@[\w-]+\.[\w.]+)/gi;

/** Renders text with any URL or email turned into a clickable link. */
export function Linkify({ text, className }: { text: string; className?: string }) {
  const parts = text.split(URL_RE);

  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        const isEmail = !/^(https?:\/\/|www\.)/i.test(part);
        const href = isEmail
          ? `mailto:${part}`
          : part.startsWith("http")
            ? part
            : `https://${part}`;
        return (
          <a
            key={i}
            href={href}
            target={isEmail ? undefined : "_blank"}
            rel={isEmail ? undefined : "noopener noreferrer"}
            className={
              className ??
              "font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
            }
          >
            {part}
          </a>
        );
      })}
    </>
  );
}
