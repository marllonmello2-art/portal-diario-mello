import { guardAdmin, isResponse } from "../../../../lib/portal/api-guard";
import { listSubscribers } from "../../../../lib/portal/newsletter";

export const dynamic = "force-dynamic";

/** Base do boletim. Restrita: é dado pessoal de leitor. */
export async function GET(request: Request) {
  const guard = await guardAdmin(request, "EDITOR_CHEFE", "ADMINISTRADOR");
  if (isResponse(guard)) return guard;
  return Response.json({ assinantes: await listSubscribers(guard.db) });
}
