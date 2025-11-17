import { supabase } from "./supabase";

export async function uploadPhoto(file: File, folder: string) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName =
      `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const filePath = `${folder}/${fileName}`;

    const { error } = await supabase.storage
      .from("pendencias")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false, // NÃO sobrescreve
      });

    if (error) {
      console.error("Erro upload:", error);
      throw error;
    }

    // retornar URL pública
    const { data } = supabase.storage.from("pendencias").getPublicUrl(filePath);
    return data.publicUrl;

  } catch (err) {
    console.error("Erro ao enviar foto:", err);
    return null;
  }
}
