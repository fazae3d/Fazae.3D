"use client";

import { useWishlist } from "@/contexts/wishlist-context";

export function WishlistButton({
  slug,
  className = "",
  size = "md",
}: {
  slug: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const { has, toggle } = useWishlist();
  const active = has(slug);
  const dim = size === "sm" ? "h-10 w-10" : "h-11 w-11";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(slug);
      }}
      aria-pressed={active}
      aria-label={active ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={`flex ${dim} items-center justify-center rounded-full border border-mist bg-paper/90 transition-colors duration-300 hover:border-petrol active:scale-90 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        width={size === "sm" ? 17 : 19}
        height={size === "sm" ? 17 : 19}
        fill={active ? "#0f5b5b" : "none"}
        stroke={active ? "#0f5b5b" : "#111111"}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20.2c-.3 0-.6-.1-.8-.3-1.9-1.5-3.7-2.9-5.2-4.4C3.7 13.2 2 11 2 8.5 2 6 4 4 6.5 4c1.6 0 3 .8 3.9 2 .1.2.4.2.5 0 .9-1.2 2.3-2 3.9-2C17.3 4 19.5 6 19.5 8.5c0 2.5-1.7 4.7-3.9 6.9-1.5 1.5-3.3 2.9-5.2 4.4-.2.2-.5.3-.8.3Z" />
      </svg>
    </button>
  );
}
