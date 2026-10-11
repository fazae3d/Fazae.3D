"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ background: "#111111", color: "#F4F4F0", fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "96px 16px" }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Algo deu errado</h1>
        <p style={{ color: "#A6A6A0", marginTop: 16 }}>Tivemos um problema inesperado. Tente de novo em instantes.</p>
        <button
          type="button"
          onClick={reset}
          style={{ marginTop: 32, background: "#B6FF00", color: "#111111", border: 0, borderRadius: 999, padding: "16px 32px", fontWeight: 700, cursor: "pointer" }}
        >
          Tentar de novo
        </button>
      </body>
    </html>
  );
}
