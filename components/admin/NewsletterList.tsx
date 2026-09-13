"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatShort } from "../../lib/portal/format";
import { requestJson } from "../../lib/portal/http";
import type { SubscriberRow } from "../../lib/portal/newsletter";

const STATUS_LABEL: Record<string, string> = {
  pendente: "Aguardando confirmação",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
};

/**
 * Base do boletim.
 *
 * Enquanto não houver serviço de e-mail ligado, o link de confirmação aparece
 * aqui para a redação enviar à mão — a pessoa continua sendo quem confirma.
 */
export function NewsletterList({ assinantes, origem }: { assinantes: SubscriberRow[]; origem: string }) {
  const router = useRouter();
  const [copiado, setCopiado] = useState("");
  const [busy, setBusy] = useState("");

  async function copiar(token: string, id: string) {
    try {
      await navigator.clipboard.writeText(`${origem}/newsletter/confirmar?token=${token}`);
      setCopiado(id);
      setTimeout(() => setCopiado(""), 2500);
    } catch {
      setCopiado("");
    }
  }

  async function apagar(assinante: SubscriberRow) {
    if (!window.confirm(`Apagar definitivamente o registro de ${assinante.email}?`)) return;
    setBusy(assinante.id);
    try {
      await requestJson(`/api/admin/newsletter/${assinante.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy("");
    }
  }

  if (!assinantes.length) {
    return (
      <div className="dm-panel">
        <p className="dm-note" style={{ color: "#6b7280" }}>
          Nenhuma inscrição ainda. O formulário fica no rodapé do site.
        </p>
      </div>
    );
  }

  return (
    <div className="dm-panel">
      <table className="dm-table">
        <thead>
          <tr>
            <th>E-mail</th>
            <th>Situação</th>
            <th>Origem</th>
            <th>Inscrição</th>
            <th aria-label="Ações" />
          </tr>
        </thead>
        <tbody>
          {assinantes.map((assinante) => (
            <tr key={assinante.id}>
              <td>{assinante.email}</td>
              <td>
                <span className={`dm-badge dm-badge-${assinante.status === "confirmado" ? "publicada" : assinante.status === "cancelado" ? "arquivada" : "revisao"}`}>
                  {STATUS_LABEL[assinante.status] ?? assinante.status}
                </span>
              </td>
              <td>{assinante.source}</td>
              <td>{formatShort(assinante.createdAt)}</td>
              <td>
                <div className="dm-actions">
                  {assinante.status === "pendente" && assinante.token ? (
                    <button
                      type="button"
                      className="dm-btn dm-btn-ghost"
                      onClick={() => void copiar(assinante.token as string, assinante.id)}
                    >
                      {copiado === assinante.id ? "Link copiado ✓" : "Copiar link de confirmação"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="dm-btn dm-btn-ghost"
                    disabled={busy === assinante.id}
                    onClick={() => void apagar(assinante)}
                  >
                    Apagar dados
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
