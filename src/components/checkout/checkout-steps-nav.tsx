export type CheckoutStep = "identificacao" | "endereco" | "entrega" | "pagamento" | "confirmacao";

const STEPS: { key: CheckoutStep; label: string }[] = [
  { key: "identificacao", label: "Identificação" },
  { key: "endereco", label: "Endereço" },
  { key: "entrega", label: "Entrega" },
  { key: "pagamento", label: "Pagamento" },
  { key: "confirmacao", label: "Confirmação" },
];

export function CheckoutStepsNav({ current }: { current: CheckoutStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);
  const progress = ((currentIndex + 1) / STEPS.length) * 100;

  return (
    <div className="mb-10">
      {/* Compact single-line progress for small screens */}
      <div className="sm:hidden">
        <p className="label-caps mb-2 text-xs text-graphite">
          Passo {currentIndex + 1} de {STEPS.length} · {STEPS[currentIndex].label}
        </p>
        <div className="h-1 w-full bg-mist">
          <div className="h-1 bg-petrol transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Full stepper for larger screens */}
      <ol className="hidden flex-wrap items-center gap-x-2 gap-y-2 text-xs sm:flex">
        {STEPS.map((step, i) => (
          <li key={step.key} className="flex items-center gap-2">
            <span
              className={`label-caps flex items-center gap-1.5 ${
                i <= currentIndex ? "text-paper" : "text-graphite/60"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                  i < currentIndex
                    ? "bg-petrol text-ink"
                    : i === currentIndex
                      ? "bg-petrol text-ink"
                      : "border border-paper/15 text-graphite"
                }`}
              >
                {i < currentIndex ? "✓" : i + 1}
              </span>
              {step.label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-paper/15" aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </div>
  );
}
