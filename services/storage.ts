import { supabase } from "./supabase";

export async function uploadPhoto(file: File): Promise<string> {
  const filePath = `pendencias/${Date.now()}-${file.name}`;

  const { error } = await supabase.storage
    .from("pendencias")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Erro no upload:", error);
    throw error;
  }

  // Gera a URL pública
  const { data } = supabase.storage
    .from("pendencias")
    .getPublicUrl(filePath);

  return data.publicUrl;
}
