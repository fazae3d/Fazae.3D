type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  className = "",
}: SectionHeadingProps) {
  return (
    <div className={`${align === "center" ? "text-center" : ""} ${className}`}>
      {eyebrow && <p className="label-caps text-xs text-petrol">{eyebrow}</p>}
      <h2 className="font-display mt-2 text-3xl leading-tight tracking-tight sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-3 max-w-xl text-graphite ${align === "center" ? "mx-auto" : ""}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
