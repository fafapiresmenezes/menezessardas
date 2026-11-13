import { Link } from 'react-router-dom'
import { VERTENTES } from '@/data/vertentes'
import { useTexto, type Chave } from '@/lib/i18n'

/**
 * A vitrine das vertentes, na porta de entrada e na língua escolhida.
 *
 * Pedido de M em 13/11/2026: na página do Instituto tem de aparecer tudo o que existe, todas as
 * vertentes, mesmo as que ainda estão em desenvolvimento — e tudo exige senha.
 *
 * Duas coisas que esta lista NÃO faz, de propósito: não abre nada (todo item leva à tela de
 * entrada) e não esconde o que está por fazer (cada item diz em que pé está). Vitrine que só mostra
 * o que já está pronto faz a pessoa descobrir o resto por acidente.
 */
export default function Vertentes() {
  const t = useTexto()
  return (
    <section className="mt-12 text-left" data-testid="vertentes">
      <h2 className="text-lg font-serif text-center">{t('vertentes.titulo')}</h2>
      <p className="text-xs text-white/50 mt-2 mb-5 text-center">{t('vertentes.aviso')}</p>
      <ul className="grid gap-3 md:grid-cols-2">
        {VERTENTES.map(v => (
          <li key={v.id}>
            <Link
              to="/login"
              title={`${t('vertentes.entrar')}: ${t(`vertente.${v.id}.nome` as Chave)}`}
              data-testid={`vertente-${v.id}`}
              className="block h-full border border-white/20 hover:border-white/60 transition p-4 no-underline"
            >
              <div className="flex justify-between gap-2 items-start">
                <span className="font-serif">{t(`vertente.${v.id}.nome` as Chave)}</span>
                <span className="text-[10px] uppercase tracking-wider text-white/50 whitespace-nowrap">
                  {t(`vertenteEstado.${v.estado}` as Chave)}
                </span>
              </div>
              <p className="text-xs text-white/60 mt-1">{t(`vertente.${v.id}.resumo` as Chave)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
