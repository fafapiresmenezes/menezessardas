import { Link } from 'react-router-dom'
import { VERTENTES } from '@/data/vertentes'
import { entradaPara } from '@/lib/destino'
import { useTexto, type Chave } from '@/lib/i18n'

/**
 * A vitrine das vertentes, na porta de entrada e na língua escolhida.
 *
 * Pedido de M em 13/11/2026: na página do Instituto tem de aparecer tudo o que existe, todas as
 * vertentes, mesmo as que ainda estão em desenvolvimento — e tudo exige senha.
 *
 * Pedido de M em 13/11/2026 22:45: cada quadradinho com o que tem DENTRO dele, e levando à sua
 * própria tela. Antes os doze caíam na mesma entrada e depois na plataforma jurídica.
 *
 * Cor (22:47, "cinza com letra branca, não dá para ler"): aqui não entra branco com transparência
 * nem letra menor que 12 px. O teste `portaLegivel.test.ts` trava as duas coisas.
 */
export default function Vertentes() {
  const t = useTexto()
  return (
    <section id="frentes" className="porta mt-16 text-left" data-testid="vertentes">
      <h2 className="text-3xl font-serif text-center">{t('vertentes.titulo')}</h2>
      <p className="text-base text-neutral-300 mt-3 mb-8 text-center max-w-3xl mx-auto">{t('vertentes.aviso')}</p>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {VERTENTES.map(v => {
          const nome = t(`vertente.${v.id}.nome` as Chave)
          const noAr = v.estado === 'no-ar'
          return (
            <li key={v.id}>
              <Link
                to={entradaPara(v.rota)}
                title={`${t('vertentes.entrarEm')} ${nome}`}
                data-testid={`vertente-${v.id}`}
                className="group flex h-full flex-col border border-neutral-600 bg-neutral-950 p-5 no-underline transition hover:border-[#fff] hover:bg-neutral-900 focus-visible:border-[#fff]"
              >
                <span
                  className={`self-start px-2 py-1 text-xs font-medium uppercase tracking-wider ${
                    noAr ? 'bg-[#fff] text-[#000]' : 'border border-neutral-400 text-neutral-200'
                  }`}
                >
                  {t(`vertenteEstado.${v.estado}` as Chave)}
                </span>
                <span className="mt-3 font-serif text-2xl leading-tight text-[#fff]">{nome}</span>
                <span className="mt-2 text-sm leading-relaxed text-neutral-200">{t(`vertente.${v.id}.resumo` as Chave)}</span>
                <span className="mt-4 text-xs font-medium uppercase tracking-wider text-neutral-300">{t('vertentes.dentro')}</span>
                <span className="mt-2 block space-y-1.5" data-testid={`vertente-${v.id}-dentro`}>
                  {t(`vertente.${v.id}.dentro` as Chave).split(' | ').map(item => (
                    <span key={item} className="flex gap-2 text-sm leading-snug text-neutral-100">
                      <span aria-hidden="true" className="text-neutral-400">—</span>
                      <span>{item}</span>
                    </span>
                  ))}
                </span>
                <span className="mt-auto pt-5 text-sm font-medium text-[#fff] underline decoration-neutral-500 underline-offset-4 group-hover:decoration-[#fff]">
                  {t('vertentes.entrarEm')} {nome} <span aria-hidden="true">→</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
