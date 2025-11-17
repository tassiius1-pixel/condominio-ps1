import { supabase } from "./supabase";

export async function uploadPhoto(file: File): Promise<string> {
  const fileName = `${Date.now()}-${file.name}`;

  const { data, error } = await supabase.storage
    .from("photos")               // nome do bucket
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Erro ao fazer upload:", error);
    throw new Error("Falha ao enviar foto.");
  }

  // URL pública
  const { data: publicUrlData } = supabase.storage
    .from("photos")
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}
