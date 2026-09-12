"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { requestJson } from "../../lib/portal/http";
import {
  SOURCE_STATUSES,
  SOURCE_STATUS_LABEL,
  SOURCE_TYPES,
  SOURCE_TYPE_LABEL,
  type SourceRow,
} from "../../lib/portal/sources";

/**
 * Apuração e fontes — área interna.
 *
 * Nada aqui aparece no site: é o caderno da redação, com o que foi checado,
 * com quem, quando e o que ficou pendente.
 */
export function SourcesPanel({
  articleId,
  fontes,
  exigeConfirmada,
  somenteLeitura,
}: {
  articleId: string;
  fontes: SourceRow[];
  exigeConfirmada: boolean;
  somenteLeitura: boolean;
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<string>("orgao_oficial");
  const [referencia, setReferencia] = useState("");
  const [consultaEm, setConsultaEm] = useState(new Date().toISOString().slice(0, 10));
  const [observacao, setObservacao] = useState("");
  const [sigilosa, setSigilosa] = useState(false);
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  const confirmadas = fontes.filter((fonte) => fonte.status === "confirmado").length;

  async function adicionar(evento: React.FormEvent) {
    evento.preventDefault();
    setBusy(true);
    setErro("");
    try {
      await requestJson(`/api/admin/articles/${articleId}/fontes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: nome,
          type: tipo,
          reference: referencia,
          consultedAt: consultaEm,
          note: observacao,
          confidential: sigilosa,
          status: "pendente",
        }),
      });
      setNome("");
      setReferencia("");
      setObservacao("");
      setSigilosa(false);
      router.refresh();
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível salvar a fonte.");
    } finally {
      setBusy(false);
    }
  }

  async function mudarStatus(fonte: SourceRow, status: string) {
    setBusy(true);
    try {
      await requestJson(`/api/admin/articles/${articleId}/fontes/${fonte.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível atualizar.");
    } finally {
      setBusy(false);
    }
  }

  async function remover(fonte: SourceRow) {
    if (!window.confirm(`Remover a fonte "${fonte.name}" da apuração?`)) return;
    setBusy(true);
    try {
      await requestJson(`/api/admin/articles/${articleId}/fontes/${fonte.id}`, { method: "DELETE" });
      router.refresh();
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível remover.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dm-panel">
      <h2>Apuração e fontes</h2>
      <p className="dm-interno">
        Uso interno da redação. Nada desta área é publicado no site.
      </p>

      {exigeConfirmada ? (
        <p className={confirmadas ? "dm-note dm-note-ok" : "dm-aviso"}>
          {confirmadas
            ? `${confirmadas} fonte(s) confirmada(s) — a matéria pode ser aprovada.`
            : "Matéria classificada como notícia: é preciso ao menos uma fonte confirmada para aprovar."}
        </p>
      ) : null}

      {fontes.length ? (
        <ul className="dm-fontes">
          {fontes.map((fonte) => (
            <li key={fonte.id}>
              <div className="dm-fonte-topo">
                <strong>
                  {fonte.confidential ? "🔒 " : ""}
                  {fonte.name}
                </strong>
                <span className={`dm-badge dm-badge-fonte-${fonte.status}`}>
                  {SOURCE_STATUS_LABEL[fonte.status as keyof typeof SOURCE_STATUS_LABEL] ?? fonte.status}
                </span>
              </div>
              <div className="dm-fonte-meta">
                {SOURCE_TYPE_LABEL[fonte.type as keyof typeof SOURCE_TYPE_LABEL] ?? fonte.type}
                {fonte.consultedAt ? ` · consultada em ${fonte.consultedAt}` : ""}
                {fonte.confidential ? " · sob reserva" : ""}
              </div>
              {fonte.reference ? <div className="dm-fonte-ref">{fonte.reference}</div> : null}
              {fonte.note ? <div className="dm-fonte-nota">{fonte.note}</div> : null}
              {!somenteLeitura ? (
                <div className="dm-actions" style={{ marginTop: 8 }}>
                  {SOURCE_STATUSES.filter((status) => status !== fonte.status).map((status) => (
                    <button
                      key={status}
                      type="button"
                      className="dm-btn dm-btn-ghost"
                      disabled={busy}
                      onClick={() => void mudarStatus(fonte, status)}
                    >
                      Marcar {SOURCE_STATUS_LABEL[status].toLowerCase()}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="dm-btn dm-btn-ghost"
                    disabled={busy}
                    onClick={() => void remover(fonte)}
                  >
                    Remover
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="dm-note" style={{ color: "#6b7280" }}>Nenhuma fonte registrada ainda.</p>
      )}

      {!somenteLeitura ? (
        <form onSubmit={adicionar} style={{ marginTop: 18, borderTop: "1px solid #e3e6ea", paddingTop: 16 }}>
          <div className="dm-row">
            <div className="dm-field">
              <label htmlFor="dm-fonte-nome">Fonte</label>
              <input
                id="dm-fonte-nome"
                value={nome}
                required
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Diário Oficial do Município, 12/09"
              />
            </div>
            <div className="dm-field">
              <label htmlFor="dm-fonte-tipo">Tipo</label>
              <select id="dm-fonte-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {SOURCE_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {SOURCE_TYPE_LABEL[item]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="dm-row">
            <div className="dm-field">
              <label htmlFor="dm-fonte-ref">Link ou referência</label>
              <input
                id="dm-fonte-ref"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="URL, número do processo, protocolo"
              />
            </div>
            <div className="dm-field">
              <label htmlFor="dm-fonte-data">Data da consulta</label>
              <input
                id="dm-fonte-data"
                type="date"
                value={consultaEm}
                onChange={(e) => setConsultaEm(e.target.value)}
              />
            </div>
          </div>

          <div className="dm-field">
            <label htmlFor="dm-fonte-obs">Observação editorial</label>
            <input
              id="dm-fonte-obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="O que esta fonte sustenta, o que ficou em aberto"
            />
          </div>

          <label className="dm-check">
            <input type="checkbox" checked={sigilosa} onChange={(e) => setSigilosa(e.target.checked)} />
            <span>Fonte sob reserva — não identificar nem no painel de terceiros</span>
          </label>

          {erro ? <p className="dm-note dm-note-error">{erro}</p> : null}

          <button type="submit" className="dm-btn" disabled={busy}>
            {busy ? "Salvando…" : "Adicionar fonte"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
