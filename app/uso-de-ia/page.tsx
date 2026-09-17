import Link from "next/link";
import type { Metadata } from "next";
import { InstitutionalPage } from "../../components/portal/InstitutionalPage";
import { BRAND } from "../../lib/portal/brand";
import {
  AUTO_PUBLISH_LIMIT_DAY,
  MIN_AUTO_PUBLISH_CHARS,
} from "../../lib/portal/auto-publish";

export const metadata: Metadata = {
  title: "Uso de inteligência artificial",
  description: `Como o ${BRAND.name} usa — e como não usa — inteligência artificial.`,
};

export default function AiUsePage() {
  return (
    <InstitutionalPage
      title="Uso de inteligência artificial"
      intro="Parte do que você lê aqui é escrita por um agente de IA, sob regras fixas e com o nosso nome respondendo por ela. Esta página diz exatamente quais são essas regras."
      updatedAt="17 de setembro de 2026"
    >
      <h2>A regra principal</h2>
      <p>
        O {BRAND.name} publica conteúdo <strong>explicativo e de serviço</strong>: história, cultura,
        guias de tecnologia, agenda, informação de utilidade a partir de material público. Para esse
        tipo de texto — e só para ele — um agente de IA escreve e publica automaticamente, dentro das
        travas descritas abaixo. Todo texto assim nasce marcado no site, e você sabe o que está lendo
        antes de ler.
      </p>

      <h2>O que o agente publica sozinho</h2>
      <p>
        Apenas material classificado como <em>explicação e serviço</em>. Antes de ir ao ar, o sistema
        confere, sem intervenção de ninguém:
      </p>
      <ul>
        <li>As quatro confirmações do selo de baixo risco: fonte verificável, nenhuma pessoa
          identificável exposta ou avaliada, nenhum conselho médico, jurídico ou financeiro
          individual, imagem regular.</li>
        <li>Tipo de conteúdo declarado e data de revisão definida — agenda e informação com prazo
          saem do site sozinhas quando a data passa.</li>
        <li>Título, linha fina, editoria, assinatura e corpo com pelo menos {MIN_AUTO_PUBLISH_CHARS}{" "}
          caracteres. Texto raso não vai ao ar.</li>
        <li>Crédito e origem da imagem de capa, ou a identificação de ilustração gerada por IA.</li>
        <li>Teto de {AUTO_PUBLISH_LIMIT_DAY} publicações automáticas por dia. Volume alto é o que
          transforma um portal em máquina de encher página, e não é o que fazemos.</li>
      </ul>
      <p>
        Qualquer item que falhe interrompe a publicação: a matéria fica numa fila e só vai ao ar pela
        mão de um editor-chefe.
      </p>

      <h2>O que o agente nunca publica</h2>
      <ul>
        <li><strong>Notícia.</strong> Fato novo exige apuração, fonte confirmada e responsabilidade
          humana. O sistema recusa publicação automática de notícia.</li>
        <li><strong>Opinião e análise.</strong> Juízo é de quem assina, e quem assina é uma pessoa.</li>
        <li><strong>Correção.</strong> Reconhecer erro é ato da redação, não da máquina.</li>
        <li><strong>Conteúdo patrocinado.</strong> Tem contrato e selo próprio, decididos por gente.</li>
        <li>Texto sobre pessoa identificável, acusação, denúncia, investigação, política partidária,
          diagnóstico ou recomendação de investimento — nada disso entra na nossa{" "}
          <Link href="/politica-editorial">linha editorial</Link>, com ou sem IA.</li>
      </ul>

      <h2>Conferência humana depois da publicação</h2>
      <p>
        Publicar automaticamente não é a mesma coisa que conferir. Toda matéria publicada pelo agente
        entra numa fila do painel e recebe, na própria página, o aviso de que ainda não passou por
        olho humano. O aviso só sai quando alguém da redação registra a conferência, com data e nome
        guardados na auditoria interna.
      </p>

      <h2>O botão de desligar</h2>
      <p>
        A publicação automática tem uma chave geral no painel. Editor-chefe e administrador desligam
        o agente a qualquer momento, sem depender de programador: a partir daí tudo o que ele
        escrever fica esperando aprovação humana. A mudança fica registrada na auditoria.
      </p>

      <h2>Imagens</h2>
      <p>
        Ilustração gerada por IA é creditada como <em>“Imagem ilustrativa gerada por IA”</em>. Nunca
        usamos imagem sintética para representar pessoa real, evento real ou documento — o que é foto
        é foto, com crédito e origem.
      </p>

      <h2>Responsabilidade</h2>
      <p>
        Erro cometido com auxílio de IA é erro do {BRAND.name}, não da ferramenta. Não existe “a
        máquina escreveu”: quem responde é a direção do portal. Encontrou informação errada em
        qualquer texto, escrito por pessoa ou por agente? Vale a{" "}
        <Link href="/politica-de-correcoes">política de correções</Link> e o{" "}
        <Link href="/direito-de-resposta">direito de resposta</Link>, do mesmo jeito.
      </p>
    </InstitutionalPage>
  );
}
