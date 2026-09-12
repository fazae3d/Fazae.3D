"use client";

import { useEffect, useRef, useState } from "react";

export type SelectOption = { value: string; label: string };

/**
 * Custom-built to replace native <select>: Chromium's own option-list popup
 * doesn't reliably follow `color-scheme`/authored colors for text contrast
 * in every environment, so a native select can render unreadable (light
 * text on a light popup) even when every CSS property computes correctly.
 * This renders entirely with our own theme tokens instead, so it can never
 * fall back to the browser's own popup chrome.
 */
export function Select({
  value,
  onChange,
  options,
  id,
  className = "",
  placeholder,
  disabled,
  menuClassName = "border border-mist bg-paper text-ink",
  hoverClassName = "hover:bg-mist/60",
  selectedOptionClassName = "bg-petrol/10 text-petrol",
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  id?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Background/border/text for the option-list popup — override for surfaces with an inverted color scheme (e.g. the always-dark storefront). */
  menuClassName?: string;
  hoverClassName?: string;
  selectedOptionClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointer(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between text-left outline-none transition-colors disabled:opacity-60 ${
          className || "border border-mist bg-paper px-3 py-2 text-sm text-ink focus:border-petrol"
        }`}
      >
        <span className={selected ? "" : "text-graphite"}>{selected?.label ?? placeholder ?? "Selecione"}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`ml-2 h-3.5 w-3.5 shrink-0 text-graphite transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul className={`absolute z-20 mt-1 max-h-60 w-full overflow-auto py-1 text-sm shadow-lg ${menuClassName}`}>
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`block w-full px-3 py-2 text-left transition-colors ${hoverClassName} ${
                  opt.value === value ? selectedOptionClassName : ""
                }`}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
