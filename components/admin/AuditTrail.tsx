import { formatShort } from "../../lib/portal/format";
import { STATUS_LABEL } from "../../lib/portal/permissions";
import type { AuditRow } from "../../lib/portal/audit";

const ACTION_LABEL: Record<string, string> = {
  "article.create": "Matéria criada",
  "article.update": "Conteúdo editado",
  "article.status": "Mudança de estado",
  "article.delete": "Matéria excluída",
  "login.sucesso": "Entrada no painel",
  "login.falha": "Tentativa de entrada",
  "pessoa.create": "Pessoa cadastrada",
  "pessoa.update": "Pessoa alterada",
  "pessoa.delete": "Pessoa removida",
  "category.create": "Editoria criada",
  "category.delete": "Editoria removida",
  "author.create": "Autor criado",
  "author.delete": "Autor removido",
  "admin.primeiro_acesso": "Primeiro acesso criado",
};

function descreveEstado(valor: string | null) {
  if (!valor) return null;
  return STATUS_LABEL[valor as keyof typeof STATUS_LABEL] ?? valor;
}

/** Histórico imutável de uma matéria (ou do portal inteiro). */
export function AuditTrail({ eventos, titulo = "Histórico" }: { eventos: AuditRow[]; titulo?: string }) {
  return (
    <div className="dm-panel">
      <h2>{titulo}</h2>
      {eventos.length === 0 ? (
        <p className="dm-note" style={{ color: "#6b7280" }}>Nada registrado ainda.</p>
      ) : (
        <ol className="dm-trilha">
          {eventos.map((evento) => {
            const de = descreveEstado(evento.fromStatus);
            const para = descreveEstado(evento.toStatus);
            return (
              <li key={evento.id}>
                <div className="dm-trilha-topo">
                  <strong>{ACTION_LABEL[evento.action] ?? evento.action}</strong>
                  <span>{formatShort(evento.at)}</span>
                </div>
                <div className="dm-trilha-corpo">
                  {evento.actorLabel ?? (evento.actorKind === "integracao" ? "Integração de IA" : "Sistema")}
                  {de && para ? ` · ${de} → ${para}` : para ? ` · ${para}` : ""}
                </div>
                {evento.note ? <div className="dm-trilha-nota">“{evento.note}”</div> : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
