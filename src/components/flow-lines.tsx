type FlowLinesProps = {
  className?: string;
  variant?: "light" | "dark";
};

/**
 * The brand's proprietary graphic element: continuous lines evoking
 * movement, waves and flow. Reused across banners, footer and cards.
 */
export function FlowLines({ className = "", variant = "light" }: FlowLinesProps) {
  const stroke = variant === "light" ? "#ffffff" : "#111111";
  return (
    <svg
      viewBox="0 0 1200 600"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <path
        d="M-50 420 C 150 340, 300 500, 480 400 S 780 260, 950 380 S 1180 480, 1300 380"
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        opacity="0.6"
      />
      <path
        d="M-50 300 C 180 220, 340 380, 520 280 S 800 140, 980 260 S 1180 340, 1300 240"
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        opacity="0.4"
      />
      <path
        d="M-50 180 C 200 120, 360 240, 560 160 S 820 60, 1000 160 S 1180 220, 1300 140"
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        opacity="0.25"
      />
    </svg>
  );
}
