/**
 * Contas de leitor.
 *
 * É uma área separada do painel do editor: outro cookie, outro público no
 * token (`aud: "reader"`) e nenhum acesso a /admin. Um leitor logado continua
 * sendo um visitante comum do site — só ganha as funcionalidades extras.
 */
import { eq } from "drizzle-orm";
import { readers } from "../../db/schema";
import {
  buildCookie,
  clearCookie,
  cookieFromHeader,
  hashPassword,
  readToken,
  signToken,
  verifyPassword,
} from "./auth";
import type { PortalDb } from "./db";

export const READER_COOKIE = "dm_leitor";
/** Leitor não é editor: a sessão dura mais para não pedir senha toda hora. */
const READER_TTL_SECONDS = 60 * 60 * 24 * 30;

export type ReaderSession = {
  sub: string;
  email: string;
  name: string | null;
  aud?: "admin" | "reader";
  exp: number;
};

export async function createReaderToken(reader: {
  id: string;
  email: string;
  name: string | null;
}): Promise<string> {
  return signToken({
    sub: reader.id,
    email: reader.email,
    name: reader.name,
    aud: "reader",
    exp: Math.floor(Date.now() / 1000) + READER_TTL_SECONDS,
  });
}

export async function readReaderToken(token: string | undefined): Promise<ReaderSession | null> {
  const session = await readToken<ReaderSession>(token);
  // Uma sessão do painel não vale como sessão de leitor (e vice-versa).
  if (!session || session.aud !== "reader") return null;
  return session;
}

export function readerCookie(token: string): string {
  return buildCookie(READER_COOKIE, token, READER_TTL_SECONDS);
}

export function clearedReaderCookie(): string {
  return clearCookie(READER_COOKIE);
}

/** Sessão do leitor a partir de uma requisição (rotas de API). */
export async function readerFromRequest(request: Request): Promise<ReaderSession | null> {
  return readReaderToken(cookieFromHeader(request.headers.get("cookie"), READER_COOKIE));
}

export function readerUnauthorized() {
  return Response.json(
    { code: "READER_AUTH_REQUIRED", error: "Entre na sua conta para continuar." },
    { status: 401 },
  );
}

/* ------------------------------ cadastro ------------------------------ */

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MIN_PASSWORD = 8;

export async function findReaderByEmail(db: PortalDb, email: string) {
  const [row] = await db
    .select()
    .from(readers)
    .where(eq(readers.email, email.toLowerCase().trim()))
    .limit(1);
  return row ?? null;
}

export async function createReader(
  db: PortalDb,
  input: { email: string; password: string; name?: string | null },
) {
  const reader = {
    id: crypto.randomUUID(),
    email: input.email.toLowerCase().trim(),
    name: input.name?.trim() || null,
    passwordHash: await hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };
  await db.insert(readers).values(reader);
  return reader;
}

export async function checkReaderPassword(password: string, stored: string) {
  return verifyPassword(password, stored);
}
