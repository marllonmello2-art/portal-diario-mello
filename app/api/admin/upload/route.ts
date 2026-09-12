import { mediaAssets } from "../../../../db/schema";
import { guardAdmin, isResponse } from "../../../../lib/portal/api-guard";
import { AI_IMAGE_CREDIT } from "../../../../lib/portal/articles";
import { getBucket } from "../../../../lib/portal/db";

export const dynamic = "force-dynamic";

const MAX_BYTES = 6 * 1024 * 1024; // 6 MB

/**
 * Detecta o tipo real pelo cabeçalho do arquivo (magic bytes).
 * Confiar no `content-type` enviado pelo navegador permitiria subir um
 * arquivo arbitrário só renomeando a extensão.
 */
function sniff(bytes: Uint8Array): { mime: string; ext: string } | null {
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

/** Upload de imagem (capa de matéria ou foto de autor) para o bucket R2. */
export async function POST(request: Request) {
  const guard = await guardAdmin(request, "AUTOR", "EDITOR", "EDITOR_CHEFE");
  if (isResponse(guard)) return guard;

  const bucket = await getBucket();
  if (!bucket) {
    return Response.json(
      {
        code: "PERSISTENCE_NOT_CONFIGURED",
        error: "Bucket R2 (BUCKET) não conectado — conecte-o para enviar imagens.",
      },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "capa");

  // Papelada de direitos: sem crédito e origem a imagem não entra no acervo.
  const geradaPorIa = String(form.get("aiGenerated") ?? "") === "1";
  const credit = geradaPorIa ? AI_IMAGE_CREDIT : String(form.get("credit") ?? "").trim();
  const source = geradaPorIa ? "Diário Mello" : String(form.get("source") ?? "").trim();
  const license = String(form.get("license") ?? "").trim();
  const obtainedAt = String(form.get("obtainedAt") ?? "").trim();
  const usageNote = String(form.get("usageNote") ?? "").trim();

  if (!geradaPorIa && (!credit || !source)) {
    return Response.json(
      {
        error:
          "Informe o crédito do autor e a origem da imagem. Se for ilustração do próprio portal, marque como gerada por IA.",
      },
      { status: 400 },
    );
  }
  if (!(file instanceof File)) {
    return Response.json({ error: "Nenhum arquivo recebido." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "A imagem deve ter no máximo 6 MB." }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type) {
    return Response.json({ error: "Envie uma imagem JPG, PNG, WEBP ou GIF." }, { status: 415 });
  }

  const folder = kind === "autor" ? "autores" : "capas";
  const key = `portal/${folder}/${crypto.randomUUID()}.${type.ext}`;
  await bucket.put(key, bytes, {
    httpMetadata: { contentType: type.mime, cacheControl: "public, max-age=31536000, immutable" },
  });

  const url = `/api/media?key=${encodeURIComponent(key)}`;

  await guard.db.insert(mediaAssets).values({
    id: crypto.randomUUID(),
    key,
    url,
    mime: type.mime,
    bytes: file.size,
    credit: credit || null,
    source: source || null,
    license: license || null,
    obtainedAt: obtainedAt || null,
    usageNote: usageNote || null,
    aiGenerated: geradaPorIa ? 1 : 0,
    uploadedByUserId: guard.session.sub,
    createdAt: new Date().toISOString(),
  });

  return Response.json(
    { ok: true, key, url, credit, source, license, obtainedAt, aiGenerated: geradaPorIa },
    { status: 201 },
  );
}
