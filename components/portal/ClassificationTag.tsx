import {
  CLASSIFICATION_LABEL,
  CLASSIFICATION_NOTICE,
  type Classification,
} from "../../lib/portal/classification";

/**
 * Etiqueta que diz ao leitor o que ele está lendo.
 *
 * Notícia é o padrão do portal e não ganha etiqueta — o que precisa de aviso é
 * o que foge disso: opinião, material pago, comunicado, análise e correção.
 */
export function ClassificationTag({ classification }: { classification: string }) {
  if (classification === "NOTICIA") return null;
  const rotulo = CLASSIFICATION_LABEL[classification as Classification];
  if (!rotulo) return null;

  return (
    <span className={`dm-classe dm-classe-${classification.toLowerCase()}`}>{rotulo}</span>
  );
}

/** Aviso completo, no alto do texto da matéria. */
export function ClassificationNotice({
  classification,
  authorName,
}: {
  classification: string;
  authorName?: string | null;
}) {
  const aviso = CLASSIFICATION_NOTICE[classification as Classification];
  if (!aviso) return null;

  return (
    <aside className={`dm-aviso-publico dm-aviso-${classification.toLowerCase()}`}>
      <strong>{CLASSIFICATION_LABEL[classification as Classification]}</strong>
      <p>
        {aviso}
        {classification === "OPINIAO" && authorName ? ` Assina: ${authorName}.` : ""}
      </p>
    </aside>
  );
}
