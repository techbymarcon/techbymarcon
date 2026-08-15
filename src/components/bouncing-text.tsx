import { cn } from "@/lib/utils";

const BRAND_NAMES = ["Tech by Marcon", "TechByMarcon"];

type BrandProps = {
  text: string;
  className?: string | undefined;
  /** Paints a continuous brand gradient across the animated letters. */
  gradient?: boolean | undefined;
};

function BouncingBrand({ text, className, gradient }: BrandProps) {
  const chars = text.split("");
  const letters = chars.filter((c) => c !== " ").length;
  let letterIndex = 0;

  return (
    <span className={cn("inline whitespace-nowrap", className)}>
      {chars.map((char, i) => {
        if (char === " ") {
          return (
            <span key={i} className="inline-block">
              &nbsp;
            </span>
          );
        }
        const idx = letterIndex;
        letterIndex++;
        const style: React.CSSProperties = {
          animationDelay: `${idx * 0.1}s`,
        };
        if (gradient) {
          style.backgroundSize = `${letters * 100}% 100%`;
          style.backgroundPosition = `${letters > 1 ? (idx / (letters - 1)) * 100 : 0}% 0`;
        }
        return (
          <span
            key={i}
            className={cn("brand-letter", gradient && "brand-letter-gradient")}
            style={style}
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
  gradient,
}: {
  children: string;
  className?: string | undefined;
  gradient?: boolean | undefined;
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
          <BouncingBrand text={brand} gradient={gradient} />
          {after}
        </span>
      );
    }
  }
  return <span className={className}>{text}</span>;
}
