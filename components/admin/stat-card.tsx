import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
};

export function StatCard({ label, value, highlight, muted }: Props) {
  return (
    <div
      className={cn(
        "border rounded-sm p-5",
        highlight
          ? "border-botanical/40 bg-botanical/5"
          : "border-ink/10"
      )}
    >
      <p className="text-xs tracking-widest uppercase text-ink/50">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums tracking-tight",
          highlight
            ? "text-botanical"
            : muted
            ? "text-ink/50"
            : "text-ink"
        )}
      >
        {value}
      </p>
    </div>
  );
}
