import Link from "next/link";
import type { Metadata } from "next";
import { AdminShell } from "../../../components/admin/AdminShell";
import { RequestsQueue } from "../../../components/admin/RequestsQueue";
import { listRequests } from "../../../lib/portal/corrections";
import { getPortalDb } from "../../../lib/portal/db";
import { requireRoles } from "../../../lib/portal/session-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Pedidos", robots: { index: false } };

/** Correções e direito de resposta pedidos pelo público. */
export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireRoles("/admin/pedidos", "EDITOR", "EDITOR_CHEFE", "ADMINISTRADOR");
  const { status } = await searchParams;
  const db = await getPortalDb();

  if (!db) {
    return (
      <AdminShell user={session}>
        <div className="dm-panel">Banco não conectado.</div>
      </AdminShell>
    );
  }

  const pedidos = await listRequests(db, { status });

  return (
    <AdminShell user={session}>
      <div className="dm-admin-head">
        <h1>Correções e direito de resposta</h1>
        <Link href="/direito-de-resposta" target="_blank" className="dm-btn dm-btn-ghost">
          Ver o formulário público ↗
        </Link>
      </div>

      <form className="dm-toolbar" method="get">
        <select name="status" defaultValue={status ?? ""}>
          <option value="">Todos os status</option>
          <option value="recebido">Recebidos</option>
          <option value="em_analise">Em análise</option>
          <option value="respondido">Respondidos</option>
          <option value="corrigido">Corrigidos</option>
          <option value="recusado">Recusados</option>
        </select>
        <button type="submit" className="dm-btn dm-btn-ghost">Filtrar</button>
      </form>

      <RequestsQueue pedidos={pedidos} />
    </AdminShell>
  );
}
