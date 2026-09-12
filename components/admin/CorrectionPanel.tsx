"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDateTime } from "../../lib/portal/format";
import { requestJson } from "../../lib/portal/http";
import type { CorrectionRow } from "../../lib/portal/corrections";

/**
 * Registro de correção numa matéria publicada.
 *
 * A nota entra no pé do texto, visível ao leitor, e a matéria passa ao estado
 * CORRIGIDA. Não existe caminho para mudar fato publicado sem deixar rastro.
 */
export function CorrectionPanel({
  articleId,
  correcoes,
  podeCorrigir,
  publicada,
}: {
  articleId: string;
  correcoes: CorrectionRow[];
  podeCorrigir: boolean;
  publicada: boolean;
}) {
  const router = useRouter();
  const [descricao, setDescricao] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");

  async function registrar(evento: React.FormEvent) {
    evento.preventDefault();
    setBusy(true);
    setErro("");
    try {
      await requestJson(`/api/admin/articles/${articleId}/correcoes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: descricao }),
      });
      setDescricao("");
      router.refresh();
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível registrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dm-panel">
      <h2>Correções publicadas</h2>

      {correcoes.length ? (
        <ol className="dm-trilha">
          {correcoes.map((correcao) => (
            <li key={correcao.id}>
              <div className="dm-trilha-topo">
                <strong>Correção</strong>
                <span>{formatDateTime(correcao.createdAt)}</span>
              </div>
              <div className="dm-trilha-corpo">{correcao.description}</div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="dm-note" style={{ color: "#6b7280" }}>
          Nenhuma correção registrada nesta matéria.
        </p>
      )}

      {podeCorrigir && publicada ? (
        <form onSubmit={registrar} style={{ marginTop: 14 }}>
          <div className="dm-field">
            <label htmlFor="dm-correcao">Nova correção</label>
            <textarea
              id="dm-correcao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: onde se lia R$ 1,2 milhão, leia-se R$ 1,2 bilhão. O valor foi corrigido no terceiro parágrafo."
              style={{ minHeight: 90 }}
            />
            <small>
              Aparece no pé da matéria, com data e hora. Corrija também o texto acima antes de
              registrar.
            </small>
          </div>
          {erro ? <p className="dm-note dm-note-error">{erro}</p> : null}
          <button type="submit" className="dm-btn" disabled={busy || descricao.trim().length < 10}>
            {busy ? "Registrando…" : "Registrar correção"}
          </button>
        </form>
      ) : publicada ? (
        <p className="dm-note" style={{ color: "#6b7280", marginTop: 10 }}>
          Registrar correção em matéria publicada é do editor-chefe.
        </p>
      ) : null}
    </div>
  );
}
