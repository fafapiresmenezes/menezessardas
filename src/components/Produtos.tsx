import { Link } from 'react-router-dom'
import { EIXOS, PRODUTOS, porEixo } from '@/data/produtos'
import { entradaPara } from '@/lib/destino'
import { useTexto, type Chave } from '@/lib/i18n'

/**
 * A aba Produtos na porta do Instituto, ACIMA da vitrine das vertentes.
 *
 * Pedido de M em 13/11/2026 21:35: "a gente bota uma aba, tipo, bem em cima da soluções de
 * direito, daquele quadradinho soluções de direito, produtos. Isso inclui a plataforma,
 * produtos... usa aquele PDF lá que a gente fez ontem."
 *
 * O conteúdo vem do caderno comercial de 12/11/2026 (21 produtos, 11 eixos), lido do próprio PDF.
 *
 * O que esta vitrine NÃO mostra, de propósito: preço, entregas e a chancela sugerida. Isso é o
 * caderno comercial inteiro, e porta aberta não é lugar de tabela de preço — ainda mais com M
 * pedindo, no mesmo minuto, para dificultar raspagem. Preço aparece em /caderno-de-produtos,
 * depois da senha.
 *
 * Cor (pedido de M às 22:47, "os produtos estão aparecendo em cinza e não dá para ler"): o quadro
 * era cinza no modo escuro e a letra era branca com transparência, de 10 a 12 px. Agora a letra
 * é clara e cheia sobre preto, com 14 px no mínimo para o que se lê.
 */
export default function Produtos() {
  const t = useTexto()
  return (
    <section className="porta mt-16 text-left" data-testid="produtos">
      <h2 className="text-3xl font-serif text-center">{t('produtos.titulo')}</h2>
      <p className="text-base text-neutral-200 mt-3 text-center max-w-3xl mx-auto">{t('produtos.resumo')}</p>
      <p className="text-sm text-neutral-300 mt-2 mb-8 text-center max-w-3xl mx-auto" data-testid="produtos-sem-preco">
        {t('produtos.semPreco')}
      </p>
      <div className="border border-neutral-600 bg-neutral-950 p-5 md:p-7">
        <h3 className="text-xs font-medium uppercase tracking-wider text-neutral-300">{t('produtos.eixos')}</h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {EIXOS.map(eixo => (
            <li key={eixo} data-testid={`eixo-${eixo}`} className="border border-neutral-500 px-3 py-1.5 text-sm text-neutral-100">
              {t(`eixo.${eixo}` as Chave)}
              <span className="ml-2 tabular-nums text-neutral-300">{porEixo(eixo).length}</span>
            </li>
          ))}
        </ul>
        <ul className="mt-7 grid gap-x-8 gap-y-2.5 md:grid-cols-2" data-testid="lista-produtos">
          {PRODUTOS.map(p => (
            <li key={p.numero} data-testid={`produto-${p.numero}`} className="flex gap-3 text-sm leading-snug text-neutral-100">
              <span className="tabular-nums text-neutral-300">{String(p.numero).padStart(2, '0')}</span>
              <span>{p.titulo}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-neutral-300 mt-7">{t('produtos.emPortugues')}</p>
        <p className="text-sm text-neutral-200 mt-1">{t('produtos.plataforma')}</p>
        <Link
          to={entradaPara('/caderno-de-produtos')}
          title={t('produtos.entrar')}
          data-testid="produtos-entrar"
          className="inline-block mt-6 bg-[#fff] px-5 py-3 text-sm font-medium uppercase tracking-wider text-[#000] no-underline transition hover:bg-neutral-200"
        >
          {t('produtos.entrar')}
        </Link>
      </div>
    </section>
  )
}
