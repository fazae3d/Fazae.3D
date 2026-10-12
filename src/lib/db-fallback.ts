/**
 * TODO(fase DB): remove este arquivo quando a Fazaê tiver o próprio banco —
 * hoje toda leitura/escrita real falharia sem Supabase configurado.
 */
export async function withReadFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

/**
 * Same as withReadFallback, but also reports whether the fallback was
 * actually used — for screens (like the admin dashboard) that should warn
 * when they're showing seed data instead of erroring silently.
 */
export async function readWithStatus<T>(fn: () => Promise<T>, fallback: T): Promise<{ data: T; usedFallback: boolean }> {
  try {
    return { data: await fn(), usedFallback: false };
  } catch {
    return { data: fallback, usedFallback: true };
  }
}

/** Traduz o erro do Prisma numa frase útil; o resto vira uma mensagem genérica (o detalhe vai para o log). */
function describeMutationError(error: unknown, fallbackMessage: string): string {
  const code = (error as { code?: string } | null)?.code;
  if (code === "P2002") return "Já existe um registro com esses dados.";
  if (code === "P2003") return "Este item está em uso em outro cadastro (pedido, produção, consignação...) e não pode ser alterado ou excluído por enquanto.";
  if (code === "P2025") return "Registro não encontrado. Atualize a página e tente de novo.";
  // Código curto (ex.: P2022, PrismaClientValidationError) para o admin informar ao suporte; o detalhe completo fica no log do servidor.
  const label = code ?? (error as { name?: string } | null)?.name;
  return label && label !== "Error" ? `${fallbackMessage} (código: ${label})` : fallbackMessage;
}

export async function withMutationFallback<T extends { success: boolean }>(
  fn: () => Promise<T>,
  errorMessage = "Não foi possível salvar agora. Tente de novo em instantes.",
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // Antes tudo virava "Configure o banco de dados (Supabase)", o que escondia o erro real (item em uso, dado duplicado...).
    console.error("[mutação] falhou", error);
    return { success: false, error: describeMutationError(error, errorMessage) } as unknown as T;
  }
}
