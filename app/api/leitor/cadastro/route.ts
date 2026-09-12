import { getPortalDb } from "../../../../lib/portal/db";
import {
  EMAIL_PATTERN,
  MIN_PASSWORD,
  createReader,
  createReaderToken,
  findReaderByEmail,
  readerCookie,
} from "../../../../lib/portal/reader-auth";

export const dynamic = "force-dynamic";

/** Criação da conta gratuita de leitor. Já entra logado ao final. */
export async function POST(request: Request) {
  const db = await getPortalDb();
  if (!db) {
    return Response.json(
      { code: "PERSISTENCE_NOT_CONFIGURED", error: "Cadastro indisponível no momento." },
      { status: 503 },
    );
  }

  let body: { email?: string; password?: string; name?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string; name?: string };
  } catch {
    return Response.json({ error: "Envie um JSON válido." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!EMAIL_PATTERN.test(email)) {
    return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD) {
    return Response.json(
      { error: `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.` },
      { status: 400 },
    );
  }

  if (await findReaderByEmail(db, email)) {
    return Response.json(
      { code: "EMAIL_TAKEN", error: "Já existe uma conta com este e-mail. Tente entrar." },
      { status: 409 },
    );
  }

  const reader = await createReader(db, { email, password, name: body.name ?? null });
  const token = await createReaderToken(reader);

  return Response.json(
    { ok: true, reader: { email: reader.email, name: reader.name } },
    { status: 201, headers: { "set-cookie": readerCookie(token) } },
  );
}
