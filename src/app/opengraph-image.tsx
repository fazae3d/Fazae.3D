import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Fazaê. Você imagina. A gente cria.";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          background: "#111111",
          padding: "90px",
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#b6ff00",
            marginBottom: 24,
          }}
        >
          Impressão 3D & Ideias
        </div>
        <div style={{ display: "flex", fontSize: 140, fontWeight: 700, color: "#f4f4f0", lineHeight: 1 }}>
          FAZAÊ
        </div>
        <div style={{ fontSize: 38, marginTop: 28, color: "#f4f4f0", opacity: 0.85 }}>
          Você imagina. A gente cria.
        </div>
      </div>
    ),
    { ...size },
  );
}
