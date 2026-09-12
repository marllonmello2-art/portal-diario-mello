import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PortalShell } from "../../components/portal/PortalShell";
import { ReaderAuthForm } from "../../components/portal/ReaderAuthForm";
import { BRAND } from "../../lib/portal/brand";
import { currentReader } from "../../lib/portal/session-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Criar conta",
  description: `Crie sua conta gratuita no ${BRAND.name}.`,
  robots: { index: false },
};

function safeReturn(value: string | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default async function SignUpPage({
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
          <h1 className="dm-page-title">Criar conta gratuita</h1>
          <p className="dm-page-sub">
            Leva menos de um minuto. Com a conta você lê as matérias exclusivas e salva o que
            quiser para depois.
          </p>
        </header>
        <ReaderAuthForm mode="criar" returnTo={safeReturn(voltarPara)} />
      </div>
    </PortalShell>
  );
}
