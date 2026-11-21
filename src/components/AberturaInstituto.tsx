import type { ReactNode } from 'react'
import { useTexto } from '@/lib/i18n'
import MarcaOlho from '@/components/MarcaOlho'
import SeletorIdioma from '@/components/SeletorIdioma'
import EntradaMembros from '@/components/EntradaMembros'
import ProvaDaPorta from '@/components/ProvaDaPorta'

/**
 * Abertura do Instituto THEYE, refeita a pedido de M em 20/11/2026. É a mesma na tela de boas-vindas
 * e na entrada geral (/login sem segmento), que é onde quem escolheu a língua cai.
 *
 *  1. Primeira faixa em tela cheia: logo grande do olho, com a estrela de oito raios escondida na
 *     pupila; INSTITUTO THEYE; o nome oficial; o lema; um botão forte e a fileira de idiomas.
 *  2. Breve história, no lugar do antigo nome em letra grande.
 *  3. A frase da ontologia (prever sempre com margem de erro declarada, nunca como valor exato).
 *  4. Cada nicho com plataforma, assinatura e projetos próprios, e "ver todas as frentes".
 *  5. Um número só: quantas frentes de trabalho, e por extenso as que o poder público mais contrata.
 *
 * `extra` entra na primeira faixa, debaixo do botão (links discretos e o "continuar de onde parou").
 */
export default function AberturaInstituto({ extra }: { extra?: ReactNode }) {
  const t = useTexto()
  const descerAte = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  return (
    <div className="porta" data-testid="abertura-instituto">
      {/* Primeira faixa (M, 20/11/2026): ocupa a tela inteira, com a logo grande — a estrela de oito
          raios fica escondida dentro da pupila —, o nome do Instituto, o nome oficial e o lema. */}
      <section
        data-testid="porta-faixa"
        className="relative flex min-h-[100svh] flex-col items-center justify-center px-4 py-16 text-center"
      >
        <div className="absolute right-4 top-3 flex flex-col items-end gap-2 md:right-8 md:top-5">
          <EntradaMembros />
          <SeletorIdioma discreto />
        </div>
        <MarcaOlho tamanho={224} estrela className="h-40 w-40 text-[#fff] md:h-56 md:w-56" />
        <h1 className="mt-2 font-serif text-5xl leading-tight tracking-[0.16em] md:text-7xl">
          <span className="block">INSTITUTO</span>
          <span className="block">THEYE</span>
        </h1>
        <p className="mt-6 max-w-3xl font-serif text-xl italic text-neutral-100 md:text-2xl" data-testid="porta-nome-oficial">{t('porta.nomeOficial')}</p>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-neutral-200 md:text-xl" data-testid="porta-lema">{t('porta.lema')}</p>

        {/* Um botão forte. Conhecer é o passo de quem chega sem conta. */}
        <div className="mt-10">
          <button
            type="button"
            onClick={() => descerAte('historia')}
            data-testid="porta-conhecer"
            title={t('porta.queroConhecerDica')}
            className="inline-block min-h-[52px] px-8 py-3 border border-[#fff] bg-[#fff] text-[#000] font-medium uppercase tracking-[0.15em] text-sm hover:bg-transparent hover:text-[#fff] transition"
          >
            {t('porta.queroConhecer')} <span aria-hidden="true">↓</span>
          </button>
        </div>

        {extra}

        <button
          type="button"
          onClick={() => descerAte('historia')}
          aria-label={t('porta.descer')}
          title={t('porta.descer')}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-2xl text-neutral-300 transition hover:text-[#fff] motion-safe:animate-bounce"
        >
          <span aria-hidden="true">↓</span>
        </button>
      </section>

      <div className="mx-auto w-full max-w-5xl px-4 pb-16">
        {/* Breve história (M, 20/11/2026): no lugar do nome em letra grande, o porquê do Instituto. */}
        <section id="historia" data-testid="porta-historia" className="mx-auto max-w-3xl pt-16 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-neutral-300">{t('porta.historiaRotulo')}</p>
          <h2 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">{t('porta.historiaTitulo')}</h2>
          <p className="mt-6 text-lg leading-relaxed text-neutral-100">{t('porta.historia')}</p>
          {/* Temas centrais em tópicos, na ordem pedida por M em 20/11/2026: concisos e certeiros. */}
          <ul data-testid="porta-temas" className="mx-auto mt-8 flex max-w-xl flex-col gap-3 text-left">
            {(['porta.tema1', 'porta.tema2', 'porta.tema3', 'porta.tema4'] as const).map((k, i) => (
              <li key={k} className="flex items-baseline gap-4 border-b border-white/15 pb-3">
                <span className="font-serif text-sm tabular-nums text-neutral-400">{String(i + 1).padStart(2, '0')}</span>
                <span className="font-serif text-xl text-[#fff] md:text-2xl">{t(k)}</span>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-5 max-w-xl text-left text-base leading-relaxed text-neutral-300">{t('porta.temaMais')}</p>
          <p className="mt-8 text-lg leading-relaxed text-neutral-200">{t('porta.historia2')}</p>
        </section>

        {/* A frase da ontologia: prever com margem de erro, nunca como valor exato. */}
        <p className="mx-auto mt-14 max-w-3xl text-center font-serif text-2xl leading-snug text-[#fff] md:text-3xl" data-testid="porta-chamada">
          {t('porta.chamada')}
        </p>

        {/* Cada nicho com plataforma, assinatura e projetos próprios. */}
        <div className="mx-auto mt-10 max-w-3xl text-center">
          <p className="text-lg leading-relaxed text-neutral-200" data-testid="porta-apoio">{t('porta.apoio')}</p>
          <button
            type="button"
            onClick={() => descerAte('frentes')}
            data-testid="porta-ver-frentes"
            title={t('porta.verFrentesDica')}
            className="mt-6 inline-block min-h-[48px] border border-[#fff] px-6 py-3 text-sm font-medium uppercase tracking-[0.15em] text-[#fff] transition hover:bg-[#fff] hover:text-[#000]"
          >
            {t('porta.verFrentes')} <span aria-hidden="true">↓</span>
          </button>
        </div>

        <ProvaDaPorta centro />

      </div>
    </div>
  )
}
