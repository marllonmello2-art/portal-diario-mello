/**
 * Boletim: inscrição com dupla confirmação, cancelamento e exclusão.
 *
 * O envio de e-mail ainda não está ligado. Até estar, a inscrição fica
 * `pendente` e o link de confirmação aparece no painel, para a redação enviar
 * à mão — é o que mantém a dupla confirmação honesta: quem confirma é a pessoa
 * dona do e-mail, não quem preencheu o formulário.
 */
import { desc, eq } from "drizzle-orm";
import { newsletterSubscribers } from "../../db/schema";
import type { PortalDb } from "./db";

export type SubscriberRow = typeof newsletterSubscribers.$inferSelect;

export const NEWSLETTER_PURPOSE = "Boletim diário do Diário Mello";

function novoToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let binario = "";
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export type SubscribeResult =
  | { status: "pendente"; token: string }
  | { status: "ja_confirmado" };

/** Cria ou reativa uma inscrição, sempre em estado pendente. */
export async function subscribe(
  db: PortalDb,
  input: { email: string; source?: string; ip?: string | null },
): Promise<SubscribeResult> {
  const email = input.email.trim().toLowerCase();
  const [existente] = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, email))
    .limit(1);

  if (existente?.status === "confirmado") return { status: "ja_confirmado" };

  const token = novoToken();
  const agora = new Date().toISOString();

  if (existente) {
    await db
      .update(newsletterSubscribers)
      .set({ status: "pendente", token, createdAt: agora, unsubscribedAt: null, ip: input.ip ?? null })
      .where(eq(newsletterSubscribers.id, existente.id));
  } else {
    await db.insert(newsletterSubscribers).values({
      id: crypto.randomUUID(),
      email,
      source: (input.source ?? "site").slice(0, 40),
      purpose: NEWSLETTER_PURPOSE,
      status: "pendente",
      token,
      ip: input.ip ?? null,
      createdAt: agora,
    });
  }

  return { status: "pendente", token };
}

/** Confirma a inscrição a partir do token enviado por e-mail. */
export async function confirmSubscription(db: PortalDb, token: string): Promise<SubscriberRow | null> {
  const [linha] = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.token, token))
    .limit(1);
  if (!linha) return null;

  await db
    .update(newsletterSubscribers)
    .set({ status: "confirmado", confirmedAt: new Date().toISOString() })
    .where(eq(newsletterSubscribers.id, linha.id));
  return linha;
}

/** Cancelamento em um clique, sem login e sem formulário. */
export async function unsubscribe(db: PortalDb, token: string): Promise<SubscriberRow | null> {
  const [linha] = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.token, token))
    .limit(1);
  if (!linha) return null;

  await db
    .update(newsletterSubscribers)
    .set({ status: "cancelado", unsubscribedAt: new Date().toISOString() })
    .where(eq(newsletterSubscribers.id, linha.id));
  return linha;
}

/** Apaga o registro de vez — o "quero sumir da base" da LGPD. */
export async function forget(db: PortalDb, id: string): Promise<void> {
  await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, id));
}

export async function listSubscribers(db: PortalDb): Promise<SubscriberRow[]> {
  return db
    .select()
    .from(newsletterSubscribers)
    .orderBy(desc(newsletterSubscribers.createdAt))
    .limit(500);
}
