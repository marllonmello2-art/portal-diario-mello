import { transitionArticle } from "../../../../../../lib/portal/articles";
import { guardAdmin, isResponse } from "../../../../../../lib/portal/api-guard";
import { forbidden, isStatus } from "../../../../../../lib/portal/permissions";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/**
 * Única porta para mudar o estado editorial de uma matéria.
 *
 * A transição é validada contra a máquina de estados e o papel de quem pediu,
 * e fica registrada na auditoria — inclusive a recusa não grava nada.
 */
export async function POST(request: Request, { params }: Context) {
  const guard = await guardAdmin(request);
  if (isResponse(guard)) return guard;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    to?: string;
    note?: string;
    scheduledFor?: string;
  };

  const destino = String(body.to ?? "");
  if (!isStatus(destino)) {
    return Response.json({ error: "Estado editorial desconhecido." }, { status: 400 });
  }

  const resultado = await transitionArticle(guard.db, guard.actor, id, destino, {
    note: body.note ?? null,
    scheduledFor: body.scheduledFor ?? null,
    ip: guard.ip,
  });

  if (!resultado.ok) {
    if (resultado.code === "NOT_FOUND") {
      return Response.json({ error: resultado.reason }, { status: 404 });
    }
    return forbidden(resultado.reason);
  }

  return Response.json({ ok: true, article: resultado.article });
}
