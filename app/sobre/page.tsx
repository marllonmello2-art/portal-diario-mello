import Link from "next/link";
import type { Metadata } from "next";
import { PortalShell } from "../../components/portal/PortalShell";
import { BRAND } from "../../lib/portal/brand";

export const metadata: Metadata = {
  title: "Quem somos",
  description: `Conheça o ${BRAND.name}, portal de notícias da família ${BRAND.founderSurname}.`,
};

export default function AboutPage() {
  return (
    <PortalShell>
      <div className="dm-wrap">
        <header className="dm-page-head">
          <span className="dm-kicker">Institucional</span>
          <h1 className="dm-page-title">Quem somos</h1>
        </header>
        <div className="dm-static dm-prose">
          <p>
            O <strong>{BRAND.name}</strong> leva o sobrenome da família {BRAND.founderSurname} porque
            nasce de um compromisso pessoal: publicar apenas o que a redação consegue apurar e
            sustentar. O nome na porta é o mesmo que assina cada edição.
          </p>
          <h2>O que publicamos</h2>
          <p>
            Conteúdo que continua útil meses depois da publicação: cultura e história, tecnologia
            prática, explicações sobre como as coisas funcionam, serviço com fonte oficial, agenda
            cultural e esporte informativo.
          </p>
          <p>
            Não fazemos cobertura factual em tempo real — política partidária, crime, denúncia,
            “última hora”. Não é falta de interesse: é escolha de um veículo que prefere publicar
            pouco e bem checado a publicar rápido e corrigir depois. A lista completa do que fica
            de fora está na <Link href="/politica-editorial">política editorial</Link>.
          </p>
          <h2>Como trabalhamos</h2>
          <p>
            Toda matéria traz autor, data e editoria. Correções são feitas no próprio texto, de forma
            transparente. Sugestões de pauta e respostas podem ser enviadas para {BRAND.email}.
          </p>
        </div>
      </div>
    </PortalShell>
  );
}
