"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BRAND } from "../../lib/portal/brand";
import { requestJson } from "../../lib/portal/http";

/**
 * Entrar ou criar a conta gratuita de leitor.
 *
 * A mesma tela serve aos dois modos: quem chega pelo convite de uma matéria
 * exclusiva cai direto em "criar conta", e quem já tem conta troca de aba.
 */
export function ReaderAuthForm({
  mode,
  returnTo,
}: {
  mode: "entrar" | "criar";
  returnTo: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"entrar" | "criar">(mode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const endpoint = tab === "criar" ? "/api/leitor/cadastro" : "/api/leitor/sessao";
      await requestJson(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(tab === "criar" ? { name, email, password } : { email, password }),
      });
      router.replace(returnTo);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível continuar.");
      setBusy(false);
    }
  }

  return (
    <div className="dm-reader-auth">
      <div className="dm-toolbar" role="tablist" style={{ marginBottom: 18 }}>
        <button
          type="button"
          className={`dm-btn ${tab === "entrar" ? "" : "dm-btn-ghost"}`}
          onClick={() => setTab("entrar")}
        >
          Entrar
        </button>
        <button
          type="button"
          className={`dm-btn ${tab === "criar" ? "" : "dm-btn-ghost"}`}
          onClick={() => setTab("criar")}
        >
          Criar conta gratuita
        </button>
      </div>

      <form onSubmit={submit}>
        {tab === "criar" ? (
          <div className="dm-field">
            <label htmlFor="dm-reader-name">Como quer ser chamado</label>
            <input
              id="dm-reader-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Seu nome"
            />
          </div>
        ) : null}

        <div className="dm-field">
          <label htmlFor="dm-reader-email">E-mail</label>
          <input
            id="dm-reader-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="dm-field">
          <label htmlFor="dm-reader-password">Senha</label>
          <input
            id="dm-reader-password"
            type="password"
            required
            autoComplete={tab === "criar" ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {tab === "criar" ? <small>Mínimo de 8 caracteres.</small> : null}
        </div>

        {error ? <p className="dm-note dm-note-error">{error}</p> : null}

        <button type="submit" className="dm-btn" disabled={busy} style={{ width: "100%" }}>
          {busy ? "Aguarde…" : tab === "criar" ? "Criar minha conta" : "Entrar"}
        </button>
      </form>

      <p className="dm-note" style={{ marginTop: 16, color: "#6b7280" }}>
        A conta do {BRAND.name} é gratuita e serve para salvar matérias e ler o conteúdo
        exclusivo. Não cobramos nada e não enviamos spam — veja a{" "}
        <Link href="/privacidade" style={{ textDecoration: "underline" }}>
          política de privacidade
        </Link>
        .
      </p>
    </div>
  );
}
