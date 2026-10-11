"use server";

import { z } from "zod";
import { isValidBrPhone } from "@/lib/br-format";
import { notifyOwner } from "@/lib/owner-notify";
import { getClientIp, rateLimit } from "@/server/rate-limit";
import { createCustomOrderRequest } from "@/server/repositories/custom-order-request-repository";

const customOrderSchema = z.object({
  name: z.string().min(2, "Informe seu nome.").max(100),
  phone: z.string().refine(isValidBrPhone, "Informe um WhatsApp com DDD (ex: (84) 99999-9999)."),
  email: z.string().email("E-mail inválido.").max(200).optional().or(z.literal("")),
  description: z.string().min(10, "Descreva o que você quer criar (mínimo de 10 caracteres).").max(2000, "Descrição muito longa."),
  material: z.string().max(60).optional(),
  color: z.string().max(60).optional(),
  quantity: z.number().int().min(1).max(999),
  deadline: z.string().max(100).optional(),
  referenceProductSlug: z.string().max(120).optional(),
});

export type SubmitCustomOrderResult = { success: true } | { success: false; error: string };

/** Grava o pedido sob encomenda como lead (aparece em Encomendas no painel) e avisa o dono; o WhatsApp continua sendo aberto pelo formulário. */
export async function submitCustomOrderAction(input: unknown): Promise<SubmitCustomOrderResult> {
  const limited = await rateLimit(`custom-order:${await getClientIp()}`, 5, 30 * 60 * 1000);
  if (!limited.allowed) return { success: false, error: "Muitos pedidos em pouco tempo. Tente de novo em alguns minutos." };

  const parsed = customOrderSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const data = parsed.data;

  try {
    await createCustomOrderRequest({
      name: data.name.trim(),
      phone: data.phone.replace(/\D/g, ""),
      email: data.email || undefined,
      description: data.description.trim(),
      referenceProductSlug: data.referenceProductSlug || undefined,
      materialPreference: data.material && !data.material.startsWith("Não sei") ? data.material : undefined,
      colorPreference: data.color || undefined,
      quantity: data.quantity,
      desiredDeadline: data.deadline || undefined,
    });
  } catch (error) {
    console.error("[personalizado] falha ao gravar o pedido sob encomenda", error);
    return { success: false, error: "Não foi possível registrar seu pedido agora. Tente de novo ou fale pelo WhatsApp." };
  }

  await notifyOwner(`Novo pedido sob encomenda de ${data.name.trim()}`, [
    `WhatsApp: ${data.phone}${data.email ? ` · E-mail: ${data.email}` : ""}`,
    `Quantidade: ${data.quantity}${data.material ? ` · Material: ${data.material}` : ""}${data.color ? ` · Cor: ${data.color}` : ""}`,
    data.description.trim(),
    "Veja em Encomendas no painel.",
  ]);
  return { success: true };
}
