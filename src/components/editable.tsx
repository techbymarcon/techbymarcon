import type { ReactNode } from "react";
import { Icon, M3Button } from "@/components/m3";
import { cn } from "@/lib/utils";

export function Field({
  label,
  value,
  onChange,
  multiline,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  className?: string;
}) {
  const base =
    "w-full rounded-2xl border border-border bg-surface-container-low px-4 py-3 text-[15px] text-foreground outline-none focus:border-primary";
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(base, "resize-y")}
        />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={base} />
      )}
    </label>
  );
}

export function EditToolbar({
  editing,
  onToggle,
  onReset,
  children,
}: {
  editing: boolean;
  onToggle: () => void;
  onReset: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-center gap-3 rounded-3xl bg-surface-container p-4 elevation-1">
      <span className="grid size-10 place-items-center rounded-2xl bg-primary-container text-on-primary-container">
        <Icon name="build" />
      </span>
      <span className="text-[15px] font-medium">Developer mode</span>
      <div className="ml-auto flex flex-wrap gap-2">
        {children}
        {editing && (
          <M3Button variant="text" onClick={onReset}>
            <Icon name="restart_alt" className="text-[20px]" />
            Reset
          </M3Button>
        )}
        <M3Button variant={editing ? "filled" : "tonal"} className="h-11 px-5" onClick={onToggle}>
          <Icon name={editing ? "check" : "edit"} className="text-[20px]" />
          {editing ? "Done" : "Edit page"}
        </M3Button>
      </div>
    </div>
  );
}
