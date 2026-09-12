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

export async function withMutationFallback<T extends { success: boolean }>(
  fn: () => Promise<T>,
  errorMessage = "Configure o banco de dados (Supabase) para salvar alterações.",
): Promise<T> {
  try {
    return await fn();
  } catch {
    return { success: false, error: errorMessage } as unknown as T;
  }
}
