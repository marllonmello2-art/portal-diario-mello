import Link from "next/link";
import type { Metadata } from "next";
import { InstitutionalPage } from "../../components/portal/InstitutionalPage";
import { BRAND } from "../../lib/portal/brand";

export const metadata: Metadata = {
  title: "Uso de inteligência artificial",
  description: `Como o ${BRAND.name} usa — e como não usa — inteligência artificial.`,
};

export default function AiUsePage() {
  return (
    <InstitutionalPage
      title="Uso de inteligência artificial"
      intro="A IA ajuda a redação. Ela não substitui o jornalista, e não publica nada sozinha."
      updatedAt="12 de setembro de 2026"
    >
      <h2>A regra principal</h2>
      <p>
        <strong>Nenhum texto vai ao ar sem revisão humana.</strong> O sistema do {BRAND.name} não
        tem caminho para isso: material produzido com apoio de IA entra na fila de revisão como
        qualquer outro e só é publicado por um editor-chefe, com nome e horário registrados.
      </p>

      <h2>Onde a IA entra</h2>
      <ul>
        <li>Levantamento e organização de material público antes da apuração.</li>
        <li>Primeira versão de textos a partir de documentos e dados oficiais.</li>
        <li>Sugestão de títulos, resumos e revisão de português.</li>
        <li>Ilustrações, quando não há foto disponível — sempre identificadas.</li>
      </ul>

      <h2>Onde a IA não entra</h2>
      <ul>
        <li>Não apura por conta própria nem substitui a checagem de uma pessoa.</li>
        <li>Não assina matéria: a assinatura é sempre de quem responde pelo texto.</li>
        <li>Não gera citação, dado ou fonte — o que ela não confirmou, a redação confirma ou corta.</li>
        <li>Não decide pauta, enquadramento ou o que vai para a capa.</li>
      </ul>

      <h2>Registro interno</h2>
      <p>
        Toda matéria com apoio de IA fica marcada no sistema, e o editor vê o aviso antes de
        aprovar. Esse registro existe para auditoria interna: o que o leitor precisa saber é que o
        texto passou por revisão humana, e isso vale para tudo o que publicamos.
      </p>

      <h2>Imagens</h2>
      <p>
        Ilustração gerada por IA é creditada como <em>“Imagem ilustrativa gerada por IA”</em>.
        Nunca usamos imagem sintética para representar pessoa real, evento real ou documento — o
        que é foto é foto, com crédito e origem.
      </p>

      <h2>Responsabilidade</h2>
      <p>
        Erro cometido com auxílio de IA é erro do {BRAND.name}, não da ferramenta. Vale a{" "}
        <Link href="/politica-de-correcoes">política de correções</Link> como em qualquer outro caso.
      </p>
    </InstitutionalPage>
  );
}
