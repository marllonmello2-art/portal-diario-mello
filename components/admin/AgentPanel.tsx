"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { requestJson } from "../../lib/portal/http";

/**
 * Painel do agente editorial.
 *
 * Duas coisas moram aqui: a chave geral que liga e desliga a publicação
 * automática, e a fila do que o agente publicou sem que ninguém tenha olhado
 * ainda. As duas precisam estar na primeira tela do painel — freio escondido
 * não é freio.
 */
export function AgentPanel({
  ligada,
  temChave,
  podeDesligar,
  pendentes,
}: {
  ligada: boolean;
  /** Existe AGENT_API_KEY no Worker? Sem ela, o agente sequer consegue entrar. */
  temChave: boolean;
  podeDesligar: boolean;
  pendentes: { id: string; title: string; slug: string; publishedAt: string | null }[];
}) {
  const router = useRouter();
  const [ativa, setAtiva] = useState(ligada);
  const [busy, setBusy] = useState("");
  const [erro, setErro] = useState("");

  async function alternar() {
    setBusy("switch");
    setErro("");
    try {
      const resposta = await requestJson<{ ligada: boolean }>("/api/admin/automacao", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ligada: !ativa }),
      });
      setAtiva(resposta.ligada);
      router.refresh();
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível mudar a configuração.");
    } finally {
      setBusy("");
    }
  }

  async function conferir(id: string) {
    setBusy(id);
    setErro("");
    try {
      await requestJson(`/api/admin/articles/${id}/conferir`, { method: "POST" });
      router.refresh();
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível registrar a conferência.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="dm-panel">
      <h2>Agente editorial</h2>

      <div className="dm-agente-estado">
        <span
          className={`dm-badge ${!temChave ? "dm-badge-arquivada" : ativa ? "dm-badge-publicada" : "dm-badge-arquivada"}`}
        >
          {!temChave ? "Sem chave de acesso" : ativa ? "Publicando automaticamente" : "Desligado"}
        </span>
        {!temChave ? (
          <p className="dm-note">
            O secret <code>AGENT_API_KEY</code> ainda não existe no Worker. Enquanto isso, a rota do
            agente responde 503 e nada entra por ela.
          </p>
        ) : null}
        <p className="dm-note">
          {ativa
            ? "O agente publica direto o que for explicação ou serviço e passar em todas as travas. Notícia, opinião, análise, correção e patrocinado continuam entrando na fila de revisão."
            : "Tudo o que o agente enviar fica na fila de revisão, esperando uma pessoa."}
        </p>
        {podeDesligar ? (
          <button type="button" className="dm-btn dm-btn-ghost" onClick={alternar} disabled={busy === "switch"}>
            {busy === "switch" ? "Salvando…" : ativa ? "Desligar publicação automática" : "Ligar publicação automática"}
          </button>
        ) : (
          <p className="dm-note">Só editor-chefe e administrador mudam esta chave.</p>
        )}
      </div>

      {erro ? <p className="dm-note dm-note-error">{erro}</p> : null}

      <h3 style={{ marginTop: 22 }}>Publicadas pelo agente, ainda não conferidas</h3>
      {pendentes.length === 0 ? (
        <p className="dm-note">Nada pendente: tudo o que o agente publicou já passou por uma pessoa.</p>
      ) : (
        <table className="dm-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>No ar desde</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pendentes.map((materia) => (
              <tr key={materia.id}>
                <td>
                  <Link href={`/admin/materias/${materia.id}`}>{materia.title}</Link>{" "}
                  <Link href={`/noticia/${materia.slug}`} className="dm-note" target="_blank" rel="noreferrer">
                    ver no site
                  </Link>
                </td>
                <td>{materia.publishedAt ? materia.publishedAt.slice(0, 10).split("-").reverse().join("/") : "—"}</td>
                <td>
                  <button
                    type="button"
                    className="dm-btn dm-btn-ghost"
                    onClick={() => conferir(materia.id)}
                    disabled={busy === materia.id}
                  >
                    {busy === materia.id ? "Registrando…" : "Conferi esta matéria"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
