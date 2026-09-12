import Link from "next/link";
import { BRAND } from "../../lib/portal/brand";
import type { NavItem } from "./SiteHeader";

/** Rodapé institucional com editorias e links de serviço. */
export function SiteFooter({ categories }: { categories: NavItem[] }) {
  return (
    <footer className="dm-footer">
      <div className="dm-wrap">
        <div className="dm-footer-grid">
          <div>
            <div className="dm-footer-brand">
              {BRAND.nameFirst} <em>{BRAND.nameLast}</em>
            </div>
            <p style={{ marginTop: 12, maxWidth: 320 }}>
              {BRAND.tagline} Um portal da família {BRAND.founderSurname}, feito para quem quer
              entender a notícia — e não só ler a manchete.
            </p>
          </div>

          <div>
            <h4>Editorias</h4>
            <ul>
              {categories.slice(0, 7).map((category) => (
                <li key={category.slug}>
                  <Link href={`/editoria/${category.slug}`}>{category.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4>Institucional</h4>
            <ul>
              <li><Link href="/sobre">Quem somos</Link></li>
              <li><Link href="/expediente">Expediente</Link></li>
              <li><Link href="/politica-editorial">Política editorial</Link></li>
              <li><Link href="/uso-de-ia">Uso de IA</Link></li>
              <li><Link href="/contato">Fale com a redação</Link></li>
            </ul>
          </div>

          <div>
            <h4>Transparência</h4>
            <ul>
              <li><Link href="/politica-de-correcoes">Correções</Link></li>
              <li><Link href="/direito-de-resposta">Direito de resposta</Link></li>
              <li><Link href="/privacidade">Privacidade</Link></li>
              <li><Link href="/politica-de-cookies">Cookies</Link></li>
              <li><Link href="/termos-de-uso">Termos de uso</Link></li>
            </ul>
          </div>
        </div>

        <div className="dm-footer-bottom">
          <span>
            © {new Date().getFullYear()} {BRAND.name}. Todos os direitos reservados.
          </span>
          <span>
            <Link href="/busca">Busca</Link> · <Link href="/sitemap.xml">Mapa do site</Link> ·{" "}
            <Link href="/admin">Painel</Link> · {BRAND.email}
          </span>
        </div>
      </div>
    </footer>
  );
}
