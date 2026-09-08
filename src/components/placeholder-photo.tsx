import { FlowLines } from "./flow-lines";

export type PlaceholderTone = "fitness" | "surf" | "street" | "lifestyle" | "ink" | "sand";
type Tone = PlaceholderTone;

const GRADIENTS: Record<Tone, string> = {
  fitness: "linear-gradient(145deg, #111111 0%, #0f5b5b 100%)",
  surf: "linear-gradient(145deg, #0f5b5b 0%, #d8cbb7 100%)",
  street: "linear-gradient(145deg, #111111 0%, #4a4a4a 60%, #666666 100%)",
  lifestyle: "linear-gradient(145deg, #111111 0%, #0f5b5b 55%, #d8cbb7 100%)",
  ink: "linear-gradient(145deg, #1c1c1c 0%, #111111 100%)",
  sand: "linear-gradient(145deg, #d8cbb7 0%, #b7a891 100%)",
};

type PlaceholderPhotoProps = {
  tone?: Tone;
  label?: string;
  sublabel?: string;
  className?: string;
  demoTag?: boolean;
  flowLines?: boolean;
};

/**
 * Stand-in for editorial photography during development. Every instance
 * is clearly marked DEMO so it can never be mistaken for real campaign
 * imagery once real photography is dropped in.
 */
export function PlaceholderPhoto({
  tone = "lifestyle",
  label,
  sublabel,
  className = "",
  demoTag = true,
  flowLines = true,
}: PlaceholderPhotoProps) {
  const isLight = tone === "sand";
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: GRADIENTS[tone] }}
    >
      {flowLines && (
        <FlowLines
          className="flow-lines-bg h-full w-full"
          variant={isLight ? "dark" : "light"}
        />
      )}
      {(label || sublabel) && (
        <div
          className={`absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4 sm:p-6 ${
            isLight ? "text-ink" : "text-paper"
          }`}
        >
          {sublabel && (
            <span className="label-caps text-[10px] opacity-70">{sublabel}</span>
          )}
          {label && <span className="font-display text-lg sm:text-xl">{label}</span>}
        </div>
      )}
      {demoTag && (
        <span
          className={`label-caps absolute right-3 top-3 rounded-sm border px-2 py-0.5 text-[9px] ${
            isLight ? "border-ink/30 text-ink/60" : "border-paper/30 text-paper/60"
          }`}
        >
          Demo
        </span>
      )}
    </div>
  );
}
