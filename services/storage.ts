import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "./firebase";

const storage = getStorage(app);

export async function uploadPhoto(file: File): Promise<string> {
  // Pasta "photos" + timestamp + nome original
  const fileRef = ref(storage, `photos/${Date.now()}-${file.name}`);

  // Envia para o Storage
  await uploadBytes(fileRef, file);

  // Pega URL pública
  return await getDownloadURL(fileRef);
}
