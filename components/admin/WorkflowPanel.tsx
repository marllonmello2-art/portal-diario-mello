"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { requestJson } from "../../lib/portal/http";
import { STATUS_LABEL, type Status } from "../../lib/portal/permissions";

/**
 * Fluxo editorial de uma matéria.
 *
 * Os botões vêm do servidor: são exatamente as transições que a máquina de
 * estados permite para o estado atual e para o papel de quem está logado. Se
 * a lista chegar vazia, é porque não há nada que esta pessoa possa fazer agora.
 */
export function WorkflowPanel({
  articleId,
  status,
  transitions,
  scheduledFor,
}: {
  articleId: string;
  status: Status;
  transitions: Status[];
  scheduledFor: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [quando, setQuando] = useState(scheduledFor);
  const [busy, setBusy] = useState<string>("");
  const [erro, setErro] = useState("");

  async function mover(to: Status) {
    setBusy(to);
    setErro("");
    try {
      await requestJson(`/api/admin/articles/${articleId}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          to,
          note: note.trim() || null,
          scheduledFor: to === "AGENDADA" ? new Date(quando).toISOString() : null,
        }),
      });
      setNote("");
      router.refresh();
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível mudar o estado.");
    } finally {
      setBusy("");
    }
  }

  const vaiAoAr = transitions.includes("PUBLICADA") || transitions.includes("CORRIGIDA");

  return (
    <div className="dm-panel">
      <h2>Fluxo editorial</h2>

      <p className="dm-fluxo-atual">
        Estado atual: <strong>{STATUS_LABEL[status]}</strong>
      </p>

      {transitions.includes("AGENDADA") ? (
        <div className="dm-field">
          <label htmlFor="dm-agendar">Data do agendamento</label>
          <input
            id="dm-agendar"
            type="datetime-local"
            value={quando}
            onChange={(evento) => setQuando(evento.target.value)}
          />
        </div>
      ) : null}

      <div className="dm-field">
        <label htmlFor="dm-nota">Nota para o histórico</label>
        <input
          id="dm-nota"
          value={note}
          onChange={(evento) => setNote(evento.target.value)}
          placeholder="Ex.: checado com a assessoria por telefone"
        />
        <small>Fica registrada na auditoria junto com a mudança.</small>
      </div>

      {transitions.length ? (
        <div className="dm-actions">
          {transitions.map((destino) => (
            <button
              key={destino}
              type="button"
              className={`dm-btn ${destino === "PUBLICADA" ? "" : "dm-btn-ghost"}`}
              disabled={Boolean(busy)}
              onClick={() => void mover(destino)}
            >
              {busy === destino ? "Movendo…" : `→ ${STATUS_LABEL[destino]}`}
            </button>
          ))}
        </div>
      ) : (
        <p className="dm-note" style={{ color: "#6b7280" }}>
          Nenhuma ação disponível para o seu perfil neste estado.
        </p>
      )}

      {vaiAoAr ? (
        <p className="dm-note" style={{ marginTop: 12, color: "#6b7280" }}>
          Publicar é decisão do editor-chefe e fica registrada com seu nome e horário.
        </p>
      ) : null}

      {erro ? <p className="dm-note dm-note-error">{erro}</p> : null}
    </div>
  );
}
