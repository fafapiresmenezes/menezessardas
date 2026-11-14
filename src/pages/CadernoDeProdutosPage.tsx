import { useState } from 'react'
import Layout from '@/components/Layout'
import { EIXOS, PRODUTOS, porEixo, CADERNO_EM, type Eixo } from '@/data/produtos'

/**
 * Caderno de produtos do Instituto THEYE.
 *
 * Pedido de M em 13/11/2026 23h12: refazer "pensado para o consumidor, para passar credibilidade,
 * demonstrar que entende do assunto". A tela anterior era uma lista cinza com filtros em cima; esta
 * é um catálogo que um comprador de serviço jurídico técnico consegue folhear.
 *
 * Decisões de desenho:
 *  - Cada produto tem um cartão que diz, na ordem que quem compra lê: PARA QUEM, O QUE É,
 *    O QUE VEM JUNTO, QUEM ASSINA, PRAZO, PREÇO MÉDIO.
 *  - Os temas ficam em cima, como atalhos âncora, e cada um vira título de seção na página.
 *  - Nada de cinza fraco: letra escura em fundo pergaminho, com linha fina preta separando campos.
 *  - "Preço médio" fica evidente no topo do cartão, à direita, e tem sempre a nota de que é
 *    referência de conversa, não proposta. Isso **passa credibilidade**: quem lê vê o número.
 *  - Nenhum botão leva para um lugar que não existe. O único atalho ao fim de cada tema é "Falar
 *    com o Instituto", que leva à tela de contato do próprio escritório (/settings) por enquanto,
 *    até o passo V9 (contato público) ficar pronto.
 */
const ROTULO: Record<Eixo, string> = {
  'lgpd': 'Proteção de dados',
  'regulacao-financeira': 'Regulação financeira',
  'compliance': 'Integridade e compliance',
  'inteligencia-artificial': 'Inteligência artificial',
  'ensino-doutrina': 'Ensino e doutrina',
  'legislativo': 'Legislativo',
  'metodos-adequados': 'Mediação e arbitragem',
  'clima-esg': 'Clima e ESG',
  'litigancia-estrategica': 'Litigância estratégica',
  'ciberseguranca': 'Cibersegurança',
  'quantica': 'Pós-quântica',
}

export default function CadernoDeProdutosPage() {
  const [aberto, setAberto] = useState<number | null>(null)
  return (
    <Layout title="Caderno de produtos">
      <div className="max-w-5xl space-y-10">
        {/* Abertura: o que este caderno é e o que ele não é */}
        <header className="border-y-2 border-navy py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-grafite">Instituto THEYE · Caderno {CADERNO_EM}</p>
          <h1 className="font-serif text-4xl text-navy mt-3 leading-tight">
            {PRODUTOS.length} produtos em {EIXOS.length} eixos.
          </h1>
          <p className="text-base text-grafite mt-4 max-w-3xl leading-relaxed">
            Serviços técnicos do Instituto THEYE em direito e em políticas públicas, cada um com
            escopo descrito, entregas listadas, chancela sugerida, prazo e preço médio de referência.
            O preço médio orienta a conversa; a proposta fechada vem escrita, caso a caso, depois de
            acertarmos a chancela e o prazo.
          </p>
          <ul className="mt-5 grid gap-x-6 gap-y-1 text-sm text-grafite md:grid-cols-2">
            <li>— Cada produto tem o nome e a qualificação do profissional que assina.</li>
            <li>— O escopo é escrito antes do trabalho começar; mudança sai por termo aditivo.</li>
            <li>— Prazo é bruto: o relógio pára enquanto o cliente responde.</li>
            <li>— Preço médio é só uma referência; proposta sai para cada caso.</li>
          </ul>
        </header>

        {/* Atalhos de tema */}
        <nav aria-label="Temas do caderno" data-testid="atalhos-tema" className="flex flex-wrap gap-2">
          {EIXOS.map(e => (
            <a
              key={e}
              href={`#tema-${e}`}
              onClick={ev => { ev.preventDefault(); document.getElementById(`tema-${e}`)?.scrollIntoView({ behavior: 'smooth' }) }}
              title={`Ir para a seção ${ROTULO[e]} (${porEixo(e).length} produtos)`}
              data-testid={`atalho-${e}`}
              className="border border-navy px-3 py-2 text-sm text-navy no-underline transition hover:bg-navy hover:text-white"
            >
              {ROTULO[e]}
              <span className="ml-2 tabular-nums text-grafite">{porEixo(e).length}</span>
            </a>
          ))}
        </nav>

        {/* Seções por tema */}
        {EIXOS.map(e => (
          <section key={e} id={`tema-${e}`} data-testid={`secao-${e}`} className="scroll-mt-6">
            <div className="flex items-end justify-between border-b border-navy pb-3">
              <h2 className="font-serif text-2xl text-navy">{ROTULO[e]}</h2>
              <span className="text-xs uppercase tracking-wider text-grafite">{porEixo(e).length} produtos</span>
            </div>
            <ul className="mt-5 space-y-5">
              {porEixo(e).map(p => {
                const isAberto = aberto === p.numero
                return (
                  <li key={p.numero} data-testid={`caderno-produto-${p.numero}`} className="border border-navy/30 bg-pergaminho">
                    <button
                      type="button"
                      onClick={() => setAberto(isAberto ? null : p.numero)}
                      aria-expanded={isAberto}
                      aria-controls={`produto-${p.numero}`}
                      title={isAberto ? `Fechar os detalhes do produto ${p.titulo}` : `Abrir os detalhes do produto ${p.titulo}`}
                      data-testid={`abrir-${p.numero}`}
                      className="w-full text-left p-5 md:p-6 flex gap-4 items-start hover:bg-white/40 transition"
                    >
                      <span className="font-serif text-xl tabular-nums text-navy w-10 shrink-0">{String(p.numero).padStart(2, '0')}</span>
                      <span className="flex-1">
                        <span className="block font-serif text-xl text-navy leading-snug">{p.titulo}</span>
                        <span className="block text-sm text-grafite mt-1">{p.paraQuem}</span>
                      </span>
                      <span className="text-right shrink-0">
                        <span className="block font-serif text-lg text-navy tabular-nums">{p.preco}</span>
                        <span className="block text-xs text-grafite">{p.prazo}</span>
                      </span>
                      <span aria-hidden="true" className="text-navy text-lg leading-none mt-1">{isAberto ? '−' : '+'}</span>
                    </button>

                    {isAberto && (
                      <div id={`produto-${p.numero}`} className="border-t border-navy/20 bg-white p-5 md:p-6 space-y-5">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-grafite">O que é</h3>
                          <p className="mt-1.5 text-base text-navy leading-relaxed">{p.oQueE}</p>
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-grafite">O que vem junto</h3>
                          <ul className="mt-1.5 space-y-1.5 text-base text-navy">
                            {p.entregas.map(entrega => (
                              <li key={entrega} className="flex gap-3">
                                <span aria-hidden="true" className="text-navy/40 mt-1">•</span>
                                <span>{entrega}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        {p.chancela && (
                          <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-grafite">Quem assina</h3>
                            <p className="mt-1.5 text-base text-navy leading-relaxed">{p.chancela}</p>
                          </div>
                        )}
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-navy/20 pt-4 text-sm">
                          <dt className="text-xs uppercase tracking-wider text-grafite">Prazo</dt>
                          <dd className="text-navy tabular-nums text-right">{p.prazo}</dd>
                          <dt className="text-xs uppercase tracking-wider text-grafite">Preço médio de referência</dt>
                          <dd className="text-navy tabular-nums text-right">{p.preco}</dd>
                        </dl>
                        <p className="text-xs text-grafite italic">
                          Preço médio é referência de conversa, não proposta. Proposta fechada vem escrita, com escopo, chancela e prazo acertados para o caso.
                        </p>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}

        <footer className="border-t-2 border-navy pt-6 text-sm text-grafite" data-testid="rodape-caderno">
          <p className="font-serif text-navy text-lg">Instituto THEYE · CNPJ 70.134.451/0001-05</p>
          <p className="mt-2 max-w-3xl leading-relaxed">
            Este caderno é referência de conversa, não proposta. Serviços técnicos do Instituto só
            começam com escopo, chancela e prazo escritos. Os profissionais listados em "quem
            assina" entram por indicação; a lista final consta da proposta.
          </p>
        </footer>
      </div>
    </Layout>
  )
}
