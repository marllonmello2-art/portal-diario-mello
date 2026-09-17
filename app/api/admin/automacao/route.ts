import { guardAdmin, isResponse } from "../../../../lib/portal/api-guard";
import { recordAudit } from "../../../../lib/portal/audit";
import { autoPublishEnabled, setAutoPublish } from "../../../../lib/portal/settings";

export const dynamic = "force-dynamic";

/** Estado atual da publicação automática. */
export async function GET(request: Request) {
  const guard = await guardAdmin(request, "EDITOR_CHEFE", "ADMINISTRADOR");
  if (isResponse(guard)) return guard;
  return Response.json({ ligada: await autoPublishEnabled(guard.db) });
}

/**
 * Liga ou desliga a publicação automática.
 *
 * É o freio de mão do agente: uma pessoa com responsabilidade editorial
 * desliga sem precisar de deploy, e a mudança fica na auditoria com nome e
 * horário.
 */
export async function POST(request: Request) {
  const guard = await guardAdmin(request, "EDITOR_CHEFE", "ADMINISTRADOR");
  if (isResponse(guard)) return guard;

  const body = (await request.json().catch(() => ({}))) as { ligada?: boolean };
  const ligada = Boolean(body.ligada);

  await setAutoPublish(guard.db, ligada);
  await recordAudit(guard.db, guard.actor.auditActor, {
    action: ligada ? "agente.ligar" : "agente.desligar",
    entity: "configuracao",
    entityId: "publicacao_automatica",
    note: ligada
      ? "publicação automática pelo agente ligada"
      : "publicação automática pelo agente desligada",
    ip: guard.ip,
  });

  return Response.json({ ok: true, ligada });
}
