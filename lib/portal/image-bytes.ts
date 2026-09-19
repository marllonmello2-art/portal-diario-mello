/**
 * Identificação do tipo real de uma imagem pelos primeiros bytes.
 *
 * Confiar no `content-type` declarado — pelo navegador que envia ou pelo
 * servidor que responde — permitiria guardar um arquivo arbitrário só porque
 * alguém disse que era imagem. Aqui olhamos o cabeçalho do próprio arquivo.
 */

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB

export type ImageKind = { mime: string; ext: string };

export function sniffImage(bytes: Uint8Array): ImageKind | null {
  const startsWith = (...signature: number[]) =>
    signature.every((byte, index) => bytes[index] === byte);

  if (startsWith(0x89, 0x50, 0x4e, 0x47)) return { mime: "image/png", ext: "png" };
  if (startsWith(0xff, 0xd8, 0xff)) return { mime: "image/jpeg", ext: "jpg" };
  if (startsWith(0x47, 0x49, 0x46, 0x38)) return { mime: "image/gif", ext: "gif" };
  // WEBP = "RIFF"????"WEBP"
  if (
    startsWith(0x52, 0x49, 0x46, 0x46) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}
