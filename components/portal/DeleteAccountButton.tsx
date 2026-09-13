"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { requestJson } from "../../lib/portal/http";

/** Exclusão da própria conta de leitor, com confirmação. */
export function DeleteAccountButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");

  async function apagar() {
    if (
      !window.confirm(
        "Apagar sua conta e sua lista de leitura? A ação é imediata e não pode ser desfeita.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await requestJson("/api/leitor/conta", { method: "DELETE" });
      router.replace("/");
      router.refresh();
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível apagar a conta.");
      setBusy(false);
    }
  }

  return (
    <div className="dm-excluir-conta">
      <h3>Seus dados</h3>
      <p>
        Você pode apagar sua conta a qualquer momento. Isso remove seu cadastro e sua lista de
        leitura dos nossos registros.
      </p>
      {erro ? <p className="dm-note dm-note-error">{erro}</p> : null}
      <button type="button" className="dm-btn dm-btn-ghost" disabled={busy} onClick={() => void apagar()}>
        {busy ? "Apagando…" : "Apagar minha conta"}
      </button>
    </div>
  );
}
