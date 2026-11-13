import { IDIOMAS } from '@/lib/idioma'
import { trocarIdioma, useIdioma, useTexto, textoEm, chaveIdioma } from '@/lib/i18n'

// Fileira discreta com os quatro idiomas (pedido de M, 13/11/2026): da primeira tela ele
// sempre consegue ver e trocar a língua, sem limpar o navegador. A escolha fica guardada.
export default function SeletorIdioma() {
  const atual = useIdioma()
  const t = useTexto()
  return (
    <nav aria-label={t('idioma.trocar')} data-testid="seletor-idioma" className="mt-6 border-t border-neutral-600 pt-4">
      <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {IDIOMAS.map((id, i) => {
          const ativo = id.codigo === atual
          return (
            <li key={id.codigo} className="flex items-center">
              {i > 0 && <span aria-hidden="true" className="text-neutral-400 mr-3">·</span>}
              <button
                type="button"
                onClick={() => trocarIdioma(id.codigo)}
                aria-current={ativo ? 'true' : undefined}
                data-testid={`trocar-idioma-${id.codigo}`}
                title={ativo
                  ? `${t('idioma.atual')}: ${t(chaveIdioma(id.codigo))}`
                  : `${textoEm(id.codigo, 'idioma.trocarPara')} ${textoEm(id.codigo, chaveIdioma(id.codigo))}`}
                className={`min-h-[44px] px-1 font-serif text-base transition ${ativo ? 'text-[#fff] underline underline-offset-4' : 'text-neutral-300 hover:text-[#fff]'}`}
              >
                {id.nativo}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
