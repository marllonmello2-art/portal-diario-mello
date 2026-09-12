import { eq } from "drizzle-orm";
import { readers } from "../../../../db/schema";
import { hashPassword } from "../../../../lib/portal/auth";
import { getPortalDb } from "../../../../lib/portal/db";
import {
  checkReaderPassword,
  clearedReaderCookie,
  createReaderToken,
  findReaderByEmail,
  readerCookie,
  readerFromRequest,
} from "../../../../lib/portal/reader-auth";

export const dynamic = "force-dynamic";

/** Quem está logado como leitor. */
export async function GET(request: Request) {
  return Response.json({ reader: await readerFromRequest(request) });
}

/** Entrar na conta de leitor. */
export async function POST(request: Request) {
  const db = await getPortalDb();
  if (!db) {
    return Response.json(
      { code: "PERSISTENCE_NOT_CONFIGURED", error: "Login indisponível no momento." },
      { status: 503 },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return Response.json({ error: "Envie um JSON válido." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return Response.json({ error: "Informe e-mail e senha." }, { status: 400 });
  }

  const reader = await findReaderByEmail(db, email);
  const invalid = Response.json({ error: "E-mail ou senha incorretos." }, { status: 401 });

  if (!reader) {
    // Mesmo custo de um login real, para não denunciar quais e-mails existem.
    await hashPassword(password);
    return invalid;
  }
  if (!(await checkReaderPassword(password, reader.passwordHash))) return invalid;

  await db
    .update(readers)
    .set({ lastLoginAt: new Date().toISOString() })
    .where(eq(readers.id, reader.id));

  const token = await createReaderToken(reader);
  return Response.json(
    { ok: true, reader: { email: reader.email, name: reader.name } },
    { headers: { "set-cookie": readerCookie(token) } },
  );
}

/** Sair da conta. */
export async function DELETE() {
  return Response.json({ ok: true }, { headers: { "set-cookie": clearedReaderCookie() } });
}
