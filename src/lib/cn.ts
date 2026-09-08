import { twMerge } from "tailwind-merge";

/**
 * Plain string concatenation (`${base} ${className}`) doesn't resolve
 * conflicting Tailwind utilities — e.g. base "text-paper" vs an override
 * "text-ink" both land in the compiled CSS, and whichever comes later in
 * Tailwind's *generated* stylesheet wins, not whichever comes later in
 * the className string. That silently produced invisible white-on-white
 * button text. twMerge resolves same-property conflicts deterministically
 * in argument order — last one wins, as the call site actually intends.
 */
export function cn(...classLists: Array<string | undefined | false | null>) {
  return twMerge(classLists.filter(Boolean).join(" "));
}
