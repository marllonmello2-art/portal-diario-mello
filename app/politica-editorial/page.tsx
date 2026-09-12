import Link from "next/link";
import type { Metadata } from "next";
import { InstitutionalPage } from "../../components/portal/InstitutionalPage";
import { BRAND } from "../../lib/portal/brand";

export const metadata: Metadata = {
  title: "Política editorial",
  description: `Como o ${BRAND.name} apura, edita, classifica e corrige o que publica.`,
};

export default function EditorialPolicyPage() {
  return (
    <InstitutionalPage
      title="Política editorial"
      intro="As regras que a redação segue — e pelas quais pode ser cobrada."
      updatedAt="12 de setembro de 2026"
    >
      <h2>Quem somos e quem responde</h2>
      <p>
        O {BRAND.name} é um veículo brasileiro de informação, independente e sem vínculo com
        partido, governo, igreja ou grupo econômico. A direção responde pelo conteúdo publicado;
        o expediente está em <Link href="/expediente">Expediente</Link>.
      </p>

      <h2>Como apuramos</h2>
      <p>
        Toda informação factual é confirmada antes de publicar. A regra da casa é buscar duas
        fontes independentes; quando só existe uma, o texto diz isso ao leitor. Quem é acusado de
        algo é sempre procurado, e a matéria registra se houve resposta, silêncio ou recusa.
      </p>
      <p>
        Cada matéria guarda internamente a lista de fontes consultadas, com tipo, referência e data
        — inclusive as fontes sob reserva, cuja identidade a redação protege e não divulga em
        nenhuma hipótese.
      </p>

      <h2>Passagem obrigatória pela edição</h2>
      <p>
        Nenhum texto vai ao ar direto de quem escreveu. Toda matéria passa por revisão e só é
        publicada por um editor-chefe, com registro de quem aprovou e quando. Matéria classificada
        como notícia só é aprovada com pelo menos uma fonte confirmada.
      </p>

      <h2>O que cada publicação é</h2>
      <p>Toda publicação declara sua natureza, e o site mostra isso ao leitor:</p>
      <ul>
        <li><strong>Notícia</strong> — fato apurado pela redação.</li>
        <li><strong>Análise</strong> — interpretação da redação sobre fatos já apurados.</li>
        <li><strong>Opinião</strong> — texto assinado, de responsabilidade de quem assina.</li>
        <li><strong>Comunicado</strong> — material de assessoria, identificado e sem apuração independente.</li>
        <li><strong>Conteúdo patrocinado</strong> — material pago, com selo próprio, nunca apresentado como notícia.</li>
        <li><strong>Correção</strong> — nota que corrige informação publicada antes.</li>
      </ul>

      <h2>Publicidade e conflito de interesse</h2>
      <p>
        Anunciante não influencia pauta nem tratamento editorial. Conteúdo pago é identificado no
        alto do texto e não ocupa o destaque da capa. Quem escreve declara à direção qualquer
        vínculo com o assunto tratado; havendo conflito, a pauta vai para outra pessoa.
      </p>

      <h2>Erros</h2>
      <p>
        Erramos como qualquer redação. A diferença está no que fazemos depois: a correção fica
        registrada no pé da matéria, com data e descrição, e nunca apagamos alteração factual em
        silêncio. Veja a <Link href="/politica-de-correcoes">política de correções</Link> e o{" "}
        <Link href="/direito-de-resposta">direito de resposta</Link>.
      </p>

      <h2>Inteligência artificial</h2>
      <p>
        Usamos IA como ferramenta de apoio, nunca como jornalista. As regras estão em{" "}
        <Link href="/uso-de-ia">Uso de inteligência artificial</Link>.
      </p>

      <h2>Fale com a redação</h2>
      <p>
        Crítica, sugestão de pauta e denúncia: <strong>{BRAND.email}</strong>. Lemos tudo.
      </p>
    </InstitutionalPage>
  );
}
