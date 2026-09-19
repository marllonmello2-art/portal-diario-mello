/**
 * Traz para casa a foto de capa indicada pelo agente.
 *
 * O agente manda um endereço; o portal baixa a imagem, confere que é imagem
 * mesmo e guarda no próprio bucket. Três motivos para não apenas apontar para
 * o servidor alheio: a foto pode sair do ar e deixar buraco na página, o outro
 * servidor pode bloquear o uso da imagem por fora do site dele, e um endereço
 * inventado pelo modelo viraria uma capa quebrada no ar — aqui ele simplesmente
 * não passa.
 */
import { mediaAssets } from "../../db/schema";
import { checkCoverUrl } from "./cover-sources";
import { MAX_IMAGE_BYTES, sniffImage } from "./image-bytes";
import type { PortalDb } from "./db";

export type CoverIngest =
  | { ok: true; url: string; key: string; mime: string; bytes: number }
  | { ok: false; reason: string };

export async function ingestRemoteCover(
  bucket: R2Bucket,
  db: PortalDb,
  sourceUrl: string,
  rights: { credit?: string | null; source?: string | null; license?: string | null },
): Promise<CoverIngest> {
  const permitido = checkCoverUrl(sourceUrl);
  if (!permitido.ok) return { ok: false, reason: permitido.reason };

  let resposta: Response;
  try {
    resposta = await fetch(sourceUrl, {
      headers: { accept: "image/*", "user-agent": "DiarioMello/1.0 (+https://diariomello.com.br)" },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
  } catch {
    return { ok: false, reason: `Não consegui baixar a imagem de capa em ${sourceUrl}.` };
  }

  if (!resposta.ok) {
    return {
      ok: false,
      reason: `O endereço da capa respondeu ${resposta.status}. Confira se a imagem existe.`,
    };
  }

  // Corta antes de ler quando o servidor já avisa o tamanho; quando não avisa,
  // a checagem depois da leitura pega o caso.
  const declarado = Number(resposta.headers.get("content-length") ?? "0");
  if (declarado > MAX_IMAGE_BYTES) {
    return { ok: false, reason: "A imagem de capa passa de 6 MB." };
  }

  const bytes = new Uint8Array(await resposta.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return { ok: false, reason: "A imagem de capa passa de 6 MB." };
  }

  const tipo = sniffImage(bytes);
  if (!tipo) {
    return {
      ok: false,
      reason: "O endereço da capa não devolveu uma imagem JPG, PNG, WEBP ou GIF.",
    };
  }

  const key = `portal/capas/${crypto.randomUUID()}.${tipo.ext}`;
  await bucket.put(key, bytes, {
    httpMetadata: { contentType: tipo.mime, cacheControl: "public, max-age=31536000, immutable" },
  });

  const url = `/api/media?key=${encodeURIComponent(key)}`;

  // Papelada de direitos no acervo: de onde veio, com que crédito e licença.
  await db.insert(mediaAssets).values({
    id: crypto.randomUUID(),
    key,
    url,
    mime: tipo.mime,
    bytes: bytes.byteLength,
    credit: rights.credit?.trim() || null,
    source: rights.source?.trim() || null,
    license: rights.license?.trim() || null,
    obtainedAt: new Date().toISOString().slice(0, 10),
    usageNote: `Baixada pelo agente editorial de ${sourceUrl}`,
    aiGenerated: 0,
    uploadedByUserId: null,
    createdAt: new Date().toISOString(),
  });

  return { ok: true, url, key, mime: tipo.mime, bytes: bytes.byteLength };
}
