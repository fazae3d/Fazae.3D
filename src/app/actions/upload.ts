"use server";

import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { withMutationFallback } from "@/lib/db-fallback";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const BUCKET = "product-images";

export type UploadImageResult = { success: true; url: string } | { success: false; error: string };

export async function uploadImageAction(formData: FormData): Promise<UploadImageResult> {
  const session = await auth();
  if (!ADMIN_AUTH_DISABLED && session?.user?.role !== "admin") {
    return { success: false, error: "Acesso restrito ao administrador." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "Nenhum arquivo enviado." };
  }

  const extension = EXTENSION_BY_TYPE[file.type];
  if (!extension) {
    return { success: false, error: "Envie uma imagem em JPG, PNG, WEBP ou GIF." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: "A imagem deve ter no máximo 5 MB." };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: "Upload de imagens não configurado no servidor." };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const filename = `${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje o upload real falharia sem Supabase configurado.
  return withMutationFallback(async () => {
    const { error } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
      contentType: file.type,
      cacheControl: "31536000",
    });
    if (error) {
      return { success: false, error: "Falha ao enviar a imagem. Tente novamente." };
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    return { success: true, url: data.publicUrl };
  });
}
