export function TrustBadges() {
  return (
    <div className="mt-4 space-y-2.5 border-t border-mist pt-4 text-[11px] text-graphite">
      <div className="flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-petrol">
          <rect x="4" y="10" width="16" height="10" rx="1.5" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
        <span>Compra segura: dados protegidos de ponta a ponta</span>
      </div>
      <div className="flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-petrol">
          <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
          <path d="M9.5 12l1.8 1.8L15 10.2" />
        </svg>
        <span>Pix, cartão e boleto no ambiente sandbox de testes</span>
      </div>
      <div className="flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-petrol">
          <path d="M3 12a9 9 0 1 0 9-9" />
          <path d="M3 5v5h5" />
        </svg>
        <span>Troca ou devolução grátis em até 7 dias</span>
      </div>
    </div>
  );
}
