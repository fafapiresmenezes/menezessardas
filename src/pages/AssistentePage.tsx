import { useEffect, useRef, useState } from 'react'
import Layout from '@/components/Layout'
import { Escolha } from '@/components/Assistente'
import {
  ESPECIALIDADES,
  MODOS,
  apagarConsulta,
  especialidadePreferida,
  guardarEspecialidade,
  historicoConsultas,
  perguntar,
  type Consulta,
  type Especialidade,
  type Matriz,
  type Modo,
} from '@/lib/assistente'
import PerfilJulgador from '@/components/PerfilJulgador'
import { ExternalLink, Scale, Send, Trash2, Copy } from 'lucide-react'

const EXEMPLOS = [
  'O locatário de loja com contrato de 5 anos tem direito à renovação? Qual o prazo para a ação?',
  'Posso reajustar o aluguel antes de 12 meses se o contrato não fala em índice?',
  'Quais garantias a lei permite na locação e posso exigir duas ao mesmo tempo?',
  'O condômino inadimplente pode ser proibido de usar a piscina?',
]

/** Markdown simples (negrito, listas, títulos) → HTML seguro. */
export function render(md: string) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const linhas = esc(md).split('\n')
  const html: string[] = []
  let lista = false
  for (const l of linhas) {
    const item = l.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/)
    if (item) {
      if (!lista) { html.push('<ul class="list-disc pl-5 space-y-1">'); lista = true }
      html.push(`<li>${item[1]}</li>`)
      continue
    }
    if (lista) { html.push('</ul>'); lista = false }
    if (!l.trim()) continue
    const titulo = l.match(/^#{1,4}\s+(.*)$/)
    html.push(titulo ? `<p class="font-semibold text-navy mt-3">${titulo[1]}</p>` : `<p>${l}</p>`)
  }
  if (lista) html.push('</ul>')
  return html.join('').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

const CRITERIOS: { chave: keyof Pick<Caminho, 'exito' | 'rapidez' | 'custo' | 'risco'>; rotulo: string }[] = [
  { chave: 'exito', rotulo: 'Êxito' }, { chave: 'rapidez', rotulo: 'Rapidez' }, { chave: 'custo', rotulo: 'Economia' }, { chave: 'risco', rotulo: 'Segurança' },
]
type Caminho = Matriz['caminhos'][number]
const nota = (c: Caminho) => Math.round(((c.exito * 2 + c.rapidez + c.custo + c.risco) / 5) * 10) / 10

/** Matriz de caminhos: barras por critério e destaque do recomendado. */
function MatrizCaminhos({ m }: { m: Matriz }) {
  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-grafite">{m.sintese}</p>
      <div className="grid gap-3 md:grid-cols-2">
        {m.caminhos.map((c, i) => {
          const rec = i === m.recomendado
          return (
            <div key={c.nome} className={`border p-4 ${rec ? 'border-dourado bg-pergaminho/60' : 'border-navy/10'}`} aria-label={`Caminho: ${c.nome}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-serif text-lg text-navy">{c.nome}</p>
                <span className="text-xs uppercase tracking-wider text-grafite-claro whitespace-nowrap">{rec ? 'Recomendado · ' : ''}nota {nota(c).toLocaleString('pt-BR')}</span>
              </div>
              <p className="text-sm text-grafite mt-1">{c.descricao}</p>
              <p className="text-xs text-grafite-claro mt-1">Fundamento: {c.fundamento}</p>
              <dl className="mt-3 space-y-1">
                {CRITERIOS.map(k => (
                  <div key={k.chave} className="flex items-center gap-2 text-xs">
                    <dt className="w-20 text-grafite-claro">{k.rotulo}</dt>
                    <dd className="flex-1 h-2 bg-navy/10" aria-label={`${k.rotulo}: ${c[k.chave]} de 5`}>
                      <div className={`h-2 ${rec ? 'bg-dourado' : 'bg-navy/60'}`} style={{ width: `${(c[k.chave] / 5) * 100}%` }} />
                    </dd>
                    <span className="w-6 text-right text-grafite">{c[k.chave]}</span>
                  </div>
                ))}
              </dl>
              {c.zonaCinzenta && <p className="text-xs text-atencao mt-3"><strong>Zona cinzenta:</strong> {c.zonaCinzenta}</p>}
            </div>
          )
        })}
      </div>
      <p className="text-sm text-grafite"><strong>Por que o recomendado:</strong> {m.porque}</p>
      {m.proximosPassos?.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-grafite-claro mb-1">Próximos passos</p>
          <ol className="list-decimal pl-5 text-sm text-grafite space-y-1">{m.proximosPassos.map(p => <li key={p}>{p}</li>)}</ol>
        </div>
      )}
    </div>
  )
}

export default function AssistentePage() {
  const [especialidade, setEspecialidade] = useState<Especialidade>('imobiliario')
  const [pergunta, setPergunta] = useState('')
  const [modo, setModo] = useState<Modo>('responder')
  const [contexto, setContexto] = useState('')
  const [historico, setHistorico] = useState<Consulta[]>([])
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const campo = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Links do menu Instituto abrem o agente certo (?agente=inovacao).
    const pedido = new URLSearchParams(window.location.search).get('agente') as Especialidade | null
    if (pedido && ESPECIALIDADES.some(e => e.valor === pedido)) setEspecialidade(pedido)
    else especialidadePreferida().then(setEspecialidade)
    // A biblioteca de modelos abre já no modo Redigir com o pedido preenchido (?modo=redigir&pedido=...).
    const qs = new URLSearchParams(window.location.search)
    if (qs.get('modo') === 'redigir') setModo('redigir')
    const texto = qs.get('pedido')
    if (texto) setPergunta(texto.slice(0, 2000))
    historicoConsultas().then(setHistorico).catch(e => setErro(e instanceof Error ? e.message : 'Não foi possível carregar o histórico.'))
  }, [])

  const mudarEspecialidade = (e: Especialidade) => {
    setEspecialidade(e)
    guardarEspecialidade(e).catch(() => undefined)
  }

  const enviar = async (texto = pergunta) => {
    const p = texto.trim()
    if (p.length < 5 || ocupado) return
    setOcupado(true)
    setErro('')
    try {
      const c = await perguntar(p, especialidade, historico.filter(h => h.especialidade === especialidade && h.modo === 'responder'), modo, contexto)
      setHistorico(h => [c, ...h])
      setPergunta('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível consultar agora.')
    } finally {
      setOcupado(false)
    }
  }

  const apagar = async (id: string) => {
    setHistorico(h => h.filter(c => c.id !== id))
    try { await apagarConsulta(id) } catch { /* já saiu da tela; o histórico recarrega no próximo acesso */ }
  }

  const rotulo = ESPECIALIDADES.find(e => e.valor === especialidade)?.rotulo ?? 'Geral'

  return (
    <Layout title="Assistente jurídico">
      <div className="space-y-6 max-w-4xl">
        <p className="text-sm text-grafite-claro">
          Pergunte em linguagem natural. O agente da sua especialidade lê a lei no texto compilado oficial do Planalto,
          no momento da pergunta, e responde citando artigo e lei. A resposta apoia o trabalho do advogado; confira o
          texto oficial antes de usar em peça ou parecer.
        </p>

        <section className="bg-white p-6 shadow-sm" aria-labelledby="titulo-especialidade">
          <h2 id="titulo-especialidade" className="text-lg mb-1">Seu agente</h2>
          <p className="text-sm text-grafite-claro mb-4">A escolha fica guardada para o seu usuário.</p>
          <Escolha nome="Especialidade do agente" opcoes={ESPECIALIDADES} valor={especialidade} onChange={mudarEspecialidade} colunas={3} />
        </section>

        <section className="bg-white p-6 shadow-sm" aria-labelledby="titulo-pergunta">
          <h2 id="titulo-pergunta" className="text-lg mb-3 flex items-center gap-2">
            <Scale size={18} aria-hidden="true" /> Pergunta ao agente {rotulo.toLowerCase()}
          </h2>
          <div role="tablist" aria-label="Modo do agente" className="flex flex-wrap gap-2 mb-3">
            {MODOS.map(m => (
              <button key={m.valor} role="tab" aria-selected={modo === m.valor} onClick={() => setModo(m.valor)}
                className={`min-h-[44px] px-4 text-sm border transition ${modo === m.valor ? 'bg-navy text-white border-navy' : 'border-navy/20 text-grafite hover:border-dourado'}`}
                title={m.descricao}>
                {m.rotulo}
              </button>
            ))}
          </div>
          <p className="text-xs text-grafite-claro mb-2">{MODOS.find(m => m.valor === modo)?.descricao}</p>
          <label htmlFor="pergunta" className="sr-only">Pergunta</label>
          <textarea
            id="pergunta"
            ref={campo}
            value={pergunta}
            onChange={e => setPergunta(e.target.value)}
            onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') enviar() }}
            rows={3}
            placeholder={modo === 'redigir' ? 'Ex.: notificação extrajudicial ao locatário por atraso de 3 aluguéis, com prazo de 15 dias' : modo === 'caminhos' ? 'Ex.: locatário comercial com contrato de 5 anos a vencer; o locador não quer renovar. O que fazer?' : 'Ex.: o fiador responde pelo aluguel depois da prorrogação por prazo indeterminado?'}
            className="w-full border border-navy/15 p-3 text-sm focus:outline-none focus:border-dourado"
          />
          {modo !== 'responder' && (
            <>
              <label htmlFor="contexto" className="block text-xs uppercase tracking-wider text-grafite-claro mt-3 mb-1">Fatos do caso (opcional)</label>
              <textarea id="contexto" value={contexto} onChange={e => setContexto(e.target.value)} rows={3}
                placeholder="Partes, datas, valores, o que já aconteceu. Quanto mais fatos, melhor a peça ou a matriz."
                className="w-full border border-navy/15 p-3 text-sm focus:outline-none focus:border-dourado" />
            </>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <button
              onClick={() => enviar()}
              disabled={ocupado || pergunta.trim().length < 5}
              className="inline-flex items-center gap-2 bg-navy text-white min-h-[44px] px-5 rounded-sm uppercase tracking-wider text-sm disabled:opacity-50"
            >
              <Send size={16} aria-hidden="true" /> {ocupado ? 'Lendo a lei e preparando…' : MODOS.find(m => m.valor === modo)?.rotulo}
            </button>
            <span className="text-xs text-grafite-claro">Ctrl+Enter também envia.</span>
          </div>
          {erro && <p role="alert" className="text-sm text-critico mt-3">{erro}</p>}
          {historico.length === 0 && !ocupado && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wider text-grafite-claro mb-2">Exemplos</p>
              <ul className="flex flex-wrap gap-2">
                {EXEMPLOS.map(ex => (
                  <li key={ex}>
                    <button onClick={() => { setPergunta(ex); campo.current?.focus() }} className="text-left text-xs border border-navy/15 px-3 py-2 hover:border-dourado">
                      {ex}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {ocupado && (
          <div className="bg-white p-6 shadow-sm animate-pulse" aria-live="polite">
            <p className="text-sm text-grafite">Consultando o Planalto e preparando a resposta fundamentada…</p>
          </div>
        )}

        {historico.map(c => (
          <article key={c.id} className="bg-white p-6 shadow-sm border-l-2 border-dourado" aria-label={`Consulta: ${c.pergunta}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-grafite-claro">
                  {MODOS.find(m => m.valor === c.modo)?.rotulo ?? 'Perguntar'} · {ESPECIALIDADES.find(e => e.valor === c.especialidade)?.rotulo ?? 'Geral'} ·{' '}
                  {new Date(c.criadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
                <p className="font-serif text-lg text-navy mt-1">{c.pergunta}</p>
              </div>
              <button onClick={() => apagar(c.id)} className="p-2 text-grafite-claro hover:text-critico" aria-label="Apagar esta consulta">
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
            {c.matriz ? <MatrizCaminhos m={c.matriz} /> : (
              <div className="text-sm text-grafite mt-4 space-y-2" dangerouslySetInnerHTML={{ __html: render(c.resposta) }} />
            )}
            {c.modo === 'redigir' && (
              <button onClick={() => navigator.clipboard.writeText(c.resposta)} className="mt-3 inline-flex items-center gap-2 min-h-[44px] px-4 border border-navy/20 text-sm">
                <Copy size={16} aria-hidden="true" /> Copiar texto da peça
              </button>
            )}
            {c.fontes.length > 0 && (
              <div className="mt-4 pt-3 border-t border-navy/10">
                <p className="text-xs uppercase tracking-wider text-grafite-claro mb-1">Texto oficial consultado</p>
                <ul className="flex flex-wrap gap-x-4 gap-y-1">
                  {c.fontes.map(f => (
                    <li key={f.id}>
                      <a href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-navy underline decoration-dourado">
                        {f.titulo} <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        ))}

        <PerfilJulgador />
      </div>
    </Layout>
  )
}
