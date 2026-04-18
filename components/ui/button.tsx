import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const base =
  "inline-flex items-center justify-center font-medium tracking-tight transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-botanical focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

const variants: Record<Variant, string> = {
  primary:
    "bg-ink text-paper hover:bg-botanical active:translate-y-px",
  secondary:
    "bg-transparent text-ink border border-ink/20 hover:border-ink/60 hover:bg-ink/5",
  ghost: "bg-transparent text-ink hover:bg-ink/5",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm rounded-xs",
  md: "h-11 px-6 text-[15px] rounded-xs",
  lg: "h-14 px-8 text-base rounded-xs",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  )
);
Button.displayName = "Button";
