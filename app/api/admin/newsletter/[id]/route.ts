import { guardAdmin, isResponse } from "../../../../../lib/portal/api-guard";
import { recordAudit } from "../../../../../lib/portal/audit";
import { forget } from "../../../../../lib/portal/newsletter";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** Exclusão definitiva do registro — o pedido de "me apaguem" da LGPD. */
export async function DELETE(request: Request, { params }: Context) {
  const guard = await guardAdmin(request, "EDITOR_CHEFE", "ADMINISTRADOR");
  if (isResponse(guard)) return guard;

  const { id } = await params;
  await forget(guard.db, id);

  // Sem e-mail nos metadados: o registro de auditoria não deve ressuscitar o
  // dado que a pessoa pediu para apagar.
  await recordAudit(guard.db, guard.actor.auditActor, {
    action: "newsletter.exclusao",
    entity: "newsletter",
    entityId: id,
    ip: guard.ip,
  });

  return Response.json({ ok: true });
}
