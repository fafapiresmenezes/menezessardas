import { VERTENTES } from '@/data/vertentes'
import { useTexto, type Chave } from '@/lib/i18n'

/**
 * Cadernos de produtos por frente, para baixar SEM senha (pedido de M, 19/11/2026:
 * "qualquer um pode baixar o caderno de produtos", separado por eixos).
 *
 * O que os cadernos não trazem, de propósito: comparativo com outras instituições e tabela de
 * preço — preço é proposta, caso a caso. Os PDFs saem do gh-pages (fafapiresmenezes.github.io),
 * que serve arquivo aberto; a Vercel só carrega a casca do site.
 */
export const BASE_CADERNOS = 'https://fafapiresmenezes.github.io/menezessardas/cadernos'

export const cadernoUrl = (id: string) => `${BASE_CADERNOS}/caderno-${id}.pdf`

export default function Cadernos() {
  const t = useTexto()
  return (
    <section className="porta mt-16 text-left" data-testid="cadernos">
      <h2 className="text-3xl font-serif text-center">{t('cadernos.titulo')}</h2>
      <p className="text-base text-neutral-200 mt-3 mb-6 text-center max-w-3xl mx-auto">{t('cadernos.resumo')}</p>
      <div className="text-center mb-8">
        <a
          href={`${BASE_CADERNOS}/cadernos-theye.zip`}
          download
          data-testid="cadernos-baixar-todos"
          title={t('cadernos.baixarTodos')}
          className="inline-block bg-[#fff] px-6 py-3 text-sm font-medium uppercase tracking-wider text-[#000] no-underline transition hover:bg-neutral-200"
        >
          {t('cadernos.baixarTodos')} ↓
        </a>
      </div>
      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3" data-testid="lista-cadernos">
        {VERTENTES.map(v => (
          <li key={v.id}>
            <a
              href={cadernoUrl(v.id)}
              download
              data-testid={`caderno-${v.id}`}
              title={`${t('cadernos.baixar')} — ${t(`vertente.${v.id}.nome` as Chave)}`}
              className="flex items-baseline gap-2 border border-neutral-600 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 no-underline transition hover:border-[#fff]"
            >
              <span aria-hidden="true" className="text-neutral-400">↓</span>
              <span>{t(`vertente.${v.id}.nome` as Chave)}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
