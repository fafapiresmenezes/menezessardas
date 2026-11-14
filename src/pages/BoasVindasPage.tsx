import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { IDIOMAS, type Idioma } from '@/lib/idioma'
import { trocarIdioma, useTexto, textoEm, chaveIdioma, type Chave } from '@/lib/i18n'
import { destinoSeguro, entradaPara, ultimaFrente, esquecerUltimaFrente } from '@/lib/destino'
import { VERTENTES } from '@/data/vertentes'
import Marca from '@/components/Marca'
import Vertentes from '@/components/Vertentes'
import Produtos from '@/components/Produtos'
import Doacoes from '@/components/Doacoes'
import ProvaDaPorta from '@/components/ProvaDaPorta'

// Porta de entrada do Instituto THEYE, redesenhada no passo V13 (pergunta de M em 13/11/2026 23:04:
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
  const navigate = useNavigate()
  const [busca] = useSearchParams()
  const t = useTexto()
  const [retomar, setRetomar] = useState<string | null>(ultimaFrente())

  const nomeDaFrente = (rota: string) => {
    const v = VERTENTES.find(x => x.rota === rota)
    return v ? t(`vertente.${v.id}.nome` as Chave) : ''
  }
  const escolher = (codigo: Idioma) => {
    trocarIdioma(codigo)
    // Quem chegou por um quadradinho continua indo para a tela daquele quadradinho.
    const ir = busca.get('ir'); navigate(ir ? entradaPara(destinoSeguro(ir)) : '/login')
  }
  const descerAte = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="porta min-h-screen bg-black px-4 py-12 md:py-16">
      <div className="mx-auto w-full max-w-5xl">
        {/* Tarefa 1: o nome do Instituto é a assinatura, fica pequeno em cima; a promessa é a estrela. */}
        <div className="flex justify-center"><Marca tamanho="pequena" tipo="instituto" comSubtitulo={false} /></div>

        {/* Tarefa 5: motivo para voltar. Quem já entrou numa frente retoma de onde parou, em um clique. */}
        {retomar && (
          <div
            data-testid="porta-retomar"
            className="mx-auto mt-8 flex max-w-xl flex-col items-center gap-2 border border-neutral-700 px-6 py-5 text-center"
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

        {/* Tarefas 1 e 2: promessa grande e, logo abaixo, a faixa de prova com número que se confere aqui. */}
        <div className="text-center">
          <h1 className="mt-12 text-5xl md:text-6xl font-serif leading-[1.05] max-w-4xl mx-auto">{t('porta.promessa')}</h1>
          <p className="text-lg text-neutral-100 mt-6 max-w-3xl mx-auto leading-relaxed">{t('porta.chamada')}</p>

          <ProvaDaPorta centro />

          {/* Tarefa 4: um botão forte por tela. Conhecer é o passo de quem chega sem conta. */}
          <div className="mt-12">
            <button
              type="button"
              onClick={() => descerAte('frentes')}
              data-testid="porta-conhecer"
              title={t('porta.queroConhecerDica')}
              className="inline-block min-h-[52px] px-8 py-3 border border-[#fff] bg-[#fff] text-[#000] font-medium uppercase tracking-[0.15em] text-sm hover:bg-transparent hover:text-[#fff] transition"
            >
              {t('porta.queroConhecer')} <span aria-hidden="true">↓</span>
            </button>
          </div>

          {/* Tarefa 3: os outros caminhos ficam discretos. Membro entra; quem quer falar pede entrada. */}
          <div className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-3 text-base">
            <button
              type="button"
              onClick={() => descerAte('entrar')}
              data-testid="porta-ja-tenho-acesso"
              title={t('porta.tenhoAcessoDica')}
              className="text-[#fff] underline decoration-neutral-400 underline-offset-4 hover:decoration-[#fff]"
            >
              {t('porta.tenhoAcesso')}
            </button>
            <Link
              to="/admissao"
              data-testid="porta-pedir-entrada"
              title="Deixe um pedido: uma pessoa do Instituto lê e responde"
              className="text-[#fff] underline decoration-neutral-400 underline-offset-4 hover:decoration-[#fff]"
            >
              Pedir entrada
            </Link>
          </div>
        </div>

        {/* Tarefa 3: "já tenho acesso". O membro escolhe o idioma e entra nele — a escolha vale de
            verdade na tela de entrada, na criação de conta e na recuperação de senha. */}
        <section id="entrar" className="porta mt-20 text-center">
          <h2 className="text-3xl font-serif">{t('porta.tenhoAcesso')}</h2>
          <p className="text-base text-neutral-200 mt-3 mb-6">
            {IDIOMAS.map(id => textoEm(id.codigo, 'boasVindas.titulo')).join(' · ')}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto" data-testid="escolha-idioma" aria-label={t('boasVindas.lista')}>
            {IDIOMAS.map(id => (
              <button
                key={id.codigo}
                onClick={() => escolher(id.codigo)}
                title={`${textoEm(id.codigo, 'boasVindas.continuarEm')} ${textoEm(id.codigo, chaveIdioma(id.codigo))}`}
                data-testid={`idioma-${id.codigo}`}
                className="group min-h-[88px] border border-neutral-400 bg-neutral-950 px-5 py-4 text-[#fff] transition hover:border-[#fff] hover:bg-[#fff] hover:text-[#000]"
              >
                <span className="block text-2xl font-serif">{id.nativo}</span>
                <span className="mt-1 block text-sm text-neutral-300 group-hover:text-neutral-700">{t(chaveIdioma(id.codigo))}</span>
              </button>
            ))}
          </div>
          <p className="text-sm text-neutral-300 mt-6">{t('boasVindas.dica')}</p>
        </section>

        {/* Tarefa 7: ordem de quem compra — o que é (frentes), o caderno de produtos e o apoio. */}
        <Vertentes />

        <Produtos />

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
