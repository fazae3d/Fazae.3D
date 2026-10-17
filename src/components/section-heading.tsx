type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
  /** Nível do título: use "h1" na única chamada principal da página. */
  as?: "h1" | "h2";
};

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  className = "",
  as: Heading = "h2",
}: SectionHeadingProps) {
  return (
    <div className={`${align === "center" ? "text-center" : ""} ${className}`}>
      {eyebrow && <p className="label-caps text-xs text-petrol">{eyebrow}</p>}
      <Heading className="font-display mt-2 text-3xl leading-tight tracking-tight sm:text-4xl">
        {title}
      </Heading>
      {subtitle && (
        <p className={`mt-3 max-w-xl text-graphite ${align === "center" ? "mx-auto" : ""}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
