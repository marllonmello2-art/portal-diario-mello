import { markHumanChecked } from "../../../../../../lib/portal/articles";
import { guardAdmin, isResponse } from "../../../../../../lib/portal/api-guard";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/**
 * Registra que uma pessoa conferiu uma matéria publicada pelo agente.
 *
 * Não muda texto nem estado: carimba a conferência, tira a matéria da fila de
 * pendências e some com o aviso de "ainda não conferida" na página pública.
 */
export async function POST(request: Request, { params }: Context) {
  const guard = await guardAdmin(request, "EDITOR", "EDITOR_CHEFE", "ADMINISTRADOR");
  if (isResponse(guard)) return guard;

  const { id } = await params;
  const resultado = await markHumanChecked(guard.db, guard.actor, id, { ip: guard.ip });
  if (!resultado.ok) return Response.json({ error: resultado.reason }, { status: 404 });

  return Response.json({ ok: true });
}
