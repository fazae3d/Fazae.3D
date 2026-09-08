export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = Infinity,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="inline-flex items-center border border-graphite/40">
      <button
        type="button"
        aria-label="Diminuir quantidade"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="h-9 w-9 text-graphite transition-colors hover:text-petrol"
      >
        −
      </button>
      <span className="w-8 text-center text-sm">{value}</span>
      <button
        type="button"
        aria-label="Aumentar quantidade"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="h-9 w-9 text-graphite transition-colors hover:text-petrol disabled:cursor-not-allowed disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
