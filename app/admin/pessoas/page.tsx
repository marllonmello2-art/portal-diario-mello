import type { Metadata } from "next";
import { adminUserRoles, adminUsers } from "../../../db/schema";
import { AdminShell } from "../../../components/admin/AdminShell";
import { PeopleManager } from "../../../components/admin/PeopleManager";
import { getPortalDb } from "../../../lib/portal/db";
import { requireRoles } from "../../../lib/portal/session-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Pessoas", robots: { index: false } };

/** Quem entra no painel e com quais perfis. Restrito a ADMINISTRADOR. */
export default async function PeoplePage() {
  const session = await requireRoles("/admin/pessoas", "ADMINISTRADOR");
  const db = await getPortalDb();

  if (!db) {
    return (
      <AdminShell user={session}>
        <div className="dm-panel">Banco não conectado.</div>
      </AdminShell>
    );
  }

  const usuarios = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      lastLoginAt: adminUsers.lastLoginAt,
    })
    .from(adminUsers)
    .orderBy(adminUsers.email);

  const papeis = await db
    .select({ userId: adminUserRoles.userId, role: adminUserRoles.role })
    .from(adminUserRoles);

  return (
    <AdminShell user={session}>
      <div className="dm-admin-head">
        <h1>Pessoas do painel</h1>
      </div>
      <PeopleManager
        meuId={session.sub}
        pessoas={usuarios.map((usuario) => ({
          ...usuario,
          roles: papeis.filter((papel) => papel.userId === usuario.id).map((papel) => papel.role),
        }))}
      />
    </AdminShell>
  );
}
