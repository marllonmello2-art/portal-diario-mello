import { PortalShell } from "./PortalShell";

/** Moldura das páginas institucionais, com a mesma tipografia das matérias. */
export function InstitutionalPage({
  kicker = "Institucional",
  title,
  intro,
  updatedAt,
  children,
}: {
  kicker?: string;
  title: string;
  intro?: string;
  updatedAt?: string;
  children: React.ReactNode;
}) {
  return (
    <PortalShell>
      <div className="dm-wrap">
        <header className="dm-page-head">
          <span className="dm-kicker">{kicker}</span>
          <h1 className="dm-page-title">{title}</h1>
          {intro ? <p className="dm-page-sub">{intro}</p> : null}
        </header>
        <div className="dm-static dm-prose">
          {children}
          {updatedAt ? (
            <p className="dm-atualizado">Última atualização: {updatedAt}.</p>
          ) : null}
        </div>
      </div>
    </PortalShell>
  );
}
