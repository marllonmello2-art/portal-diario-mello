"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { requestJson } from "../../lib/portal/http";
import { ROLES, ROLE_DESCRIPTION, ROLE_LABEL, type Role } from "../../lib/portal/permissions";

export type Pessoa = {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  lastLoginAt: string | null;
};

/** Cadastro de quem tem acesso ao painel e com quais perfis. */
export function PeopleManager({ pessoas, meuId }: { pessoas: Pessoa[]; meuId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [papeis, setPapeis] = useState<Role[]>(["AUTOR"]);
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  function alterna(role: Role) {
    setPapeis((atual) =>
      atual.includes(role) ? atual.filter((item) => item !== role) : [...atual, role],
    );
  }

  async function criar(evento: React.FormEvent) {
    evento.preventDefault();
    setBusy(true);
    setErro("");
    try {
      await requestJson("/api/admin/pessoas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name: nome, password: senha, roles: papeis }),
      });
      setEmail("");
      setNome("");
      setSenha("");
      setPapeis(["AUTOR"]);
      router.refresh();
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível cadastrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="dm-panel">
        <h2>Nova pessoa</h2>
        <form onSubmit={criar}>
          <div className="dm-row">
            <div className="dm-field">
              <label htmlFor="dm-pessoa-nome">Nome</label>
              <input id="dm-pessoa-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="dm-field">
              <label htmlFor="dm-pessoa-email">E-mail</label>
              <input
                id="dm-pessoa-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="dm-field">
            <label htmlFor="dm-pessoa-senha">Senha provisória</label>
            <input
              id="dm-pessoa-senha"
              type="text"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Mínimo de 10 caracteres"
            />
            <small>Combine com a pessoa e peça para trocar depois do primeiro acesso.</small>
          </div>

          <div className="dm-field">
            <label>Perfis</label>
            <div className="dm-perfis">
              {ROLES.map((role) => (
                <label key={role} className="dm-perfil">
                  <input
                    type="checkbox"
                    checked={papeis.includes(role)}
                    onChange={() => alterna(role)}
                  />
                  <span>
                    <b>{ROLE_LABEL[role]}</b>
                    <small>{ROLE_DESCRIPTION[role]}</small>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {erro ? <p className="dm-note dm-note-error">{erro}</p> : null}
          <button type="submit" className="dm-btn" disabled={busy}>
            {busy ? "Cadastrando…" : "Cadastrar pessoa"}
          </button>
        </form>
      </div>

      {pessoas.map((pessoa) => (
        <PessoaCard key={pessoa.id} pessoa={pessoa} ehVoce={pessoa.id === meuId} />
      ))}
    </>
  );
}

function PessoaCard({ pessoa, ehVoce }: { pessoa: Pessoa; ehVoce: boolean }) {
  const router = useRouter();
  const [papeis, setPapeis] = useState<Role[]>(pessoa.roles.filter((role): role is Role =>
    (ROLES as readonly string[]).includes(role),
  ));
  const [novaSenha, setNovaSenha] = useState("");
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  function alterna(role: Role) {
    setPapeis((atual) =>
      atual.includes(role) ? atual.filter((item) => item !== role) : [...atual, role],
    );
  }

  async function salvar() {
    setBusy(true);
    setErro("");
    try {
      await requestJson(`/api/admin/pessoas/${pessoa.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roles: papeis, password: novaSenha || undefined }),
      });
      setNovaSenha("");
      router.refresh();
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function remover() {
    if (!window.confirm(`Remover o acesso de ${pessoa.email}?`)) return;
    setBusy(true);
    setErro("");
    try {
      await requestJson(`/api/admin/pessoas/${pessoa.id}`, { method: "DELETE" });
      router.refresh();
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível remover.");
      setBusy(false);
    }
  }

  return (
    <div className="dm-panel">
      <h2>
        {pessoa.name || pessoa.email} {ehVoce ? <span className="dm-badge dm-badge-aprovada">você</span> : null}
      </h2>
      <p className="dm-note" style={{ color: "#6b7280", marginTop: -6 }}>{pessoa.email}</p>

      <div className="dm-field">
        <label>Perfis</label>
        <div className="dm-perfis">
          {ROLES.map((role) => (
            <label key={role} className="dm-perfil">
              <input type="checkbox" checked={papeis.includes(role)} onChange={() => alterna(role)} />
              <span>
                <b>{ROLE_LABEL[role]}</b>
                <small>{ROLE_DESCRIPTION[role]}</small>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="dm-field">
        <label htmlFor={`senha-${pessoa.id}`}>Trocar a senha</label>
        <input
          id={`senha-${pessoa.id}`}
          type="text"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          placeholder="Deixe em branco para manter"
        />
      </div>

      {erro ? <p className="dm-note dm-note-error">{erro}</p> : null}

      <div className="dm-actions">
        <button type="button" className="dm-btn" disabled={busy} onClick={() => void salvar()}>
          Salvar
        </button>
        {!ehVoce ? (
          <button type="button" className="dm-btn dm-btn-ghost" disabled={busy} onClick={() => void remover()}>
            Remover acesso
          </button>
        ) : null}
      </div>
    </div>
  );
}
