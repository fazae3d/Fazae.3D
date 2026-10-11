# Fazaê 3D

Loja de impressão 3D: vitrine, checkout com Mercado Pago (Pix, cartão e boleto), frete pelo Melhor Envio, entrega própria (motoboy) em Natal e Parnamirim, painel de gestão (pedidos, produção, estoque, finanças, consignação, precificação) e e-mails transacionais.

**Stack:** Next.js (App Router) · Prisma + Supabase Postgres · NextAuth · Mercado Pago · Melhor Envio · Resend · Vercel.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha os valores
npx prisma migrate deploy
npx prisma generate
npm run dev                  # http://localhost:3000
```

## Banco de dados

- Migrations ficam em `prisma/migrations` e são aplicadas à mão com `npx prisma migrate deploy` (o build da Vercel não roda migrations). **Aplique a migration antes de subir o código que depende dela.**
- O mesmo banco serve ao desenvolvimento e à produção: cuidado ao testar com dados reais.
- Não há contas de demonstração. Crie sua conta pelo site (`/cadastro`) e dê o papel de admin direto no banco:
  `UPDATE "User" SET role = 'admin' WHERE email = 'voce@exemplo.com';`

## Tarefas agendadas (Vercel Cron, ver `vercel.json`)

- `/api/cron/abandoned-carts`: lembrete de carrinho abandonado (1x/dia).
- `/api/cron/expire-pending-orders`: cancela pedidos sem pagamento após 4 dias e devolve o estoque.

Ambas exigem `CRON_SECRET` em produção.

## Regras importantes

- Preço, frete, desconto e Pix são **sempre recalculados no servidor** (`src/app/(storefront)/checkout/actions.ts`); o navegador só diz quais itens e qual forma de entrega.
- O pedido é gravado **antes** da cobrança; a baixa de estoque é atômica e é devolvida se o pagamento for recusado ou vencer.
- O webhook do Mercado Pago só avança o status do pedido e confere o valor pago.
