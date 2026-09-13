import Link from "next/link";
import type { Metadata } from "next";
import { InstitutionalPage } from "../../../components/portal/InstitutionalPage";
import { BRAND } from "../../../lib/portal/brand";
import { getPortalDb } from "../../../lib/portal/db";
import { unsubscribe } from "../../../lib/portal/newsletter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Cancelar boletim", robots: { index: false } };

/** Cancelamento em um clique, direto pelo link do rodapé do e-mail. */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const db = await getPortalDb();
  const assinante = db && token ? await unsubscribe(db, token) : null;

  return (
    <InstitutionalPage
      kicker="Boletim"
      title={assinante ? "Inscrição cancelada" : "Link inválido"}
    >
      {assinante ? (
        <>
          <p>
            <strong>{assinante.email}</strong> não recebe mais o boletim. Nada mais é enviado a
            partir de agora.
          </p>
          <p>
            Quer também apagar seu e-mail da nossa base? Escreva para <strong>{BRAND.email}</strong>{" "}
            pedindo exclusão — apagamos o registro e confirmamos por resposta.
          </p>
          <p>
            <Link href="/">Voltar para a capa</Link>.
          </p>
        </>
      ) : (
        <p>
          Este link de cancelamento não é válido. Se continuar recebendo o boletim sem querer,
          escreva para <strong>{BRAND.email}</strong> que resolvemos na mão.
        </p>
      )}
    </InstitutionalPage>
  );
}
