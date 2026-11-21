import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTexto, type Chave } from '@/lib/i18n'
import { entradaPara, ultimaFrente, esquecerUltimaFrente } from '@/lib/destino'
import { contarVisita } from '@/lib/visitas'
import { VERTENTES } from '@/data/vertentes'
import AberturaInstituto from '@/components/AberturaInstituto'
import Vertentes from '@/components/Vertentes'
import Produtos from '@/components/Produtos'
import Cadernos from '@/components/Cadernos'
import Doacoes from '@/components/Doacoes'

// Porta de entrada do Instituto THEYE. Refeita em 20/11/2026 a pedido de M: primeira faixa em tela
// cheia com a logo grande (estrela de oito raios escondida na pupila), nome oficial e lema; depois a
// breve história, a frase da ontologia, as frentes e uma faixa com um número só (frentes de trabalho).
//
// Desenho anterior: passo V13 (pergunta de M em 13/11/2026 23:04:
// dá para melhorar o desenho pensando em quem compra, mesmo em padrão alto? Dá).
//
// A ordem segue a cabeça de quem chega: nome pequeno em cima, a PROMESSA grande, a prova logo abaixo
// (só número que a pessoa confere nesta mesma página), um caminho forte por tela e, para quem volta,
// "continuar de onde parou" — lembrança guardada só no aparelho da pessoa, nunca no banco.
//
// Sem pressa falsa, sem contagem regressiva, sem depoimento inventado: produto caro vende por
// confiança. O teste portaLegivel.test.ts proíbe letra apagada, letra miúda e o bg-white que o modo
// escuro repinta de cinza (M, 13/11/2026 22:47: "cinza com letra branca, não dá para ler").
export default function BoasVindasPage() {
  const t = useTexto()
  const [retomar, setRetomar] = useState<string | null>(ultimaFrente())

  // Contagem de visitas (V10): soma uma visita ao abrir a porta, sem identificar ninguém.
  useEffect(() => { contarVisita('visita') }, [])

  const nomeDaFrente = (rota: string) => {
    const v = VERTENTES.find(x => x.rota === rota)
    return v ? t(`vertente.${v.id}.nome` as Chave) : ''
  }

  return (
    <div className="porta min-h-screen bg-black">
      <AberturaInstituto
        extra={(
          <>
          {/* Os outros caminhos ficam discretos. Quem quer falar pede entrada. */}
          <div className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-3 text-base">
            <Link
              to="/admissao"
              data-testid="porta-pedir-entrada"
              title="Deixe um pedido: uma pessoa do Instituto lê e responde"
              className="text-[#fff] underline decoration-neutral-400 underline-offset-4 hover:decoration-[#fff]"
            >
              Pedir entrada
            </Link>
            <Link
              to="/exemplos"
              data-testid="porta-ver-exemplos"
              title="Exemplos de verdade de cada frente, sem senha"
              className="text-[#fff] underline decoration-neutral-400 underline-offset-4 hover:decoration-[#fff]"
            >
              {t('porta.verExemplos')}
            </Link>
          </div>

          {/* Motivo para voltar. Quem já entrou numa frente retoma de onde parou, em um clique. */}
          {retomar && (
            <div
              data-testid="porta-retomar"
              className="mx-auto mt-8 flex max-w-xl flex-col items-center gap-2 border border-neutral-700 px-6 py-4 text-center"
            >
              <Link
                to={entradaPara(retomar)}
                data-testid="porta-retomar-link"
                title={`${t('boasVindas.continuarEm')} ${nomeDaFrente(retomar)}`}
                className="text-lg text-[#fff] no-underline"
              >
                {t('boasVindas.continuarEm')} <span className="font-serif">{nomeDaFrente(retomar)}</span> <span aria-hidden="true">→</span>
              </Link>
              <button
                type="button"
                data-testid="porta-esquecer"
                onClick={() => { esquecerUltimaFrente(); setRetomar(null) }}
                title={t('porta.comecarDoZero')}
                className="text-sm text-neutral-300 underline underline-offset-4 hover:text-[#fff]"
              >
                {t('porta.comecarDoZero')}
              </button>
            </div>
          )}

          </>
        )}
      />

      <div className="mx-auto w-full max-w-5xl px-4 pb-16">
        <p className="text-sm text-neutral-300 mt-10 text-center" data-testid="porta-sem-rastreio">{t('porta.semRastreio')}</p>

        <Vertentes />

        <Produtos />

        <Cadernos />

        <Doacoes />
      </div>
      <Link
        to="/stokasticos"
        aria-label="Stokasticos — escola de magia do caos dedicada a Peter J. Carroll"
        title="Stokasticos — escola de magia do caos dedicada a Peter J. Carroll"
        className="fixed right-2 bottom-2 text-white/10 hover:text-white/70 transition text-[11px] tracking-widest font-serif no-underline select-none"
      >
        ☉ → ∞ +
      </Link>
    </div>
  )
}
