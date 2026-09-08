import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-petrol text-ink hover:bg-paper",
  secondary: "border border-paper/40 text-paper hover:border-petrol hover:text-petrol",
  ghost: "text-paper hover:text-petrol",
};

const BASE =
  "label-caps inline-flex items-center justify-center gap-2 px-7 py-3.5 text-xs transition-colors duration-300";

type CommonProps = {
  variant?: Variant;
  className?: string;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(BASE, VARIANT_CLASSES[variant], className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
  onClick,
}: CommonProps & { href: string; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} className={cn(BASE, VARIANT_CLASSES[variant], className)}>
      {children}
    </Link>
  );
}
