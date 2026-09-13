import { eq } from "drizzle-orm";
import { readerSavedArticles, readers } from "../../../../db/schema";
import { recordAudit, requestIp } from "../../../../lib/portal/audit";
import { getPortalDb } from "../../../../lib/portal/db";
import { clearedReaderCookie, readerFromRequest, readerUnauthorized } from "../../../../lib/portal/reader-auth";

export const dynamic = "force-dynamic";

/**
 * Exclusão da conta de leitor, a pedido da própria pessoa.
 *
 * Apaga a conta e a lista de leitura. Não há período de carência nem
 * "desativação": quem pede para sair, sai.
 */
export async function DELETE(request: Request) {
  const reader = await readerFromRequest(request);
  if (!reader) return readerUnauthorized();

  const db = await getPortalDb();
  if (!db) return Response.json({ error: "Indisponível no momento." }, { status: 503 });

  await db.delete(readerSavedArticles).where(eq(readerSavedArticles.readerId, reader.sub));
  await db.delete(readers).where(eq(readers.id, reader.sub));

  await recordAudit(db, { kind: "leitor", id: reader.sub }, {
    action: "leitor.exclusao",
    entity: "reader",
    entityId: reader.sub,
    ip: requestIp(request),
  });

  return Response.json({ ok: true }, { headers: { "set-cookie": clearedReaderCookie() } });
}
