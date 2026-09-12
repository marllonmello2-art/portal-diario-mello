"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatShort } from "../../lib/portal/format";
import { requestJson } from "../../lib/portal/http";
import {
  REQUEST_KIND_LABEL,
  REQUEST_STATUSES,
  REQUEST_STATUS_LABEL,
  type RequestRow,
} from "../../lib/portal/corrections";

/** Fila de pedidos de correção e direito de resposta. */
export function RequestsQueue({ pedidos }: { pedidos: RequestRow[] }) {
  return (
    <div className="dm-panel">
      <h2>Pedidos recebidos</h2>
      {pedidos.length === 0 ? (
        <p className="dm-note" style={{ color: "#6b7280" }}>
          Nenhum pedido na fila. Os pedidos chegam pelo formulário público de correção e direito de
          resposta.
        </p>
      ) : (
        pedidos.map((pedido) => <RequestCard key={pedido.id} pedido={pedido} />)
      )}
    </div>
  );
}

function RequestCard({ pedido }: { pedido: RequestRow }) {
  const router = useRouter();
  const [nota, setNota] = useState(pedido.internalNote ?? "");
  const [resposta, setResposta] = useState(pedido.response ?? "");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");

  async function atualizar(campos: Record<string, unknown>) {
    setBusy(true);
    setErro("");
    try {
      await requestJson(`/api/admin/pedidos/${pedido.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(campos),
      });
      router.refresh();
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível atualizar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="dm-pedido">
      <div className="dm-pedido-topo">
        <div>
          <strong>{REQUEST_KIND_LABEL[pedido.kind as keyof typeof REQUEST_KIND_LABEL]}</strong>{" "}
          <span className="dm-pedido-protocolo">{pedido.protocol}</span>
        </div>
        <span className={`dm-badge dm-badge-${pedido.status}`}>
          {REQUEST_STATUS_LABEL[pedido.status as keyof typeof REQUEST_STATUS_LABEL] ?? pedido.status}
        </span>
      </div>

      <div className="dm-fonte-meta">
        {pedido.requesterName} · {pedido.requesterEmail}
        {pedido.requesterRole ? ` · ${pedido.requesterRole}` : ""} · recebido em{" "}
        {formatShort(pedido.createdAt)}
      </div>

      {pedido.articleUrl ? <div className="dm-fonte-ref">{pedido.articleUrl}</div> : null}

      <p className="dm-pedido-claim">{pedido.claim}</p>
      {pedido.evidence ? <div className="dm-fonte-ref">Prova: {pedido.evidence}</div> : null}

      <div className="dm-field">
        <label htmlFor={`nota-${pedido.id}`}>Nota interna</label>
        <input
          id={`nota-${pedido.id}`}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="O que a checagem encontrou"
        />
      </div>

      <div className="dm-field">
        <label htmlFor={`resposta-${pedido.id}`}>Resposta ao solicitante</label>
        <textarea
          id={`resposta-${pedido.id}`}
          value={resposta}
          onChange={(e) => setResposta(e.target.value)}
          placeholder="Texto que será enviado por e-mail ao solicitante"
          style={{ minHeight: 90 }}
        />
        <small>
          O envio do e-mail ainda é manual: copie daqui e responda pelo e-mail da redação.
        </small>
      </div>

      {erro ? <p className="dm-note dm-note-error">{erro}</p> : null}

      <div className="dm-actions">
        <button
          type="button"
          className="dm-btn"
          disabled={busy}
          onClick={() => void atualizar({ internalNote: nota, response: resposta })}
        >
          Salvar
        </button>
        {REQUEST_STATUSES.filter((status) => status !== pedido.status).map((status) => (
          <button
            key={status}
            type="button"
            className="dm-btn dm-btn-ghost"
            disabled={busy}
            onClick={() => void atualizar({ status, internalNote: nota, response: resposta })}
          >
            {REQUEST_STATUS_LABEL[status]}
          </button>
        ))}
      </div>
    </article>
  );
}
