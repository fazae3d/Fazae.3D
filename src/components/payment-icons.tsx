const ITEMS = [
  {
    label: "Pix",
    icon: (
      <path d="M13 2 4 13h6l-1 9 9-11h-6l1-9Z" />
    ),
  },
  {
    label: "Cartão",
    icon: (
      <>
        <rect x="2.5" y="5.5" width="19" height="13" rx="1.5" />
        <path d="M2.5 10h19" />
      </>
    ),
  },
  {
    label: "Boleto",
    icon: (
      <>
        <path d="M3 4v16M6 4v16M8.5 4v16M13 4v16M15.5 4v16M18 4v16M21 4v16" />
      </>
    ),
  },
];

/** Generic, non-trademarked glyphs — a stand-in for real payment-brand logos. */
export function PaymentIcons({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {ITEMS.map((item) => (
        <span key={item.label} className="label-caps flex items-center gap-1.5 text-[10px]">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            {item.icon}
          </svg>
          {item.label}
        </span>
      ))}
    </div>
  );
}
