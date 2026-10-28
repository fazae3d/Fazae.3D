import QRCode from "qrcode";

/** QR code (imagem PNG em data URL) do Pix "copia e cola". */
export async function pixQrDataUrl(payload: string, width = 360): Promise<string> {
  return QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 2, width, color: { dark: "#111111", light: "#FFFFFF" } });
}
