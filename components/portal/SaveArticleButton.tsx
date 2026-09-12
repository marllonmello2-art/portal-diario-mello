"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { requestJson } from "../../lib/portal/http";

/**
 * Botão "salvar para ler depois".
 *
 * Para visitante sem conta ele vira um convite: leva para o cadastro e volta
 * para a matéria depois — ninguém perde o texto que estava lendo.
 */
export function SaveArticleButton({
  articleId,
  articleSlug,
  initialSaved,
  loggedIn,
}: {
  articleId: string;
  articleSlug: string;
  initialSaved: boolean;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!loggedIn) {
      router.push(`/criar-conta?voltar_para=${encodeURIComponent(`/noticia/${articleSlug}`)}`);
      return;
    }
    setBusy(true);
    try {
      const next = !saved;
      await requestJson("/api/leitor/salvos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ articleId, saved: next }),
      });
      setSaved(next);
    } catch {
      /* silencioso: o estado volta ao anterior na próxima renderização */
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={toggle} disabled={busy} aria-pressed={saved}>
      {saved ? "★ Salva" : "☆ Salvar"}
    </button>
  );
}
