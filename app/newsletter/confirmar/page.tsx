import Link from "next/link";
import type { Metadata } from "next";
import { InstitutionalPage } from "../../../components/portal/InstitutionalPage";
import { getPortalDb } from "../../../lib/portal/db";
import { confirmSubscription } from "../../../lib/portal/newsletter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Confirmar inscrição", robots: { index: false } };

/** Confirmação da inscrição no boletim, a partir do link enviado por e-mail. */
export default async function ConfirmNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const db = await getPortalDb();
  const assinante = db && token ? await confirmSubscription(db, token) : null;

  return (
    <InstitutionalPage
      kicker="Boletim"
      title={assinante ? "Inscrição confirmada" : "Não foi possível confirmar"}
    >
      {assinante ? (
        <>
          <p>
            Pronto, <strong>{assinante.email}</strong> está confirmado. Você passa a receber o
            resumo do dia.
          </p>
          <p>
            Para sair, use o link de cancelamento no rodapé de qualquer edição — é um clique, sem
            formulário.
          </p>
        </>
      ) : (
        <p>
          Este link é inválido ou já foi usado. Se quiser assinar, inscreva-se de novo pelo rodapé
          da <Link href="/">capa</Link>.
        </p>
      )}
    </InstitutionalPage>
  );
}
