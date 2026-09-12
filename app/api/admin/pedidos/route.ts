import { guardAdmin, isResponse } from "../../../../lib/portal/api-guard";
import { listRequests } from "../../../../lib/portal/corrections";

export const dynamic = "force-dynamic";

/** Fila de pedidos de correção e direito de resposta. */
export async function GET(request: Request) {
  const guard = await guardAdmin(request, "EDITOR", "EDITOR_CHEFE", "ADMINISTRADOR");
  if (isResponse(guard)) return guard;

  const status = new URL(request.url).searchParams.get("status") ?? undefined;
  return Response.json({ pedidos: await listRequests(guard.db, { status }) });
}
