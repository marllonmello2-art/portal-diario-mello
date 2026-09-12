import Link from "next/link";
import { BRAND } from "../../lib/portal/brand";
import { ROLE_LABEL, hasRole, type Role } from "../../lib/portal/permissions";
import { LogoutButton } from "./LogoutButton";

/** Moldura do painel: barra de navegação + área de conteúdo. */
export function AdminShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { email: string; name: string | null; roles?: Role[] };
}) {
  const roles = user.roles ?? [];
  const ator = { roles };
  return (
    <div className="dm-admin">
      <div className="dm-admin-bar">
        <div className="dm-wrap">
          <Link href="/admin" className="dm-logo">
            <span className="dm-logo-mark" aria-hidden="true">
              {BRAND.initials}
            </span>
            <span className="dm-logo-text">
              {BRAND.nameFirst} <em>{BRAND.nameLast}</em>
            </span>
          </Link>
          <nav>
            <Link href="/admin">Matérias</Link>
            {hasRole(ator, "EDITOR_CHEFE", "ADMINISTRADOR") ? (
              <>
                <Link href="/admin/editorias">Editorias</Link>
                <Link href="/admin/autores">Autores</Link>
                <Link href="/admin/auditoria">Auditoria</Link>
              </>
            ) : null}
            {hasRole(ator, "ADMINISTRADOR") ? <Link href="/admin/pessoas">Pessoas</Link> : null}
            <Link href="/" target="_blank">
              Ver o site ↗
            </Link>
          </nav>
          <LogoutButton
            label={user.name || user.email}
            papeis={roles.map((role) => ROLE_LABEL[role]).join(" · ")}
          />
        </div>
      </div>
      <div className="dm-admin-main">{children}</div>
    </div>
  );
}
