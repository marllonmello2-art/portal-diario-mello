import {
  checkCoverRights,
  deleteArticle,
  normalizeStatus,
  updateArticle,
} from "../../../../../lib/portal/articles";
import { guardAdmin, isResponse } from "../../../../../lib/portal/api-guard";
import { listAudit, recordAudit } from "../../../../../lib/portal/audit";
import {
  allowedTransitions,
  canDeleteArticle,
  canEditArticle,
  forbidden,
} from "../../../../../lib/portal/permissions";
import { getArticleById, tagsOfArticle } from "../../../../../lib/portal/queries";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const guard = await guardAdmin(request);
  if (isResponse(guard)) return guard;

  const { id } = await params;
  const article = await getArticleById(guard.db, id);
  if (!article) return Response.json({ error: "Matéria não encontrada." }, { status: 404 });

  return Response.json({
    article,
    tags: await tagsOfArticle(guard.db, id),
    transicoes: allowedTransitions(guard.actor, normalizeStatus(article.status)),
    historico: await listAudit(guard.db, { entity: "article", entityId: id, limit: 50 }),
  });
}

/**
 * PATCH: salva o conteúdo. Status não muda por aqui — mudança de estado tem
 * rota própria, com a máquina de estados e auditoria.
 */
export async function PATCH(request: Request, { params }: Context) {
  const guard = await guardAdmin(request);
  if (isResponse(guard)) return guard;

  const { id } = await params;
  const atual = await getArticleById(guard.db, id);
  if (!atual) return Response.json({ error: "Matéria não encontrada." }, { status: 404 });

  const permitido = canEditArticle(guard.actor, {
    status: normalizeStatus(atual.status),
    authorUserId: atual.createdByUserId,
  });
  if (!permitido.ok) return forbidden(permitido.reason);

  const body = (await request.json()) as Record<string, unknown>;

  // Direitos de imagem valem já na gravação: assim o problema aparece para
  // quem escolheu a foto, e não só na hora de publicar.
  const direitos = checkCoverRights({
    coverImageUrl:
      body.coverImageUrl === undefined ? atual.coverImageUrl : (body.coverImageUrl as string),
    coverCredit: body.coverCredit === undefined ? atual.coverCredit : (body.coverCredit as string),
    coverSource: body.coverSource === undefined ? atual.coverSource : (body.coverSource as string),
    coverAiGenerated:
      body.coverAiGenerated === undefined
        ? Boolean(atual.coverAiGenerated)
        : Boolean(body.coverAiGenerated),
  });
  if (!direitos.ok) return Response.json({ error: direitos.reason }, { status: 400 });

  const article = await updateArticle(guard.db, id, {
    title: body.title === undefined ? undefined : String(body.title),
    content: body.content === undefined ? undefined : String(body.content),
    subtitle: body.subtitle === undefined ? undefined : (body.subtitle as string | null),
    categoryId: body.categoryId === undefined ? undefined : (body.categoryId as string | null),
    authorId: body.authorId === undefined ? undefined : (body.authorId as string | null),
    coverImageUrl: body.coverImageUrl === undefined ? undefined : (body.coverImageUrl as string | null),
    coverCredit: body.coverCredit === undefined ? undefined : (body.coverCredit as string | null),
    coverSource: body.coverSource === undefined ? undefined : (body.coverSource as string | null),
    coverLicense: body.coverLicense === undefined ? undefined : (body.coverLicense as string | null),
    coverObtainedAt:
      body.coverObtainedAt === undefined ? undefined : (body.coverObtainedAt as string | null),
    coverUsageNote:
      body.coverUsageNote === undefined ? undefined : (body.coverUsageNote as string | null),
    coverAiGenerated:
      body.coverAiGenerated === undefined ? undefined : Boolean(body.coverAiGenerated),
    classification: body.classification === undefined ? undefined : String(body.classification),
    contentType: body.contentType === undefined ? undefined : String(body.contentType),
    eventDate: body.eventDate === undefined ? undefined : (body.eventDate as string | null),
    expiresAt: body.expiresAt === undefined ? undefined : (body.expiresAt as string | null),
    reviewDueAt: body.reviewDueAt === undefined ? undefined : (body.reviewDueAt as string | null),
    riskSourceOk: body.riskSourceOk === undefined ? undefined : Boolean(body.riskSourceOk),
    riskNoPersonOk: body.riskNoPersonOk === undefined ? undefined : Boolean(body.riskNoPersonOk),
    riskNoAdviceOk: body.riskNoAdviceOk === undefined ? undefined : Boolean(body.riskNoAdviceOk),
    riskImageOk: body.riskImageOk === undefined ? undefined : Boolean(body.riskImageOk),
    tags: Array.isArray(body.tags) ? (body.tags as string[]) : undefined,
    accessLevel: body.accessLevel === undefined ? undefined : String(body.accessLevel),
    featured: body.featured === undefined ? undefined : Boolean(body.featured),
  });

  await recordAudit(guard.db, guard.actor.auditActor, {
    action: "article.update",
    entity: "article",
    entityId: id,
    metadata: { titulo: article?.title },
    ip: guard.ip,
  });

  return Response.json({ ok: true, article });
}

/** DELETE: apagar de vez é do administrador. A redação arquiva. */
export async function DELETE(request: Request, { params }: Context) {
  const guard = await guardAdmin(request);
  if (isResponse(guard)) return guard;
  if (!canDeleteArticle(guard.actor)) {
    return forbidden("Apagar definitivamente é do administrador. Para tirar do ar, arquive.");
  }

  const { id } = await params;
  const atual = await getArticleById(guard.db, id);
  await deleteArticle(guard.db, id);

  await recordAudit(guard.db, guard.actor.auditActor, {
    action: "article.delete",
    entity: "article",
    entityId: id,
    fromStatus: atual?.status,
    metadata: { titulo: atual?.title },
    ip: guard.ip,
  });

  return Response.json({ ok: true });
}
