import type { Metadata } from "next";
import { headers } from "next/headers";
import { AdminShell } from "../../../components/admin/AdminShell";
import { NewsletterList } from "../../../components/admin/NewsletterList";
import { getPortalDb } from "../../../lib/portal/db";
import { listSubscribers } from "../../../lib/portal/newsletter";
import { requireRoles } from "../../../lib/portal/session-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Boletim", robots: { index: false } };

export default async function NewsletterAdminPage() {
  const session = await requireRoles("/admin/newsletter", "EDITOR_CHEFE", "ADMINISTRADOR");
  const db = await getPortalDb();
  const cabecalhos = await headers();
  const origem = `https://${cabecalhos.get("host") ?? "diario-mello.marllonmello2.workers.dev"}`;

  if (!db) {
    return (
      <AdminShell user={session}>
        <div className="dm-panel">Banco não conectado.</div>
      </AdminShell>
    );
  }

  const assinantes = await listSubscribers(db);
  const pendentes = assinantes.filter((a) => a.status === "pendente").length;
  const confirmados = assinantes.filter((a) => a.status === "confirmado").length;

  return (
    <AdminShell user={session}>
      <div className="dm-admin-head">
        <h1>Boletim</h1>
      </div>

      <div className="dm-stat-row">
        <div className="dm-stat">
          <strong>{confirmados}</strong>
          <span>Confirmados</span>
        </div>
        <div className="dm-stat dm-stat-atencao">
          <strong>{pendentes}</strong>
          <span>Aguardando confirmação</span>
        </div>
        <div className="dm-stat">
          <strong>{assinantes.filter((a) => a.status === "cancelado").length}</strong>
          <span>Cancelados</span>
        </div>
        <div className="dm-stat">
          <strong>{assinantes.length}</strong>
          <span>Registros na base</span>
        </div>
      </div>

      <p className="dm-aviso">
        O envio automático de e-mail ainda não está ligado. Até estar, copie o link de confirmação
        e mande pelo e-mail da redação — é assim que a dupla confirmação continua sendo feita pela
        própria pessoa.
      </p>

      <NewsletterList assinantes={assinantes} origem={origem} />
    </AdminShell>
  );
}
