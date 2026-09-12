import { guardAdmin, isResponse } from "../../../../../lib/portal/api-guard";
import { recordAudit } from "../../../../../lib/portal/audit";
import {
  getRequest,
  isRequestStatus,
  updateRequest,
} from "../../../../../lib/portal/corrections";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** Andamento do pedido: status, nota interna e resposta ao solicitante. */
export async function PATCH(request: Request, { params }: Context) {
  const guard = await guardAdmin(request, "EDITOR", "EDITOR_CHEFE", "ADMINISTRADOR");
  if (isResponse(guard)) return guard;

  const { id } = await params;
  const pedido = await getRequest(guard.db, id);
  if (!pedido) return Response.json({ error: "Pedido não encontrado." }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as {
    status?: string;
    internalNote?: string | null;
    response?: string | null;
  };

  if (body.status && !isRequestStatus(body.status)) {
    return Response.json({ error: "Status desconhecido." }, { status: 400 });
  }

  await updateRequest(
    guard.db,
    id,
    {
      status: body.status as never,
      internalNote: body.internalNote,
      response: body.response,
    },
    guard.session.sub,
  );

  await recordAudit(guard.db, guard.actor.auditActor, {
    action: "pedido.atualizado",
    entity: "correction_request",
    entityId: id,
    fromStatus: pedido.status,
    toStatus: body.status ?? pedido.status,
    metadata: { protocolo: pedido.protocol },
    ip: guard.ip,
  });

  return Response.json({ ok: true });
}
