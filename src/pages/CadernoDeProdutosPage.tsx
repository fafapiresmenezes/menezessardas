import { useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import { PRODUTOS, CADERNO_EM } from '@/data/produtos'
import { PRECOS_CADERNO } from '@/data/precos-caderno'
import { FAMILIAS, CADERNO, ESCADA, QUEM_ASSINA, familiasComProdutos, type FamiliaId } from '@/data/caderno-familias'

/**
 * Caderno de produtos do Instituto THEYE — refeito pela dor de quem compra (erro #8 do
 * planejamento, capítulo 10). Pedido de M em 13/11 e 14/11/2026.
 *
 * O que mudou do desenho anterior:
 *  - Os 21 serviços deixam de ser 11 eixos técnicos e passam a 6 FAMÍLIAS que o comprador reconhece.
 *  - Cada família abre com uma escada de compra (entrada, principal, programa anual): três degraus
 *    que ajudam a escolher em vez de adiar diante de 21 opções soltas.
 *  - A ficha segue a ordem em que o comprador pensa: nome pela dor, promessa, para quem, o que
 *    recebe, quem assina (perfil + equipe em formação, escolha de M), o que levar, e UM botão só:
 *    "Pedir conversa".
 *  - O valor vira "faixa de referência" com a nota "não é oferta" — nunca preço de prateleira.
 *  - "Precisa de lastro" marca, com honestidade, o que ainda precisa ser provado, e leva à tela /lastro.
 *  - Até o passo V9 (contato público) ficar pronto, "Pedir conversa" leva à tela de contato do
 *    próprio escritório (/settings).
 */

/** Dados de execução (prazo, para quem, entregas) seguem vindo do catálogo. */
const DETALHE = new Map<number, (typeof PRODUTOS)[number]>(PRODUTOS.map(p => [p.numero, p]))

export default function CadernoDeProdutosPage() {
  const [aberto, setAberto] = useState<number | null>(null)
  const familias = familiasComProdutos()
  const irPara = (id: FamiliaId) => document.getElementById(`familia-${id}`)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <Layout title="Caderno de produtos">
      <div className="max-w-5xl space-y-10">
        {/* Abertura */}
        <header className="border-y-2 border-navy py-6" data-testid="abertura-caderno">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-grafite">Instituto THEYE · Caderno {CADERNO_EM}</p>
          <h1 className="font-serif text-4xl text-navy mt-3 leading-tight">
            {CADERNO.length} serviços em {FAMILIAS.length} famílias.
          </h1>
          <p className="text-base text-grafite mt-4 max-w-3xl leading-relaxed">
            Cada serviço começa pela sua dor: o que muda, para quem é e em quanto tempo. Dentro de cada
            família, três degraus ajudam a escolher — um diagnóstico de entrada, o serviço principal e
            um acompanhamento anual.
          </p>
          <ul className="mt-5 grid gap-x-6 gap-y-1 text-sm text-grafite md:grid-cols-2">
            <li>— O primeiro passo é sempre uma conversa de escopo, sem custo.</li>
            <li>— O escopo é escrito antes do trabalho começar; mudança sai por termo aditivo.</li>
            <li>— Prazo é bruto: o relógio pára enquanto o cliente responde.</li>
            <li>— O valor é faixa de referência, não oferta; a proposta sai por escrito, caso a caso.</li>
          </ul>
        </header>

        {/* Atalhos por família */}
        <nav aria-label="Famílias do caderno" data-testid="atalhos-familia" className="flex flex-wrap gap-2">
          {familias.map(f => (
            <a
              key={f.id}
              href={`#familia-${f.id}`}
              onClick={ev => { ev.preventDefault(); irPara(f.id) }}
              title={`Ir para a família ${f.nome} (${f.fichas.length} serviços)`}
              data-testid={`atalho-${f.id}`}
              className="border border-navy px-3 py-2 text-sm text-navy no-underline transition hover:bg-navy hover:text-white"
            >
              {f.nome}
              <span className="ml-2 tabular-nums text-grafite">{f.fichas.length}</span>
            </a>
          ))}
        </nav>

        {/* Seções por família */}
        {familias.map(f => (
          <section key={f.id} id={`familia-${f.id}`} data-testid={`secao-${f.id}`} className="scroll-mt-6">
            <div className="flex items-end justify-between border-b border-navy pb-3">
              <div>
                <h2 className="font-serif text-2xl text-navy">{f.nome}</h2>
                <p className="text-sm text-grafite mt-1 max-w-2xl">{f.descricao}</p>
              </div>
              <span className="text-xs uppercase tracking-wider text-grafite shrink-0 ml-4">{f.fichas.length} serviços</span>
            </div>

            {/* Escada de compra */}
            <div className="mt-4 grid gap-3 sm:grid-cols-3" data-testid={`escada-${f.id}`}>
              {([['Para começar', ESCADA[f.id].entrada], ['Serviço principal', ESCADA[f.id].principal], ['Acompanhamento anual', ESCADA[f.id].anual]] as const).map(([rotulo, texto]) => (
                <div key={rotulo} className="border border-navy/20 bg-pergaminho p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-grafite">{rotulo}</p>
                  <p className="text-sm text-navy mt-1 leading-snug">{texto}</p>
                </div>
              ))}
            </div>

            <ul className="mt-5 space-y-5">
              {f.fichas.map(c => {
                const d = DETALHE.get(c.numero)
                const isAberto = aberto === c.numero
                return (
                  <li key={c.numero} data-testid={`caderno-produto-${c.numero}`} className="border border-navy/30 bg-pergaminho">
                    <button
                      type="button"
                      onClick={() => setAberto(isAberto ? null : c.numero)}
                      aria-expanded={isAberto}
                      aria-controls={`produto-${c.numero}`}
                      title={isAberto ? `Fechar os detalhes de "${c.nome}"` : `Abrir os detalhes de "${c.nome}"`}
                      data-testid={`abrir-${c.numero}`}
                      className="w-full text-left p-5 md:p-6 flex gap-4 items-start hover:bg-white/40 transition"
                    >
                      <span className="font-serif text-xl tabular-nums text-navy w-10 shrink-0">{String(c.numero).padStart(2, '0')}</span>
                      <span className="flex-1">
                        <span className="block font-serif text-xl text-navy leading-snug">{c.nome}</span>
                        <span className="block text-sm text-grafite mt-1">{c.promessa}</span>
                      </span>
                      <span className="text-right shrink-0">
                        <span className="block text-xs text-grafite">Faixa de referência</span>
                        <span className="block font-serif text-lg text-navy tabular-nums">{PRECOS_CADERNO[c.numero]}</span>
                        <span className="block text-xs text-grafite">{d?.prazo}</span>
                      </span>
                      <span aria-hidden="true" className="text-navy text-lg leading-none mt-1">{isAberto ? '−' : '+'}</span>
                    </button>

                    {isAberto && d && (
                      <div id={`produto-${c.numero}`} className="border-t border-navy/20 bg-white p-5 md:p-6 space-y-5">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-grafite">Para quem é</h3>
                          <p className="mt-1.5 text-base text-navy leading-relaxed">{d.paraQuem}</p>
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-grafite">O que você recebe</h3>
                          <ul className="mt-1.5 space-y-1.5 text-base text-navy">
                            {d.entregas.map(entrega => (
                              <li key={entrega} className="flex gap-3">
                                <span aria-hidden="true" className="text-navy/40 mt-1">•</span>
                                <span>{entrega}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-grafite">Quem assina</h3>
                          <p className="mt-1.5 text-base text-navy leading-relaxed">{QUEM_ASSINA}</p>
                        </div>
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-navy/20 pt-4 text-sm">
                          <dt className="text-xs uppercase tracking-wider text-grafite">O que levar à conversa</dt>
                          <dd className="text-navy text-right">{c.leve}</dd>
                          <dt className="text-xs uppercase tracking-wider text-grafite">Prazo estimado</dt>
                          <dd className="text-navy tabular-nums text-right">{d.prazo}</dd>
                          <dt className="text-xs uppercase tracking-wider text-grafite">Faixa de referência</dt>
                          <dd className="text-navy tabular-nums text-right">{PRECOS_CADERNO[c.numero]}</dd>
                        </dl>
                        <p className="text-xs text-grafite italic" data-testid={`nota-preco-${c.numero}`}>
                          Faixa de referência de conversa, não proposta. A proposta fechada vem escrita, com escopo, prazo e quem assina acertados para o caso.
                        </p>
                        {c.precisaLastro && (
                          <p className="text-xs text-grafite" data-testid={`lastro-${c.numero}`}>
                            Parte deste serviço ainda está sendo lastreada.{' '}
                            <Link to="/lastro" title="Ver a tela de lastro: o que o Instituto já comprova" className="underline decoration-dourado">Ver o lastro</Link>.
                          </p>
                        )}
                        <Link
                          to="/settings"
                          title={`Falar com o Instituto sobre "${c.nome}" — uma conversa de escopo, sem custo`}
                          data-testid={`pedir-conversa-${c.numero}`}
                          className="inline-flex items-center gap-2 bg-navy text-white min-h-[44px] px-5 uppercase tracking-wider text-sm no-underline"
                        >
                          Pedir conversa
                        </Link>
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
            começam com escopo, prazo e quem assina escritos. A equipe está em formação; a lista final
            de quem assina consta da proposta, só com autorização por escrito.
          </p>
        </footer>
      </div>
    </Layout>
  )
}
