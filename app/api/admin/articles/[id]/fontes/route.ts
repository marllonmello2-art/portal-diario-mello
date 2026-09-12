import { normalizeStatus } from "../../../../../../lib/portal/articles";
import { guardAdmin, isResponse } from "../../../../../../lib/portal/api-guard";
import { recordAudit } from "../../../../../../lib/portal/audit";
import { canEditArticle, forbidden } from "../../../../../../lib/portal/permissions";
import { getArticleById } from "../../../../../../lib/portal/queries";
import { addSource, listSources } from "../../../../../../lib/portal/sources";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/**
 * Apuração de uma matéria. Rota interna: exige sessão do painel, e o conteúdo
 * daqui nunca é servido ao site público.
 */
export async function GET(request: Request, { params }: Context) {
  const guard = await guardAdmin(request);
  if (isResponse(guard)) return guard;

  const { id } = await params;
  return Response.json({ fontes: await listSources(guard.db, id) });
}

export async function POST(request: Request, { params }: Context) {
  const guard = await guardAdmin(request);
  if (isResponse(guard)) return guard;

  const { id } = await params;
  const article = await getArticleById(guard.db, id);
  if (!article) return Response.json({ error: "Matéria não encontrada." }, { status: 404 });

  const permitido = canEditArticle(guard.actor, {
    status: normalizeStatus(article.status),
    authorUserId: article.createdByUserId,
  });
  if (!permitido.ok) return forbidden(permitido.reason);

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (!name) return Response.json({ error: "Informe o nome da fonte." }, { status: 400 });

  const fonte = await addSource(guard.db, id, {
    name,
    type: body.type as string,
    reference: (body.reference as string) ?? null,
    consultedAt: (body.consultedAt as string) ?? null,
    status: body.status as string,
    note: (body.note as string) ?? null,
    confidential: Boolean(body.confidential),
    createdByUserId: guard.session.sub,
  });

  await recordAudit(guard.db, guard.actor.auditActor, {
    action: "fonte.create",
    entity: "article",
    entityId: id,
    // O nome da fonte não vai para a auditoria: pode ser fonte sob reserva.
    metadata: { tipo: fonte.type, status: fonte.status, confidencial: Boolean(fonte.confidential) },
    ip: guard.ip,
  });

  return Response.json({ ok: true, fonte }, { status: 201 });
}
