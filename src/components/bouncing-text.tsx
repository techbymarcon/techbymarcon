import { cn } from "@/lib/utils";

const BRAND_NAMES = ["Tech by Marcon", "TechByMarcon"];

function BouncingBrand({ text, className }: { text: string; className?: string }) {
  let letterIndex = 0;
  return (
    <span className={cn("inline whitespace-nowrap", className)}>
      {text.split("").map((char, i) => {
        if (char === " ") {
          return (
            <span key={i} className="inline-block">
              &nbsp;
            </span>
          );
        }
        const delay = letterIndex * 0.1;
        letterIndex++;
        return (
          <span
            key={i}
            className="inline-block animate-letter-bounce"
            style={{ animationDelay: `${delay}s` }}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}

export function BouncingText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const text = children;
  for (const brand of BRAND_NAMES) {
    const idx = text.indexOf(brand);
    if (idx !== -1) {
      const before = text.slice(0, idx);
      const after = text.slice(idx + brand.length);
      return (
        <span className={cn("inline", className)}>
          {before}
          <BouncingBrand text={brand} />
          {after}
        </span>
      );
    }
  }
  return <span className={className}>{text}</span>;
}
