/**
 * Classificação da publicação.
 *
 * Toda matéria declara o que é, e o site diz isso ao leitor. Essa é a parte da
 * transparência que não pode ficar só no painel: o leitor precisa saber se está
 * lendo apuração, opinião ou material pago antes de formar juízo.
 */

export const CLASSIFICATIONS = [
  "NOTICIA",
  "EXPLICATIVO",
  "OPINIAO",
  "PATROCINADO",
  "COMUNICADO",
  "ANALISE",
  "CORRECAO",
] as const;

export type Classification = (typeof CLASSIFICATIONS)[number];

export function isClassification(value: string): value is Classification {
  return (CLASSIFICATIONS as readonly string[]).includes(value);
}

export const CLASSIFICATION_LABEL: Record<Classification, string> = {
  NOTICIA: "Notícia",
  EXPLICATIVO: "Explicação e serviço",
  OPINIAO: "Opinião",
  PATROCINADO: "Conteúdo patrocinado",
  COMUNICADO: "Comunicado / assessoria",
  ANALISE: "Análise",
  CORRECAO: "Correção",
};

/** Explicação curta, usada no editor. */
export const CLASSIFICATION_HINT: Record<Classification, string> = {
  NOTICIA: "Fato apurado pela redação. Exige ao menos uma fonte confirmada para ser aprovada.",
  EXPLICATIVO:
    "Explicação, história, guia ou serviço a partir de material público e verificável. Não narra fato novo nem avalia pessoa.",
  OPINIAO: "Texto de autor, assinado. A responsabilidade é de quem assina.",
  PATROCINADO: "Material pago. Aparece com selo próprio e nunca como notícia.",
  COMUNICADO: "Texto de assessoria, reproduzido com identificação e sem apuração independente.",
  ANALISE: "Interpretação da redação sobre fatos já apurados.",
  CORRECAO: "Nota corrigindo informação publicada antes.",
};

/** Aviso exibido ao leitor no alto do texto, quando existe. */
export const CLASSIFICATION_NOTICE: Partial<Record<Classification, string>> = {
  OPINIAO:
    "Artigo de opinião. As ideias e informações aqui expressas são de responsabilidade do autor e não representam necessariamente a posição do Diário Mello.",
  PATROCINADO:
    "Conteúdo pago por um anunciante. Não foi produzido nem apurado pela redação do Diário Mello.",
  COMUNICADO:
    "Comunicado enviado por assessoria e reproduzido na íntegra ou em parte, sem apuração independente da redação.",
  ANALISE:
    "Análise da redação: interpreta fatos já apurados e traz o juízo de quem assina.",
  CORRECAO:
    "Esta publicação corrige informação divulgada anteriormente pelo Diário Mello.",
};

/** Classificações que nunca ocupam o destaque principal da capa. */
export const NOT_FEATURABLE: Classification[] = ["PATROCINADO", "COMUNICADO"];

/** Só a notícia carrega a exigência de fonte confirmada. */
export function requiresConfirmedSource(classification: string): boolean {
  return classification === "NOTICIA";
}
