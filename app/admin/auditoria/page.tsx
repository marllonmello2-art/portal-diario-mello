import type { Metadata } from "next";
import { AdminShell } from "../../../components/admin/AdminShell";
import { AuditTrail } from "../../../components/admin/AuditTrail";
import { listAudit } from "../../../lib/portal/audit";
import { getPortalDb } from "../../../lib/portal/db";
import { requireRoles } from "../../../lib/portal/session-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Auditoria", robots: { index: false } };

/** Trilha do portal inteiro: entradas, criações, aprovações, publicações. */
export default async function AuditPage() {
  const session = await requireRoles("/admin/auditoria", "EDITOR_CHEFE", "ADMINISTRADOR");
  const db = await getPortalDb();

  if (!db) {
    return (
      <AdminShell user={session}>
        <div className="dm-panel">Banco não conectado.</div>
      </AdminShell>
    );
  }

  const eventos = await listAudit(db, { limit: 200 });

  return (
    <AdminShell user={session}>
      <div className="dm-admin-head">
        <h1>Auditoria</h1>
      </div>
      <p className="dm-note" style={{ color: "#6b7280", marginBottom: 16 }}>
        Registro imutável do que aconteceu no painel. Nada aqui é editado ou apagado — é o que
        responde “quem aprovou isso, e quando?”.
      </p>
      <AuditTrail eventos={eventos} titulo="Últimos 200 eventos" />
    </AdminShell>
  );
}
