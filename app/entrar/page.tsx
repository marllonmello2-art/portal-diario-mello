import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PortalShell } from "../../components/portal/PortalShell";
import { ReaderAuthForm } from "../../components/portal/ReaderAuthForm";
import { BRAND } from "../../lib/portal/brand";
import { currentReader } from "../../lib/portal/session-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrar",
  description: `Entre na sua conta gratuita do ${BRAND.name}.`,
  robots: { index: false },
};

/** Destino seguro: só caminhos internos, nunca outro site. */
function safeReturn(value: string | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ voltar_para?: string }>;
}) {
  const { voltar_para: voltarPara } = await searchParams;
  if (await currentReader()) redirect(safeReturn(voltarPara));

  return (
    <PortalShell>
      <div className="dm-wrap">
        <header className="dm-page-head">
          <span className="dm-kicker">Sua conta</span>
          <h1 className="dm-page-title">Entrar no {BRAND.name}</h1>
          <p className="dm-page-sub">
            A conta é gratuita e dá acesso às matérias exclusivas e à sua lista de leitura.
          </p>
        </header>
        <ReaderAuthForm mode="entrar" returnTo={safeReturn(voltarPara)} />
      </div>
    </PortalShell>
  );
}
