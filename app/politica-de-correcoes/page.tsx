import Link from "next/link";
import type { Metadata } from "next";
import { InstitutionalPage } from "../../components/portal/InstitutionalPage";
import { BRAND } from "../../lib/portal/brand";

export const metadata: Metadata = {
  title: "Política de correções",
  description: `Como o ${BRAND.name} corrige o que publicou errado.`,
};

export default function CorrectionsPolicyPage() {
  return (
    <InstitutionalPage
      title="Política de correções"
      intro="O que fazemos quando erramos — e como você pode nos avisar."
      updatedAt="12 de setembro de 2026"
    >
      <h2>O compromisso</h2>
      <p>
        Informação factual errada é corrigida assim que confirmada, sem esperar repercussão. A
        correção aparece <strong>no pé da própria matéria</strong>, com data, hora e descrição
        objetiva do que mudou. O texto corrigido nunca é trocado em silêncio.
      </p>

      <h2>O que corrigimos</h2>
      <ul>
        <li>Nome, cargo, número, data, lugar ou citação incorretos.</li>
        <li>Atribuição equivocada de fala ou de autoria.</li>
        <li>Contexto que, faltando, distorce o entendimento do fato.</li>
        <li>Erro de tradução ou de interpretação de documento.</li>
      </ul>

      <h2>O que não é correção</h2>
      <p>
        Discordar da análise, do enquadramento ou da escolha da pauta não é erro factual. Nesses
        casos, o caminho é a carta à redação ou o{" "}
        <Link href="/direito-de-resposta">direito de resposta</Link>, quando cabível.
      </p>

      <h2>Como avisar</h2>
      <p>
        Use o <Link href="/direito-de-resposta">formulário de correção e direito de resposta</Link>{" "}
        ou escreva para <strong>{BRAND.email}</strong>. Informe o endereço da matéria, o trecho
        exato e, se possível, o documento que sustenta a correção.
      </p>

      <h2>Prazo</h2>
      <p>
        Todo pedido recebe um protocolo na hora. A redação responde em até{" "}
        <strong>cinco dias úteis</strong>. Erro grave e evidente é corrigido no mesmo dia, sem
        esperar o fim da análise.
      </p>

      <h2>Correção grave</h2>
      <p>
        Quando o erro compromete o sentido principal da matéria, além da nota no pé publicamos uma
        <strong> nota de correção</strong> própria, classificada como tal, com o mesmo destaque que
        a matéria original recebeu.
      </p>
    </InstitutionalPage>
  );
}
