import { mediaAssets } from "../../../../db/schema";
import { guardAdmin, isResponse } from "../../../../lib/portal/api-guard";
import { AI_IMAGE_CREDIT } from "../../../../lib/portal/articles";
import { getBucket } from "../../../../lib/portal/db";
import { MAX_IMAGE_BYTES, sniffImage } from "../../../../lib/portal/image-bytes";

export const dynamic = "force-dynamic";

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
  if (file.size > MAX_IMAGE_BYTES) {
    return Response.json({ error: "A imagem deve ter no máximo 6 MB." }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(bytes);
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
