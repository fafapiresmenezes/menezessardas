import { Link } from 'react-router-dom'
import { EIXOS, PRODUTOS, porEixo } from '@/data/produtos'
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
 */
export default function Produtos() {
  const t = useTexto()
  return (
    <section className="mt-10 text-left" data-testid="produtos">
      <h2 className="text-lg font-serif text-center">{t('produtos.titulo')}</h2>
      <p className="text-xs text-white/60 mt-2 text-center max-w-2xl mx-auto">{t('produtos.resumo')}</p>
      <p className="text-xs text-white/40 mt-1 mb-5 text-center" data-testid="produtos-sem-preco">
        {t('produtos.semPreco')}
      </p>
      <div className="border border-white/20 p-4">
        <h3 className="text-[10px] uppercase tracking-wider text-white/50">{t('produtos.eixos')}</h3>
        <ul className="grid gap-x-4 gap-y-1 md:grid-cols-2 mt-2">
          {EIXOS.map(eixo => (
            <li key={eixo} data-testid={`eixo-${eixo}`} className="text-xs py-1 border-b border-white/10">
              <span className="font-serif text-sm">{t(`eixo.${eixo}` as Chave)}</span>
              <span className="text-white/40"> · {porEixo(eixo).length}</span>
            </li>
          ))}
        </ul>
        <ul className="mt-4 space-y-1" data-testid="lista-produtos">
          {PRODUTOS.map(p => (
            <li key={p.numero} data-testid={`produto-${p.numero}`} className="text-xs text-white/70">
              <span className="text-white/35 tabular-nums">{String(p.numero).padStart(2, '0')}</span>{' '}
              {p.titulo}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-white/35 mt-4">{t('produtos.emPortugues')}</p>
        <p className="text-[11px] text-white/50 mt-1">{t('produtos.plataforma')}</p>
        <Link
          to="/login"
          title={t('produtos.entrar')}
          data-testid="produtos-entrar"
          className="inline-block mt-4 border border-white/40 hover:border-white px-4 py-2 text-xs uppercase tracking-wider no-underline"
        >
          {t('produtos.entrar')}
        </Link>
      </div>
    </section>
  )
}
