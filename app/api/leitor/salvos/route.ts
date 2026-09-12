import { and, eq } from "drizzle-orm";
import { readerSavedArticles } from "../../../../db/schema";
import { getPortalDb } from "../../../../lib/portal/db";
import { readerFromRequest, readerUnauthorized } from "../../../../lib/portal/reader-auth";

export const dynamic = "force-dynamic";

/** Salva ou remove uma matéria da lista "ler depois" do leitor. */
export async function POST(request: Request) {
  const reader = await readerFromRequest(request);
  if (!reader) return readerUnauthorized();

  const db = await getPortalDb();
  if (!db) return Response.json({ error: "Indisponível no momento." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { articleId?: string; saved?: boolean };
  const articleId = (body.articleId ?? "").trim();
  if (!articleId) return Response.json({ error: "Matéria não informada." }, { status: 400 });

  if (body.saved === false) {
    await db
      .delete(readerSavedArticles)
      .where(
        and(
          eq(readerSavedArticles.readerId, reader.sub),
          eq(readerSavedArticles.articleId, articleId),
        ),
      );
    return Response.json({ ok: true, saved: false });
  }

  await db
    .insert(readerSavedArticles)
    .values({ readerId: reader.sub, articleId, createdAt: new Date().toISOString() })
    .onConflictDoNothing();

  return Response.json({ ok: true, saved: true });
}
