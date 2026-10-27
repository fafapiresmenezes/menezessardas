import { useEffect, useRef, useState } from 'react'
import Layout from '@/components/Layout'
import { Escolha } from '@/components/Assistente'
import {
  ESPECIALIDADES,
  apagarConsulta,
  especialidadePreferida,
  guardarEspecialidade,
  historicoConsultas,
  perguntar,
  type Consulta,
  type Especialidade,
} from '@/lib/assistente'
import { ExternalLink, Scale, Send, Trash2 } from 'lucide-react'

const EXEMPLOS = [
  'O locatário de loja com contrato de 5 anos tem direito à renovação? Qual o prazo para a ação?',
  'Posso reajustar o aluguel antes de 12 meses se o contrato não fala em índice?',
  'Quais garantias a lei permite na locação e posso exigir duas ao mesmo tempo?',
  'O condômino inadimplente pode ser proibido de usar a piscina?',
]

/** Markdown simples (negrito, listas, títulos) → HTML seguro. */
function render(md: string) {
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

export default function AssistentePage() {
  const [especialidade, setEspecialidade] = useState<Especialidade>('imobiliario')
  const [pergunta, setPergunta] = useState('')
  const [historico, setHistorico] = useState<Consulta[]>([])
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const campo = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    especialidadePreferida().then(setEspecialidade)
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
      const c = await perguntar(p, especialidade, historico.filter(h => h.especialidade === especialidade))
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
          <h3 id="titulo-especialidade" className="text-lg mb-1">Seu agente</h3>
          <p className="text-sm text-grafite-claro mb-4">A escolha fica guardada para o seu usuário.</p>
          <Escolha nome="Especialidade do agente" opcoes={ESPECIALIDADES} valor={especialidade} onChange={mudarEspecialidade} colunas={3} />
        </section>

        <section className="bg-white p-6 shadow-sm" aria-labelledby="titulo-pergunta">
          <h3 id="titulo-pergunta" className="text-lg mb-3 flex items-center gap-2">
            <Scale size={18} aria-hidden="true" /> Pergunta ao agente {rotulo.toLowerCase()}
          </h3>
          <label htmlFor="pergunta" className="sr-only">Pergunta</label>
          <textarea
            id="pergunta"
            ref={campo}
            value={pergunta}
            onChange={e => setPergunta(e.target.value)}
            onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') enviar() }}
            rows={3}
            placeholder="Ex.: o fiador responde pelo aluguel depois da prorrogação por prazo indeterminado?"
            className="w-full border border-navy/15 p-3 text-sm focus:outline-none focus:border-dourado"
          />
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <button
              onClick={() => enviar()}
              disabled={ocupado || pergunta.trim().length < 5}
              className="inline-flex items-center gap-2 bg-navy text-white min-h-[44px] px-5 rounded-sm uppercase tracking-wider text-sm disabled:opacity-50"
            >
              <Send size={16} aria-hidden="true" /> {ocupado ? 'Lendo a lei e respondendo…' : 'Perguntar'}
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
                  {ESPECIALIDADES.find(e => e.valor === c.especialidade)?.rotulo ?? 'Geral'} ·{' '}
                  {new Date(c.criadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
                <p className="font-serif text-lg text-navy mt-1">{c.pergunta}</p>
              </div>
              <button onClick={() => apagar(c.id)} className="p-2 text-grafite-claro hover:text-critico" aria-label="Apagar esta consulta">
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="text-sm text-grafite mt-4 space-y-2" dangerouslySetInnerHTML={{ __html: render(c.resposta) }} />
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
      </div>
    </Layout>
  )
}
