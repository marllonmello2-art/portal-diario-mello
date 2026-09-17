/**
 * Configurações internas guardadas em `portal_settings`.
 *
 * São poucas e propositalmente sem tela de "preferências": cada uma existe
 * porque alguém precisa poder mudá-la sem novo deploy. A primeira é a chave
 * geral da publicação automática — o botão de desligar o agente.
 */
import { eq } from "drizzle-orm";
import { portalSettings } from "../../db/schema";
import type { PortalDb } from "./db";

export const AUTO_PUBLISH_KEY = "publicacao_automatica";

export async function getSetting(db: PortalDb, key: string): Promise<string | null> {
  const [linha] = await db
    .select({ value: portalSettings.value })
    .from(portalSettings)
    .where(eq(portalSettings.key, key))
    .limit(1);
  return linha?.value ?? null;
}

export async function setSetting(db: PortalDb, key: string, value: string): Promise<void> {
  await db
    .insert(portalSettings)
    .values({ key, value, updatedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: portalSettings.key,
      set: { value, updatedAt: new Date().toISOString() },
    });
}

/**
 * A publicação automática está ligada?
 *
 * O padrão é ligado: o agente foi conectado justamente para publicar. Quem
 * desliga é uma pessoa, no painel, e o valor fica gravado — desligar no meio
 * de um problema não pode depender de deploy.
 */
export async function autoPublishEnabled(db: PortalDb): Promise<boolean> {
  return (await getSetting(db, AUTO_PUBLISH_KEY)) !== "off";
}

export async function setAutoPublish(db: PortalDb, ligado: boolean): Promise<void> {
  await setSetting(db, AUTO_PUBLISH_KEY, ligado ? "on" : "off");
}
