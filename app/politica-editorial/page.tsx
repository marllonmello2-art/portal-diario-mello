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
        o expediente está em <Link href="/expediente">Expediente</Link>. Esta política vale para a
        fase atual do portal e será atualizada quando a linha editorial mudar.
      </p>

      <h2>Nossa linha: informação que dura</h2>
      <p>
        O {BRAND.name} publica material de longa duração — explicação, história, serviço com fonte
        oficial, agenda cultural. É conteúdo que serve ao leitor no mês que vem tanto quanto hoje, e
        que pode ser checado com calma antes de ir ao ar.
      </p>
      <p>
        Toda matéria carrega o tipo dela: conteúdo permanente (revisto a cada seis meses),
        tecnologia e serviço (a cada três), agenda (sai do site depois do evento) e informação com
        prazo (sai depois da data). Nada fica no ar envelhecendo em silêncio.
      </p>

      <h2>O que não publicamos nesta fase</h2>
      <p>
        Por decisão de risco, e não por censura, o portal não cobre:
      </p>
      <ul>
        <li>Política partidária, eleições e declarações de autoridades.</li>
        <li>Crimes, denúncias, investigações e acusações.</li>
        <li>Vida pessoal, rumores e fofoca.</li>
        <li>Diagnóstico, medicamento ou aconselhamento médico.</li>
        <li>Recomendação de investimento ou promessa de ganho.</li>
        <li>Comparação, avaliação ou crítica a empresas e pessoas identificáveis.</li>
        <li>Notícia urgente e cobertura em tempo real.</li>
        <li>Texto copiado ou resumido de outro veículo.</li>
      </ul>
      <p>
        Um portal pequeno que erra numa acusação responde na Justiça com o mesmo peso de um grande —
        sem o departamento jurídico que o grande tem. Preferimos crescer primeiro no que sabemos
        sustentar.
      </p>

      <h2>O selo de baixo risco</h2>
      <p>
        Antes de ser aprovada, cada matéria precisa passar por quatro confirmações da redação: usa
        fonte oficial, livro ou documento verificável; não acusa, expõe nem avalia pessoa
        identificável; não dá conselho médico, jurídico ou financeiro individual; e usa imagem
        própria, licenciada ou gerada por IA e identificada. O sistema recusa a aprovação enquanto
        faltar qualquer uma — inclusive para o editor-chefe.
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
      <p>
        Há uma exceção declarada, e ela tem limite estreito: o conteúdo{" "}
        <strong>explicativo e de serviço</strong> produzido pelo nosso agente editorial é publicado
        automaticamente, desde que passe em todas as travas do sistema — as quatro confirmações de
        baixo risco, tipo de conteúdo com data de revisão, editoria, assinatura e direitos da
        imagem. Esse material aparece identificado ao leitor, na assinatura e no pé do texto, passa
        depois pela conferência da redação e não ocupa o destaque da capa por conta própria. Notícia, análise, opinião, comunicado, conteúdo
        patrocinado e correção continuam dependendo de aprovação humana, sem exceção. Detalhes em{" "}
        <Link href="/uso-de-ia">Uso de inteligência artificial</Link>.
      </p>

      <h2>O que cada publicação é</h2>
      <p>Toda publicação declara sua natureza, e o site mostra isso ao leitor:</p>
      <ul>
        <li><strong>Notícia</strong> — fato apurado pela redação.</li>
        <li>
          <strong>Explicação e serviço</strong> — guia, história ou informação de utilidade a partir
          de material público e verificável, sem narrar fato novo nem avaliar pessoa.
        </li>
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
        Usamos IA para escrever conteúdo explicativo e de serviço, e dizemos isso na cara do leitor.
        Ela não apura notícia, não assina opinião e não decide o que é correção. As regras completas,
        incluindo o que o agente publica sozinho e o que nunca publica, estão em{" "}
        <Link href="/uso-de-ia">Uso de inteligência artificial</Link>.
      </p>

      <h2>Fale com a redação</h2>
      <p>
        Crítica, sugestão de pauta e denúncia: <strong>{BRAND.email}</strong>. Lemos tudo.
      </p>
    </InstitutionalPage>
  );
}
