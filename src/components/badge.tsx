type BadgeProps = {
  children: React.ReactNode;
  tone?: "ink" | "petrol" | "sand";
};

const TONE_CLASSES: Record<NonNullable<BadgeProps["tone"]>, string> = {
  ink: "bg-ink text-paper",
  petrol: "bg-petrol text-ink",
  sand: "bg-sand text-paper",
};

export function Badge({ children, tone = "ink" }: BadgeProps) {
  return (
    <span className={`label-caps inline-flex max-w-full items-center px-2.5 py-1 text-[10px] ${TONE_CLASSES[tone]}`}>
      <span className="truncate">{children}</span>
    </span>
  );
}
