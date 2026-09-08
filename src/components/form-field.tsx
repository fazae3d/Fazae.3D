import type { InputHTMLAttributes } from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function FormField({ label, error, id, className = "", ...rest }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label-caps text-[11px] text-graphite">
        {label}
      </label>
      <input
        id={id}
        className={`border bg-mist px-3 py-2.5 text-base text-paper outline-none transition-colors placeholder:text-paper/40 focus:border-petrol sm:text-sm ${
          error ? "border-red-500" : "border-paper/15"
        } ${className}`}
        {...rest}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
