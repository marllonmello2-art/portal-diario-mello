"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import { renderMarkdown } from "../../lib/portal/markdown";
import {
  CLASSIFICATIONS,
  CLASSIFICATION_HINT,
  CLASSIFICATION_LABEL,
} from "../../lib/portal/classification";
import { requestJson } from "../../lib/portal/http";
import { Img } from "../portal/Img";

type Option = { id: string; name: string };

export type EditorArticle = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  content: string;
  coverImageUrl: string | null;
  coverCredit: string | null;
  categoryId: string | null;
  authorId: string | null;
  status: string;
  accessLevel: string;
  featured: number;
  publishedAt: string | null;
  origin: string;
  aiAssisted: number;
  classification: string;
  coverSource: string | null;
  coverLicense: string | null;
  coverObtainedAt: string | null;
  coverUsageNote: string | null;
  coverAiGenerated: number;
};

/**
 * Editor de matéria (criação e edição).
 *
 * O texto é escrito em Markdown e a pré-visualização usa o mesmo renderizador
 * do site, então o que aparece aqui é o que vai ao ar.
 */
export function ArticleEditor({
  categories,
  authors,
  article,
  initialTags,
  readOnly = false,
  readOnlyReason,
}: {
  categories: Option[];
  authors: Option[];
  article?: EditorArticle;
  initialTags?: string[];
  /** O servidor já decidiu que esta pessoa não pode editar neste estado. */
  readOnly?: boolean;
  readOnlyReason?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(article?.title ?? "");
  const [subtitle, setSubtitle] = useState(article?.subtitle ?? "");
  const [content, setContent] = useState(article?.content ?? "");
  const [categoryId, setCategoryId] = useState(article?.categoryId ?? "");
  const [authorId, setAuthorId] = useState(article?.authorId ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(article?.coverImageUrl ?? "");
  const [coverCredit, setCoverCredit] = useState(article?.coverCredit ?? "");
  const [tags, setTags] = useState((initialTags ?? []).join(", "));
  const [featured, setFeatured] = useState(Boolean(article?.featured));
  const [accessLevel, setAccessLevel] = useState(article?.accessLevel ?? "public");
  const [classification, setClassification] = useState(article?.classification ?? "NOTICIA");
  const [coverSource, setCoverSource] = useState(article?.coverSource ?? "");
  const [coverLicense, setCoverLicense] = useState(article?.coverLicense ?? "");
  const [coverObtainedAt, setCoverObtainedAt] = useState(article?.coverObtainedAt ?? "");
  const [coverUsageNote, setCoverUsageNote] = useState(article?.coverUsageNote ?? "");
  const [coverAiGenerated, setCoverAiGenerated] = useState(Boolean(article?.coverAiGenerated));
  const [tab, setTab] = useState<"editor" | "preview">("editor");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const preview = useMemo(() => renderMarkdown(content), [content]);

  async function uploadCover(file: File) {
    setBusy("upload");
    setMessage(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("kind", "capa");
      // A papelada de direitos viaja junto com o arquivo: o acervo nasce documentado.
      form.set("credit", coverCredit);
      form.set("source", coverSource);
      form.set("license", coverLicense);
      form.set("obtainedAt", coverObtainedAt);
      form.set("usageNote", coverUsageNote);
      form.set("aiGenerated", coverAiGenerated ? "1" : "0");
      const data = await requestJson<{ url?: string }>("/api/admin/upload", {
        method: "POST",
        body: form,
      });
      if (!data.url) throw new Error("Falha no upload.");
      setCoverImageUrl(data.url);
      setMessage({ type: "ok", text: "Imagem de capa enviada." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Falha no upload." });
    } finally {
      setBusy("");
    }
  }

  async function save() {
    if (!title.trim() || !content.trim()) {
      setMessage({ type: "error", text: "Título e texto são obrigatórios." });
      return;
    }

    setBusy("salvar");
    setMessage(null);
    const payload = {
      title,
      subtitle,
      content,
      categoryId: categoryId || null,
      authorId: authorId || null,
      coverImageUrl: coverImageUrl || null,
      coverCredit: coverCredit || null,
      coverSource: coverSource || null,
      coverLicense: coverLicense || null,
      coverObtainedAt: coverObtainedAt || null,
      coverUsageNote: coverUsageNote || null,
      coverAiGenerated,
      classification,
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      accessLevel,
      featured,
    };

    try {
      const data = await requestJson<{ article?: { id: string } }>(
        article ? `/api/admin/articles/${article.id}` : "/api/admin/articles",
        {
          method: article ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!article && data.article?.id) {
        router.replace(`/admin/materias/${data.article.id}`);
        router.refresh();
        return;
      }
      setMessage({ type: "ok", text: "Alterações salvas." });
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erro ao salvar." });
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <div className="dm-admin-head">
        <h1>{article ? "Editar matéria" : "Nova matéria"}</h1>
        <div className="dm-actions">
          {article && (article.status === "PUBLICADA" || article.status === "CORRIGIDA") ? (
            <Link href={`/noticia/${article.slug}`} target="_blank" className="dm-btn dm-btn-ghost">
              Ver no site ↗
            </Link>
          ) : null}
          <button
            type="button"
            className="dm-btn"
            disabled={Boolean(busy) || readOnly}
            onClick={() => void save()}
          >
            {busy === "salvar" ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>

      {readOnly ? (
        <p className="dm-aviso">
          {readOnlyReason ?? "Você não pode editar esta matéria neste estado."}
        </p>
      ) : null}

      {article?.origin === "integracao" || article?.aiAssisted ? (
        <p className="dm-aviso dm-aviso-ia">
          Texto com assistência de IA. Confira fontes, números, nomes e citações antes de aprovar —
          o registro deste uso fica na auditoria.
        </p>
      ) : null}

      {message ? (
        <p className={`dm-note ${message.type === "error" ? "dm-note-error" : "dm-note-ok"}`}>
          {message.text}
        </p>
      ) : null}

      <div className="dm-editor-layout">
        <div className="dm-panel">
          <div className="dm-field">
            <label htmlFor="dm-title">Título</label>
            <input id="dm-title" value={title} disabled={readOnly} onChange={(event) => setTitle(event.target.value)} />
          </div>

          <div className="dm-field">
            <label htmlFor="dm-subtitle">Linha fina</label>
            <input
              id="dm-subtitle"
              value={subtitle}
              onChange={(event) => setSubtitle(event.target.value)}
              placeholder="Resumo de uma linha que aparece abaixo do título"
            />
          </div>

          <div className="dm-toolbar" role="tablist">
            <button
              type="button"
              className={`dm-btn ${tab === "editor" ? "" : "dm-btn-ghost"}`}
              onClick={() => setTab("editor")}
            >
              Texto (Markdown)
            </button>
            <button
              type="button"
              className={`dm-btn ${tab === "preview" ? "" : "dm-btn-ghost"}`}
              onClick={() => setTab("preview")}
            >
              Pré-visualizar
            </button>
          </div>

          {tab === "editor" ? (
            <div className="dm-field">
              <label htmlFor="dm-content">Corpo da matéria</label>
              <textarea
                id="dm-content"
                disabled={readOnly}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={"## Subtítulo\n\nEscreva aqui. **Negrito**, *itálico*, [links](https://exemplo.com), listas e citações com >."}
              />
              <small>Markdown: ## subtítulo · **negrito** · *itálico* · - lista · &gt; citação</small>
            </div>
          ) : (
            <div className="dm-prose" dangerouslySetInnerHTML={{ __html: preview }} />
          )}
        </div>

        <aside>
          <div className="dm-panel">
            <h2>Ficha da matéria</h2>
            <div className="dm-field">
              <label htmlFor="dm-category">Editoria</label>
              <select id="dm-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                <option value="">Sem editoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="dm-field">
              <label htmlFor="dm-author">Autor</label>
              <select id="dm-author" value={authorId} onChange={(event) => setAuthorId(event.target.value)}>
                <option value="">Sem assinatura</option>
                {authors.map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="dm-field">
              <label htmlFor="dm-classificacao">O que é esta publicação</label>
              <select
                id="dm-classificacao"
                value={classification}
                disabled={readOnly}
                onChange={(event) => setClassification(event.target.value)}
              >
                {CLASSIFICATIONS.map((item) => (
                  <option key={item} value={item}>
                    {CLASSIFICATION_LABEL[item]}
                  </option>
                ))}
              </select>
              <small>{CLASSIFICATION_HINT[classification as keyof typeof CLASSIFICATION_HINT]}</small>
            </div>

            <div className="dm-field">
              <label htmlFor="dm-access">Quem pode ler</label>
              <select
                id="dm-access"
                value={accessLevel}
                onChange={(event) => setAccessLevel(event.target.value)}
              >
                <option value="public">Aberta — qualquer visitante</option>
                <option value="registered">Exclusiva — só quem tem conta gratuita</option>
              </select>
              <small>
                Na exclusiva, quem não tem conta vê os primeiros parágrafos e um convite para se
                cadastrar.
              </small>
            </div>

            <div className="dm-field">
              <label htmlFor="dm-tags">Tags</label>
              <input
                id="dm-tags"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="eleições, orçamento, câmara"
              />
              <small>Separe por vírgula.</small>
            </div>

            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, marginBottom: 14 }}>
              <input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} />
              Destaque principal da capa
            </label>

          </div>

          <div className="dm-panel">
            <h2>Imagem de capa</h2>
            {coverImageUrl ? (
              <Img src={coverImageUrl} alt="Pré-visualização da capa" className="dm-cover-preview" />
            ) : (
              <div className="dm-cover-preview" />
            )}
            <div className="dm-field" style={{ marginTop: 12 }}>
              <label htmlFor="dm-cover-file">Enviar imagem (R2)</label>
              <input
                id="dm-cover-file"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadCover(file);
                }}
              />
              {busy === "upload" ? <small>Enviando…</small> : null}
            </div>
            <div className="dm-field">
              <label htmlFor="dm-cover-url">Ou cole uma URL</label>
              <input
                id="dm-cover-url"
                value={coverImageUrl}
                onChange={(event) => setCoverImageUrl(event.target.value)}
                placeholder="https://…"
              />
            </div>
            <label className="dm-check">
              <input
                type="checkbox"
                checked={coverAiGenerated}
                disabled={readOnly}
                onChange={(event) => setCoverAiGenerated(event.target.checked)}
              />
              <span>Imagem ilustrativa gerada por IA</span>
            </label>

            {coverAiGenerated ? (
              <p className="dm-note" style={{ color: "#6b7280" }}>
                A capa será creditada como “Imagem ilustrativa gerada por IA”.
              </p>
            ) : (
              <>
                <div className="dm-field">
                  <label htmlFor="dm-cover-credit">Crédito do autor *</label>
                  <input
                    id="dm-cover-credit"
                    value={coverCredit}
                    disabled={readOnly}
                    onChange={(event) => setCoverCredit(event.target.value)}
                    placeholder="Foto: Nome do fotógrafo"
                  />
                </div>

                <div className="dm-field">
                  <label htmlFor="dm-cover-source">Origem *</label>
                  <input
                    id="dm-cover-source"
                    value={coverSource}
                    disabled={readOnly}
                    onChange={(event) => setCoverSource(event.target.value)}
                    placeholder="Agência Brasil, arquivo pessoal, assessoria…"
                  />
                </div>
              </>
            )}

            <div className="dm-field">
              <label htmlFor="dm-cover-license">Licença ou autorização</label>
              <input
                id="dm-cover-license"
                value={coverLicense}
                disabled={readOnly}
                onChange={(event) => setCoverLicense(event.target.value)}
                placeholder="CC BY 4.0, uso autorizado por e-mail, banco licenciado…"
              />
            </div>

            <div className="dm-row">
              <div className="dm-field">
                <label htmlFor="dm-cover-obtained">Data de obtenção</label>
                <input
                  id="dm-cover-obtained"
                  type="date"
                  value={coverObtainedAt}
                  disabled={readOnly}
                  onChange={(event) => setCoverObtainedAt(event.target.value)}
                />
              </div>
              <div className="dm-field">
                <label htmlFor="dm-cover-note">Observação de uso</label>
                <input
                  id="dm-cover-note"
                  value={coverUsageNote}
                  disabled={readOnly}
                  onChange={(event) => setCoverUsageNote(event.target.value)}
                  placeholder="Restrições, prazo, obrigação de crédito"
                />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
