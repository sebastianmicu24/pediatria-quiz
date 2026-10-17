import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Caricamento delle immagini degli editor admin (quiz e blog) nel bucket
 * pubblico "quiz-images". Lato server soltanto, da chiamare dopo aver
 * verificato che l'utente sia un amministratore.
 *
 * Il sanitizzatore (src/lib/utils.ts) ammette solo gli URL di questo
 * bucket: niente SVG, data URL o immagini esterne.
 */

export const IMAGE_BUCKET = "quiz-images";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

let imageBucketEnsured = false;

/** Crea il bucket se non esiste (idempotente, serve solo la prima volta). */
async function ensureImageBucket(
  admin: ReturnType<typeof createAdminClient>
): Promise<void> {
  if (imageBucketEnsured) return;
  const { error } = await admin.storage.createBucket(IMAGE_BUCKET, {
    public: true,
    fileSizeLimit: MAX_IMAGE_BYTES,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
  });
  // Se esiste già va bene: l'upload funziona comunque.
  if (error && !/already exists|duplicate/i.test(error.message)) {
    return;
  }
  imageBucketEnsured = true;
}

/**
 * Il tipo dichiarato dal browser non basta: si controllano anche i primi
 * byte del file (firma PNG, JPEG o WebP), così un file di altro tipo con
 * l'estensione o il tipo cambiati viene rifiutato.
 */
function matchesImageSignature(bytes: Uint8Array, type: string): boolean {
  const startsWith = (signature: number[], offset = 0) =>
    signature.every((value, index) => bytes[offset + index] === value);

  if (type === "image/png") {
    return startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  if (type === "image/jpeg") return startsWith([0xff, 0xd8, 0xff]);
  if (type === "image/webp") {
    // "RIFF" .... "WEBP"
    return startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8);
  }
  return false;
}

export type UploadImageResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

/**
 * Valida e carica un'immagine (PNG/JPG/WebP fino a 5 MB) nella cartella
 * indicata del bucket e ne restituisce l'URL pubblico. Il nome del file è
 * generato dal server: quello scelto dall'utente non viene mai usato.
 */
export async function uploadPublicImage(
  file: FormDataEntryValue | null,
  folder: "questions" | "blog"
): Promise<UploadImageResult> {
  if (!(file instanceof File)) {
    return { ok: false, message: "Nessun file ricevuto." };
  }

  const extension = ALLOWED_IMAGE_TYPES.get(file.type);
  if (!extension) {
    return { ok: false, message: "Formato non supportato: usa PNG, JPG o WebP." };
  }
  if (file.size === 0) {
    return { ok: false, message: "Il file è vuoto." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, message: "L'immagine supera il limite di 5 MB." };
  }

  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!matchesImageSignature(header, file.type)) {
    return { ok: false, message: "Il contenuto del file non è un'immagine valida." };
  }

  const admin = createAdminClient();
  await ensureImageBucket(admin);

  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await admin.storage.from(IMAGE_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });
  if (error) {
    return { ok: false, message: "Caricamento non riuscito. Riprova." };
  }

  const { data } = admin.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    return { ok: false, message: "Impossibile ottenere l'URL dell'immagine." };
  }

  return { ok: true, url: data.publicUrl };
}
