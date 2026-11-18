/**
 * Medição de obra por nível — tela de DEMONSTRAÇÃO (pedido de M, 18/11/2026).
 * Mostra, com dados inventados (src/data/demoObraAngola.ts), as quatro coisas que o cliente pediu para ver:
 * o boletim de medição com as contas feitas, os indicadores com semáforo, a ligação entre sectores
 * (obra mede, jurídico valida, finanças paga) e a visão que muda conforme o nível de quem olha.
 * Nada aqui lê nem grava no banco: as assinaturas vivem só na memória da página e somem ao recarregar.
 * As regras são as de verdade: src/lib/hierarquiaCorporativa.ts e src/lib/medicaoObra.ts.
 */
import { useMemo, useState } from 'react'
import Layout from '@/components/Layout'
import { Eye, EyeOff, Gauge, PenLine, ShieldCheck, RotateCcw } from 'lucide-react'
import {
  ESTACOES, descricaoNivel, filtrarItens, motivoParaNaoAssinar, podeVerItem, proximaEstacao, rotuloEstacao, rotuloNivel,
  type Passagem,
} from '@/lib/hierarquiaCorporativa'
import { calcularBoletim, desvioDeCronograma, semaforo, type Semaforo } from '@/lib/medicaoObra'
import { ALCADAS_DEMO, ITENS_DEMO, PESSOAS_DEMO, PROJETOS_DEMO, rotuloSetorDemo } from '@/data/demoObraAngola'

const kz = (v: number) => `${new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 0 }).format(v)} Kz`
const num = (v: number) => new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 }).format(v)
const pct = (v: number) => `${num(Math.round(v * 1000) / 10)} %`
const COR: Record<Semaforo, string> = { verde: 'bg-emerald-600', amarelo: 'bg-amber-500', vermelho: 'bg-red-600' }
const NOME_COR: Record<Semaforo, string> = { verde: 'No prazo', amarelo: 'Atenção', vermelho: 'Crítico' }
const nomeDe = (id: string) => PESSOAS_DEMO.find(p => p.id === id)?.nome ?? 'Outra pessoa da equipa'
const INICIAIS: Record<string, Passagem[]> = Object.fromEntries(PROJETOS_DEMO.map(p => [p.id, p.passagens]))

export default function DemoObraPage() {
  const [quemId, setQuemId] = useState('ceo')
  const [projetoId, setProjetoId] = useState('estrada')
  const [passagens, setPassagens] = useState(INICIAIS)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'recusa'; texto: string } | null>(null)

  const quem = PESSOAS_DEMO.find(p => p.id === quemId)!
  const visiveis = useMemo(() => filtrarItens(ITENS_DEMO, quem), [quem])
  const boletimDe = (projeto: string) => ITENS_DEMO.find(i => i.tipo === 'Boletim' && i.projeto === projeto)!
  const projetos = PROJETOS_DEMO.filter(p => podeVerItem(quem, boletimDe(p.id)))
  const projeto = projetos.find(p => p.id === projetoId) ?? projetos[0] ?? null
  const boletim = projeto ? calcularBoletim(projeto.itens, projeto.medidos, projeto.parametros) : null
  const feitas = projeto ? passagens[projeto.id] : []
  const proxima = proximaEstacao(feitas)

  function trocarPessoa(id: string) { setQuemId(id); setAviso(null) }

  function assinar() {
    if (!projeto || !boletim) return
    const motivo = motivoParaNaoAssinar(quem, boletimDe(projeto.id), feitas, boletim.liquidoAPagar, ALCADAS_DEMO)
    if (motivo) { setAviso({ tipo: 'recusa', texto: motivo }); return }
    const estacao = proximaEstacao(feitas)!
    setPassagens(a => ({ ...a, [projeto.id]: [...a[projeto.id], { estacao, pessoaId: quem.id }] }))
    setAviso({ tipo: 'ok', texto: `${rotuloEstacao[estacao]} registada por ${quem.nome}.` })
  }

  return (
    <Layout title="Medição de obra por nível">
      <div className="max-w-5xl space-y-6">
        <p className="bg-navy text-white text-sm px-4 py-2" data-testid="aviso-ficticio">
          Demonstração com dados fictícios. Empresas, pessoas, projectos e valores foram inventados; nada é gravado.
        </p>

        <section className="bg-white p-6 shadow-sm border-t-2 border-dourado" aria-labelledby="quem-olha">
          <h2 id="quem-olha" className="text-lg font-serif font-semibold flex items-center gap-2">
            <Eye size={18} className="text-dourado" aria-hidden="true" /> Quem está a olhar
          </h2>
          <p className="text-sm text-grafite mt-1">Escolha uma pessoa. O ecrã inteiro passa a mostrar só o que o nível dela alcança.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Pessoa">
            {PESSOAS_DEMO.map(p => (
              <button
                key={p.id} type="button" role="radio" aria-checked={p.id === quemId} data-testid={`pessoa-${p.id}`}
                onClick={() => trocarPessoa(p.id)}
                className={`text-left p-3 border text-sm ${p.id === quemId ? 'border-dourado bg-dourado/10' : 'border-navy/15 hover:border-navy/40'}`}
              >
                <span className="block text-xs uppercase tracking-wide text-grafite-claro">{p.nivel} · {rotuloNivel[p.nivel!]}</span>
                <span className="block font-medium">{p.nome}</span>
                <span className="block text-xs text-grafite">{p.cargo}</span>
              </button>
            ))}
          </div>
          <p className="text-sm mt-4" data-testid="alcance">
            <strong>{quem.nome}</strong> ({rotuloNivel[quem.nivel!]}): {descricaoNivel[quem.nivel!]}{' '}
            Vê <strong>{visiveis.length}</strong> de {ITENS_DEMO.length} documentos e <strong>{projetos.length}</strong> de {PROJETOS_DEMO.length} projectos.
          </p>
        </section>

        <section className="bg-white p-6 shadow-sm" aria-labelledby="indicadores">
          <h2 id="indicadores" className="text-lg font-serif font-semibold flex items-center gap-2">
            <Gauge size={18} className="text-dourado" aria-hidden="true" /> Indicadores dos projectos
          </h2>
          {projetos.length === 0 ? (
            <p className="text-sm text-grafite mt-3">Nenhum projecto aparece para este nível.</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {projetos.map(p => {
                const b = calcularBoletim(p.itens, p.medidos, p.parametros)
                const desvio = desvioDeCronograma(b.avancoFisico, p.previsto)
                const cor = semaforo(desvio, p.diasParado)
                return (
                  <button
                    key={p.id} type="button" onClick={() => { setProjetoId(p.id); setAviso(null) }} data-testid={`projeto-${p.id}`}
                    className={`text-left p-4 border ${projeto?.id === p.id ? 'border-dourado' : 'border-navy/15 hover:border-navy/40'}`}
                  >
                    <span className="flex items-center gap-2 text-xs uppercase tracking-wide text-grafite-claro">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${COR[cor]}`} aria-hidden="true" />
                      {NOME_COR[cor]} · {p.pais === 'AO' ? 'Angola' : 'Namíbia'}
                    </span>
                    <span className="block font-medium mt-1">{p.nome}</span>
                    <dl className="mt-2 text-sm grid grid-cols-2 gap-x-3 gap-y-1">
                      <dt className="text-grafite">Avanço físico</dt><dd className="text-right">{pct(b.avancoFisico)}</dd>
                      <dt className="text-grafite">Previsto</dt><dd className="text-right">{pct(p.previsto)}</dd>
                      <dt className="text-grafite">Desvio</dt><dd className="text-right">{num(desvio)} p.p.</dd>
                      <dt className="text-grafite">Avanço financeiro</dt><dd className="text-right">{pct(b.avancoFinanceiro)}</dd>
                      <dt className="text-grafite">Boletim parado</dt><dd className="text-right">{p.diasParado} dias</dd>
                    </dl>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {projeto && boletim && (
          <section className="bg-white p-6 shadow-sm" aria-labelledby="boletim">
            <h2 id="boletim" className="text-lg font-serif font-semibold">Boletim de medição · {projeto.nome}</h2>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm" data-testid="tabela-boletim">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-grafite-claro border-b border-navy/15">
                    <th className="py-2 pr-3">Item</th><th className="py-2 px-2 text-right">Contratado</th>
                    <th className="py-2 px-2 text-right">Anterior</th><th className="py-2 px-2 text-right">Período</th>
                    <th className="py-2 px-2 text-right">Acumulado</th><th className="py-2 px-2 text-right">Saldo</th>
                    <th className="py-2 pl-2 text-right">Valor do período</th>
                  </tr>
                </thead>
                <tbody>
                  {boletim.linhas.map(l => (
                    <tr key={l.itemId} className="border-b border-navy/10">
                      <td className="py-2 pr-3">{l.descricao} <span className="text-grafite-claro">({l.unidade})</span></td>
                      <td className="py-2 px-2 text-right">{num(l.contratado)}</td>
                      <td className="py-2 px-2 text-right">{num(l.anterior)}</td>
                      <td className="py-2 px-2 text-right">{num(l.periodo)}</td>
                      <td className="py-2 px-2 text-right">{num(l.acumulado)}</td>
                      <td className={`py-2 px-2 text-right ${l.excedeu ? 'text-critico font-medium' : ''}`}>{num(l.saldo)}</td>
                      <td className="py-2 pl-2 text-right">{kz(l.valorPeriodo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="mt-4 text-sm grid sm:grid-cols-2 gap-x-8 gap-y-1 max-w-2xl">
              <dt className="text-grafite">Valor medido no período</dt><dd className="sm:text-right">{kz(boletim.valorPeriodo)}</dd>
              <dt className="text-grafite">Retenção de garantia ({pct(projeto.parametros.retencao)})</dt><dd className="sm:text-right">− {kz(boletim.retencao)}</dd>
              <dt className="text-grafite">Amortização do adiantamento ({pct(projeto.parametros.amortizacao)})</dt><dd className="sm:text-right">− {kz(boletim.amortizacao)}</dd>
              <dt className="font-medium">Líquido a pagar</dt><dd className="sm:text-right font-medium" data-testid="liquido">{kz(boletim.liquidoAPagar)}</dd>
            </dl>

            <h3 className="mt-6 font-medium flex items-center gap-2">
              <ShieldCheck size={16} className="text-dourado" aria-hidden="true" /> Caminho do boletim entre os sectores
            </h3>
            <p className="text-sm text-grafite mt-1">Quem mede não aprova; quem aprova não paga. Cada estação exige alçada própria.</p>
            <ol className="mt-3 grid gap-2 sm:grid-cols-5" data-testid="estacoes">
              {ESTACOES.map(e => {
                const feita = feitas.find(f => f.estacao === e)
                const vez = e === proxima
                return (
                  <li key={e} className={`p-3 border text-sm ${feita ? 'border-emerald-600/40 bg-emerald-50' : vez ? 'border-dourado bg-dourado/10' : 'border-navy/15'}`}>
                    <span className="block font-medium">{rotuloEstacao[e]}</span>
                    <span className="block text-xs text-grafite mt-1">{feita ? `Feito: ${nomeDe(feita.pessoaId)}` : vez ? 'À espera de assinatura' : 'Ainda não chegou aqui'}</span>
                  </li>
                )
              })}
            </ol>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={assinar} disabled={!proxima} data-testid="assinar"
                className="inline-flex items-center gap-2 bg-navy text-white text-sm px-4 py-2 disabled:opacity-50">
                <PenLine size={16} aria-hidden="true" />
                {proxima ? `Assinar ${rotuloEstacao[proxima]} como ${quem.nome}` : 'Boletim concluído'}
              </button>
              <button type="button" onClick={() => { setPassagens(INICIAIS); setAviso(null) }}
                className="inline-flex items-center gap-2 text-sm text-grafite underline">
                <RotateCcw size={14} aria-hidden="true" /> Repor a demonstração
              </button>
            </div>
            {aviso && (
              <p role={aviso.tipo === 'recusa' ? 'alert' : 'status'} data-testid="resultado-assinatura"
                className={`mt-3 text-sm ${aviso.tipo === 'recusa' ? 'text-critico' : 'text-emerald-700'}`}>
                {aviso.tipo === 'recusa' ? 'Recusado. ' : ''}{aviso.texto}
              </p>
            )}
          </section>
        )}

        <section className="bg-white p-6 shadow-sm" aria-labelledby="documentos">
          <h2 id="documentos" className="text-lg font-serif font-semibold">O que esta pessoa vê, sector a sector</h2>
          <ul className="mt-3 divide-y divide-navy/10 text-sm" data-testid="documentos-visiveis">
            {visiveis.map(i => (
              <li key={i.id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-xs uppercase tracking-wide bg-navy/5 px-2 py-0.5">{rotuloSetorDemo[i.setor]}</span>
                <span className="font-medium">{i.titulo}</span>
                <span className="text-grafite">{PROJETOS_DEMO.find(p => p.id === i.projeto)?.nome ?? 'País inteiro'}</span>
                {i.reservado && <span className="text-xs text-dourado">Reservado</span>}
              </li>
            ))}
          </ul>
          {visiveis.length < ITENS_DEMO.length && (
            <p className="text-sm text-grafite mt-3 flex items-center gap-2" data-testid="ocultos">
              <EyeOff size={16} aria-hidden="true" />
              Outros {ITENS_DEMO.length - visiveis.length} documentos existem e não aparecem para este nível, nem na busca.
            </p>
          )}
        </section>
      </div>
    </Layout>
  )
}
