import { supabase } from "./supabase";

export async function uploadPhoto(file: File): Promise<string> {
  const filePath = `${Date.now()}-${file.name}`;

  const { data, error } = await supabase.storage
    .from("pendencias")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Erro no upload:", error);
    throw error;
  }

  const { data: publicUrl } = supabase.storage
    .from("pendencias")
    .getPublicUrl(filePath);

  return publicUrl.publicUrl;
}
