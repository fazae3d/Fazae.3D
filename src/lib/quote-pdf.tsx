import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { COMPANY, INSTAGRAM_URL, SITE_URL } from "@/lib/site-config";
import { formatPrice } from "@/lib/format";
import { formatPhone } from "@/lib/br-format";
import { formatStoreDate, quoteNumberLabel, type Quote } from "@/lib/quote";
import { QUOTE_PDF_LOGO } from "@/lib/quote-pdf-logo";

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
  block: { marginTop: 18 },
  blockText: { fontSize: 9.5, lineHeight: 1.5 },
  accept: { marginTop: 22, borderWidth: 1, borderColor: LINE, borderRadius: 4, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footer: { position: "absolute", bottom: 22, left: 40, right: 40, borderTopWidth: 0.5, borderTopColor: LINE, paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
  footText: { fontSize: 7.5, color: MUTED },
});

function Money({ value }: { value: number }) {
  return <Text>{formatPrice(value)}</Text>;
}

export type QuotePdfContext = {
  whatsappNumber: string;
};

export function QuotePdf({ quote, context }: { quote: Quote; context: QuotePdfContext }) {
  const label = quoteNumberLabel(quote.number);
  const whatsapp = context.whatsappNumber.replace(/\D/g, "");
  const localWhats = whatsapp.startsWith("55") ? whatsapp.slice(2) : whatsapp;
  const identification = [COMPANY.legalName, COMPANY.cnpj ? `CNPJ ${COMPANY.cnpj}` : null, `${COMPANY.address}, CEP ${COMPANY.zip}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <Document title={`Orçamento ${label} — ${quote.customerName}`} author="Fazaê 3D" subject="Orçamento">
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
              <Text style={s.small}>{COMPANY.address}</Text>
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
                  <Text style={{ color: MUTED }}>Desconto</Text>
                  <Text>- {formatPrice(quote.discount)}</Text>
                </View>
              ) : null}
              <View style={s.totalLine}>
                <Text style={{ color: MUTED }}>Frete</Text>
                <Text>{quote.shipping > 0 ? formatPrice(quote.shipping) : "A combinar / retirada"}</Text>
              </View>
              <View style={s.grand}>
                <Text style={s.grandLabel}>TOTAL</Text>
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

          <View style={s.accept} wrap={false}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={s.strong}>Para aprovar este orçamento</Text>
              <Text style={s.small}>
                Responda a mensagem em que recebeu este arquivo ou chame a gente no WhatsApp
                {localWhats ? ` ${formatPhone(localWhats)}` : ""} informando o número {label}. Valores válidos até{" "}
                {formatStoreDate(quote.validUntil)}.
              </Text>
            </View>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11, color: OLIVE }}>{label}</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footText}>{identification}</Text>
          <Text style={s.footText}>
            {SITE_URL.replace(/^https?:\/\//, "")} · {INSTAGRAM_URL.replace(/^https?:\/\/(www\.)?instagram\.com\//, "@")}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderQuotePdf(quote: Quote, context: QuotePdfContext): Promise<Buffer> {
  return renderToBuffer(<QuotePdf quote={quote} context={context} />);
}
