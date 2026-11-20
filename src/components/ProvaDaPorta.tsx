import { VERTENTES } from '@/data/vertentes'
import { useTexto } from '@/lib/i18n'

/**
 * Faixa de prova da porta (passo V13; refeita em 20/11/2026 a pedido de M).
 *
 * M, 20/11/2026: "tira os números. Só bota a quantidade de frentes de trabalho e escreve, embaixo,
 * as mais importantes, baseado no que é mais utilizado no Brasil em contratos públicos." Saíram
 * produtos, matérias de engenharia e especialidades médicas. Fica um número só, que a pessoa confere
 * nesta mesma página (as frentes estão listadas logo abaixo), e por extenso as áreas que o poder
 * público mais contrata: obras, saúde, tecnologia, educação, água, energia, transporte, segurança.
 */
export default function ProvaDaPorta({ centro = false }: { centro?: boolean }) {
  const t = useTexto()
  const areas = t('prova.lista').split(' | ')
  return (
    <div
      aria-label={t('prova.rotulo')}
      data-testid="prova-da-porta"
      className={`mt-14 border-t border-neutral-700 pt-10 ${centro ? 'mx-auto max-w-4xl text-center' : ''}`}
    >
      <p data-testid="prova-frentes" className="flex flex-col items-center gap-2">
        <span className="font-serif text-6xl leading-none text-[#fff] tabular-nums md:text-7xl">{VERTENTES.length}</span>
        <span className="text-lg uppercase tracking-[0.2em] text-neutral-200">{t('prova.frentes')}</span>
      </p>
      <p className="mt-8 text-base text-neutral-300">{t('prova.maisContratadas')}</p>
      <ul data-testid="prova-mais-contratadas" className="mt-4 flex flex-wrap justify-center gap-2">
        {areas.map(a => (
          <li key={a} className="border border-neutral-600 px-3 py-1.5 text-sm text-neutral-100">{a}</li>
        ))}
      </ul>
    </div>
  )
}
