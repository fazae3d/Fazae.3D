"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { openConversationAction } from "@/app/admin/conversas/actions";
import { useToast } from "@/components/admin/toast";

/**
 * Abre a conversa com o contato dentro do painel (Conversas), no lugar do link para o aplicativo do WhatsApp. Se não existir conversa
 * com o número, ela é criada. `text` já vem escrito na caixa de mensagem (nada é enviado até a pessoa clicar em Enviar).
 * `beforeOpen` roda antes de abrir (ex.: registrar que o cliente foi contactado).
 */
export function OpenInConversas({
  phone,
  name,
  text,
  className,
  children,
  beforeOpen,
}: {
  phone?: string | null;
  name?: string | null;
  text?: string;
  className?: string;
  children: ReactNode;
  beforeOpen?: () => Promise<void> | void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const hasPhone = Boolean((phone ?? "").replace(/\D/g, ""));

  const open = () => {
    startTransition(async () => {
      const result = await openConversationAction({ phone: phone ?? "", name: name ?? undefined });
      if (!result.success) {
        toast(result.error, "error");
        return;
      }
      await beforeOpen?.();
      router.push(`/admin/conversas?c=${result.id}${text ? `&texto=${encodeURIComponent(text)}` : ""}`);
    });
  };

  return (
    <button type="button" onClick={open} disabled={pending || !hasPhone} title={hasPhone ? "Abre a conversa no painel" : "Cadastre o telefone do cliente"} className={`${className ?? ""} disabled:opacity-60`}>
      {children}
    </button>
  );
}
