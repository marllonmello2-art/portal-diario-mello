"use client";

import { useState } from "react";
import { requestJson } from "../../lib/portal/http";

/**
 * Pedido de correção ou de direito de resposta.
 *
 * Devolve o protocolo na própria tela: é o comprovante de que o pedido entrou,
 * e o número que o solicitante usa para cobrar a resposta.
 */
export function CorrectionForm() {
  const [kind, setKind] = useState("correcao");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [qualidade, setQualidade] = useState("");
  const [endereco, setEndereco] = useState("");
  const [relato, setRelato] = useState("");
  const [prova, setProva] = useState("");
  const [protocolo, setProtocolo] = useState("");
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setBusy(true);
    setErro("");
    try {
      const data = await requestJson<{ protocolo: string }>("/api/correcoes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          requesterName: nome,
          requesterEmail: email,
          requesterRole: qualidade,
          articleUrl: endereco,
          claim: relato,
          evidence: prova,
        }),
      });
      setProtocolo(data.protocolo);
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível enviar o pedido.");
    } finally {
      setBusy(false);
    }
  }

  if (protocolo) {
    return (
      <div className="dm-protocolo">
        <span className="dm-kicker">Pedido recebido</span>
        <strong>{protocolo}</strong>
        <p>
          Guarde este protocolo. A redação analisa o pedido e responde no e-mail informado em até
          cinco dias úteis. Se o erro for evidente, a correção sai antes disso.
        </p>
      </div>
    );
  }

  return (
    <form className="dm-form-publico" onSubmit={enviar}>
      <div className="dm-field">
        <label htmlFor="dm-pedido-tipo">Tipo de pedido</label>
        <select id="dm-pedido-tipo" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="correcao">Correção de informação</option>
          <option value="direito_resposta">Direito de resposta</option>
        </select>
        <small>
          Correção é para erro de fato. Direito de resposta é para quem foi ofendido ou teve imagem
          atingida por informação incorreta.
        </small>
      </div>

      <div className="dm-field">
        <label htmlFor="dm-pedido-nome">Seu nome completo</label>
        <input id="dm-pedido-nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>

      <div className="dm-field">
        <label htmlFor="dm-pedido-email">E-mail para resposta</label>
        <input
          id="dm-pedido-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="dm-field">
        <label htmlFor="dm-pedido-qualidade">Em que qualidade escreve</label>
        <input
          id="dm-pedido-qualidade"
          value={qualidade}
          onChange={(e) => setQualidade(e.target.value)}
          placeholder="Pessoa citada, assessoria, advogado, leitor…"
        />
      </div>

      <div className="dm-field">
        <label htmlFor="dm-pedido-url">Endereço da matéria</label>
        <input
          id="dm-pedido-url"
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
          placeholder="https://…"
        />
      </div>

      <div className="dm-field">
        <label htmlFor="dm-pedido-relato">O que está incorreto</label>
        <textarea
          id="dm-pedido-relato"
          required
          value={relato}
          onChange={(e) => setRelato(e.target.value)}
          placeholder="Cite o trecho exato e explique o que deveria constar."
          style={{ minHeight: 140 }}
        />
        <small>Quanto mais específico, mais rápido conseguimos checar.</small>
      </div>

      <div className="dm-field">
        <label htmlFor="dm-pedido-prova">Documento ou link que sustenta o pedido</label>
        <input
          id="dm-pedido-prova"
          value={prova}
          onChange={(e) => setProva(e.target.value)}
          placeholder="Link, número de processo, protocolo"
        />
      </div>

      {erro ? <p className="dm-note dm-note-error">{erro}</p> : null}

      <button type="submit" className="dm-btn" disabled={busy}>
        {busy ? "Enviando…" : "Enviar pedido"}
      </button>
    </form>
  );
}
