import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { SITE_URL } from "@/lib/site-config";
import { companyAddress, DEFAULT_RULES, type StoreRules } from "@/lib/store-rules";
import { formatPrice } from "@/lib/format";
import { formatPhone } from "@/lib/br-format";
import { daysUntil, formatStoreDate, quoteCardTerms, quoteNumberLabel, quoteSavings, type Quote } from "@/lib/quote";
import { QUOTE_PDF_LOGO } from "@/lib/quote-pdf-logo";
import type { QuotePix } from "@/lib/pix";

const INK = "#111111";
const LIME = "#B6FF00";
const OLIVE = "#4D6B32";
const PAPER = "#F4F4F0";
const LINE = "#DCDCD4";
const MUTED = "#5E5E58";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9.5, color: INK, paddingTop: 30, paddingBottom: 56 },
  header: { marginTop: -30, backgroundColor: INK, paddingHorizontal: 40, paddingTop: 28, paddingBottom: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logo: { width: 112, height: 34 },
  headRight: { alignItems: "flex-end" },
  eyebrow: { fontSize: 8, letterSpacing: 2, color: LIME, fontFamily: "Helvetica-Bold" },
  number: { fontSize: 20, color: "#FFFFFF", fontFamily: "Helvetica-Bold", marginTop: 3 },
  limeBar: { height: 4, backgroundColor: LIME },
  body: { paddingHorizontal: 40, paddingTop: 24 },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle: { fontSize: 9.5, color: MUTED, marginBottom: 18 },
  metaRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  metaBox: { flex: 1, backgroundColor: PAPER, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 12 },
  label: { fontSize: 7.5, letterSpacing: 1.4, color: OLIVE, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  strong: { fontFamily: "Helvetica-Bold" },
  small: { fontSize: 9, color: MUTED, lineHeight: 1.45 },
  thead: { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: INK, paddingBottom: 6 },
  th: { fontSize: 7.5, letterSpacing: 1.2, fontFamily: "Helvetica-Bold", color: MUTED },
  row: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: LINE },
  colNum: { width: 22 },
  colDesc: { flex: 1, paddingRight: 10 },
  colQty: { width: 36, textAlign: "right" },
  colUnit: { width: 70, textAlign: "right" },
  colTotal: { width: 76, textAlign: "right" },
  itemName: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  itemDetails: { fontSize: 8.5, color: MUTED, marginTop: 2, lineHeight: 1.4 },
  totalsWrap: { alignItems: "flex-end", marginTop: 14 },
  totals: { width: 240 },
  totalLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: { marginTop: 8, backgroundColor: INK, borderRadius: 4, paddingVertical: 11, paddingHorizontal: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  grandLabel: { color: "#FFFFFF", fontSize: 8.5, letterSpacing: 1.6, fontFamily: "Helvetica-Bold" },
  grandValue: { color: LIME, fontSize: 17, fontFamily: "Helvetica-Bold" },
  winBand: { backgroundColor: LIME, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  winLabel: { fontSize: 7.5, letterSpacing: 1.6, fontFamily: "Helvetica-Bold", color: INK },
  winValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: INK },
  winText: { fontSize: 9, color: INK, marginTop: 2 },
  strike: { textDecoration: "line-through", color: MUTED },
  block: { marginTop: 18 },
  blockText: { fontSize: 9.5, lineHeight: 1.5 },
  pixBox: { marginTop: 18, borderWidth: 1, borderColor: LIME, borderRadius: 4, padding: 12, flexDirection: "row", alignItems: "center" },
  pixQr: { width: 100, height: 100, marginRight: 14 },
  pixAmount: { fontFamily: "Helvetica-Bold", fontSize: 13, color: OLIVE, marginBottom: 3 },
  accept: { marginTop: 22, borderWidth: 1, borderColor: LINE, borderRadius: 4, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footer: { position: "absolute", bottom: 22, left: 40, right: 40, borderTopWidth: 0.5, borderTopColor: LINE, paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
  footText: { fontSize: 7.5, color: MUTED },
});

function Money({ value }: { value: number }) {
  return <Text>{formatPrice(value)}</Text>;
}

export type QuotePdfContext = {
  whatsappNumber: string;
  /** Dados da empresa (Regras da loja); sem eles, os padrões. */
  company?: StoreRules["company"];
  /** Pix do orçamento (QR code já gerado em imagem); sem ele, o PDF sai sem a área de Pix. */
  pix?: { data: QuotePix; qr: string };
};

export function QuotePdf({ quote, context }: { quote: Quote; context: QuotePdfContext }) {
  const label = quoteNumberLabel(quote.number);
  const savings = quoteSavings(quote);
  const cardTerms = quoteCardTerms(quote);
  const winParts = [
    savings.discount > 0 ? `desconto de ${savings.discountPct > 0 ? `${savings.discountPct}% (${formatPrice(savings.discount)})` : formatPrice(savings.discount)}` : "",
    savings.freeShipping ? "frete grátis" : "",
  ].filter(Boolean);
  const daysLeft = daysUntil(quote.validUntil);
  const COMPANY = context.company ?? DEFAULT_RULES.company;
  const address = companyAddress(COMPANY);
  const whatsapp = context.whatsappNumber.replace(/\D/g, "");
  const localWhats = whatsapp.startsWith("55") ? whatsapp.slice(2) : whatsapp;
  const identification = [COMPANY.legalName, COMPANY.cnpj ? `CNPJ ${COMPANY.cnpj}` : null, `${address}, CEP ${COMPANY.zip}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <Document title={`Orçamento ${label} para ${quote.customerName}`} author="Fazaê 3D" subject="Orçamento">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={QUOTE_PDF_LOGO} style={s.logo} />
          <View style={s.headRight}>
            <Text style={s.eyebrow}>ORÇAMENTO</Text>
            <Text style={s.number}>{label}</Text>
          </View>
        </View>
        <View style={s.limeBar} />

        <View style={s.body}>
          <Text style={s.title}>{quote.title ?? "Proposta de impressão 3D"}</Text>
          <Text style={s.subtitle}>
            Emitido em {formatStoreDate(quote.createdAt)} · Válido até {formatStoreDate(quote.validUntil)}
          </Text>

          {winParts.length > 0 ? (
            <View style={s.winBand}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={s.winLabel}>VOCÊ ESTÁ GANHANDO</Text>
                <Text style={s.winText}>
                  Neste orçamento: {winParts.join(" e ")}.{daysLeft >= 0 ? ` Condição válida até ${formatStoreDate(quote.validUntil)}.` : ""}
                </Text>
              </View>
              {savings.total > 0 ? (
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={s.winLabel}>ECONOMIA DE</Text>
                  <Text style={s.winValue}>{formatPrice(savings.total)}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={s.metaRow}>
            <View style={s.metaBox}>
              <Text style={s.label}>PARA</Text>
              <Text style={s.strong}>{quote.customerName}</Text>
              {quote.customerDocument ? <Text style={s.small}>CPF/CNPJ {quote.customerDocument}</Text> : null}
              {quote.customerPhone ? <Text style={s.small}>{quote.customerPhone}</Text> : null}
              {quote.customerEmail ? <Text style={s.small}>{quote.customerEmail}</Text> : null}
              {quote.customerAddress ? <Text style={s.small}>{quote.customerAddress}</Text> : null}
            </View>
            <View style={s.metaBox}>
              <Text style={s.label}>DE</Text>
              <Text style={s.strong}>{COMPANY.legalName}</Text>
              {COMPANY.cnpj ? <Text style={s.small}>CNPJ {COMPANY.cnpj}</Text> : null}
              <Text style={s.small}>{address}</Text>
              <Text style={s.small}>CEP {COMPANY.zip}</Text>
              {localWhats ? <Text style={s.small}>WhatsApp {formatPhone(localWhats)}</Text> : null}
            </View>
          </View>

          <View style={s.thead}>
            <Text style={[s.th, s.colNum]}>#</Text>
            <Text style={[s.th, s.colDesc]}>DESCRIÇÃO</Text>
            <Text style={[s.th, s.colQty]}>QTD</Text>
            <Text style={[s.th, s.colUnit]}>UNITÁRIO</Text>
            <Text style={[s.th, s.colTotal]}>TOTAL</Text>
          </View>
          {quote.items.map((item, index) => (
            <View key={index} style={s.row} wrap={false}>
              <Text style={[s.colNum, { color: MUTED }]}>{index + 1}</Text>
              <View style={s.colDesc}>
                <Text style={s.itemName}>{item.description}</Text>
                {item.details ? <Text style={s.itemDetails}>{item.details}</Text> : null}
              </View>
              <Text style={s.colQty}>{item.quantity}</Text>
              <Text style={s.colUnit}>
                <Money value={item.unitPrice} />
              </Text>
              <Text style={[s.colTotal, s.strong]}>
                <Money value={item.unitPrice * item.quantity} />
              </Text>
            </View>
          ))}

          <View style={s.totalsWrap} wrap={false}>
            <View style={s.totals}>
              <View style={s.totalLine}>
                <Text style={{ color: MUTED }}>Subtotal</Text>
                <Money value={quote.subtotal} />
              </View>
              {quote.discount > 0 ? (
                <View style={s.totalLine}>
                  <Text style={{ color: OLIVE, fontFamily: "Helvetica-Bold" }}>
                    Desconto{savings.discountPct > 0 ? ` (${savings.discountPct}%)` : ""}
                  </Text>
                  <Text style={{ color: OLIVE, fontFamily: "Helvetica-Bold" }}>- {formatPrice(quote.discount)}</Text>
                </View>
              ) : null}
              <View style={s.totalLine}>
                <Text style={{ color: savings.freeShipping ? OLIVE : MUTED, fontFamily: savings.freeShipping ? "Helvetica-Bold" : "Helvetica" }}>Frete</Text>
                {savings.freeShipping ? (
                  <Text style={{ color: OLIVE, fontFamily: "Helvetica-Bold" }}>
                    {savings.shippingSaved > 0 ? <Text style={s.strike}>{formatPrice(savings.shippingSaved)}</Text> : null}
                    {savings.shippingSaved > 0 ? "  " : ""}GRÁTIS
                  </Text>
                ) : (
                  <Text>{quote.shipping > 0 ? formatPrice(quote.shipping) : "A combinar / retirada"}</Text>
                )}
              </View>
              <View style={s.grand}>
                <View>
                  <Text style={s.grandLabel}>TOTAL</Text>
                  {savings.total > 0 ? (
                    <Text style={{ color: "#A6A6A0", fontSize: 8, marginTop: 2, textDecoration: "line-through" }}>{formatPrice(savings.fullPrice)}</Text>
                  ) : null}
                </View>
                <Text style={s.grandValue}>{formatPrice(quote.total)}</Text>
              </View>
            </View>
          </View>

          {quote.deliveryTime ? (
            <View style={s.block} wrap={false}>
              <Text style={s.label}>PRAZO DE ENTREGA</Text>
              <Text style={s.blockText}>{quote.deliveryTime}</Text>
            </View>
          ) : null}
          {quote.paymentTerms ? (
            <View style={s.block} wrap={false}>
              <Text style={s.label}>CONDIÇÕES DE PAGAMENTO</Text>
              <Text style={s.blockText}>{quote.paymentTerms}</Text>
            </View>
          ) : null}
          {quote.notes ? (
            <View style={s.block} wrap={false}>
              <Text style={s.label}>OBSERVAÇÕES</Text>
              <Text style={s.blockText}>{quote.notes}</Text>
            </View>
          ) : null}

          {context.pix ? (
            <View style={s.pixBox} wrap={false}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={context.pix.qr} style={s.pixQr} />
              <View style={{ flex: 1 }}>
                <Text style={s.label}>PAGAMENTO POR PIX</Text>
                {context.pix.data.amount > 0 ? (
                  <>
                    <Text style={s.pixAmount}>
                      {context.pix.data.pct >= 100 ? "Valor total" : `Sinal de ${context.pix.data.pct}%`}: {formatPrice(context.pix.data.amount)}
                    </Text>
                    {context.pix.data.pct < 100 && context.pix.data.remaining > 0 ? (
                      <Text style={s.small}>Restante de {formatPrice(context.pix.data.remaining)} antes do envio ou da retirada.</Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={s.pixAmount}>Digite o valor combinado no app</Text>
                )}
                <Text style={[s.small, { marginTop: 4 }]}>Aponte a câmera do app do seu banco para o QR code.</Text>
                <Text style={s.small}>Chave Pix: {context.pix.data.key}</Text>
                <Text style={s.small}>Recebedor: {COMPANY.legalName}</Text>
                <Text style={[s.small, { marginTop: 3 }]}>Para copiar o código do Pix, abra o link do orçamento enviado a você.</Text>
              </View>
            </View>
          ) : null}

          {cardTerms ? (
            <View style={s.pixBox} wrap={false}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>PAGAMENTO NO CARTÃO</Text>
                <Text style={s.pixAmount}>Total no cartão: {formatPrice(cardTerms.total)}</Text>
                <Text style={s.small}>{cardTerms.surcharge > 0 ? `Acréscimo do cartão: ${formatPrice(cardTerms.surcharge)}` : "Sem acréscimo no cartão"}</Text>
                {cardTerms.installments > 1 ? <Text style={s.small}>Parcelamento: {cardTerms.installments}x de {formatPrice(cardTerms.perInstallment)}</Text> : null}
                <Text style={[s.small, { marginTop: 3 }]}>Aprove pelo WhatsApp e combinamos o pagamento no cartão.</Text>
              </View>
            </View>
          ) : null}

          <View style={s.accept} wrap={false}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={s.strong}>Para aprovar este orçamento</Text>
              <Text style={s.small}>
                Responda a mensagem em que recebeu este arquivo ou chame a gente no WhatsApp
                {localWhats ? ` ${formatPhone(localWhats)}` : ""} informando o número {label}.{" "}
                {savings.total > 0
                  ? `Aprove até ${formatStoreDate(quote.validUntil)} para garantir sua economia de ${formatPrice(savings.total)}.`
                  : `Valores válidos até ${formatStoreDate(quote.validUntil)}.`}
              </Text>
            </View>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11, color: OLIVE }}>{label}</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footText}>{identification}</Text>
          <Text style={s.footText}>
            {SITE_URL.replace(/^https?:\/\//, "")} · {COMPANY.instagramUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, "@")}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderQuotePdf(quote: Quote, context: QuotePdfContext): Promise<Buffer> {
  return renderToBuffer(<QuotePdf quote={quote} context={context} />);
}
