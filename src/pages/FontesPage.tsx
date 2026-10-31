import { FunctionRegion } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { ExternalLink, Search } from 'lucide-react'

// Fontes que o advogado usa todo dia: digita uma vez (nome, CNPJ, número do processo ou tema)
// e abre cada site já com a busca feita. As que têm ligação direta estão marcadas.
const FONTES: { nome: string; para: string; url: (t: string) => string; direta?: string }[] = [
  { nome: 'Escavador', para: 'Processos e publicações por nome, CPF/CNPJ ou número', url: t => `https://www.escavador.com/busca?q=${encodeURIComponent(t)}`, direta: 'Busca acima (com token)' },
  { nome: 'JusBrasil', para: 'Jurisprudência, diários e processos', url: t => `https://www.jusbrasil.com.br/busca?q=${encodeURIComponent(t)}` },
  { nome: 'DataJud (CNJ)', para: 'Estatísticas de varas e câmaras', url: () => 'https://datajud-wiki.cnj.jus.br/', direta: 'Perfil do julgador' },
  { nome: 'TJRJ – consulta processual', para: 'Andamento de processos no Rio', url: () => 'https://www3.tjrj.jus.br/consultaprocessual/' },
  { nome: 'STJ – jurisprudência', para: 'Acórdãos e súmulas do STJ', url: t => `https://scon.stj.jus.br/SCON/pesquisar.jsp?b=ACOR&livre=${encodeURIComponent(t)}` },
  { nome: 'STF – jurisprudência', para: 'Decisões e temas de repercussão geral', url: t => `https://jurisprudencia.stf.jus.br/pages/search?base=acordaos&queryString=${encodeURIComponent(t)}` },
  { nome: 'Planalto – legislação', para: 'Leis no texto compilado oficial', url: t => `https://www.google.com/search?q=site%3Aplanalto.gov.br+${encodeURIComponent(t)}`, direta: 'Assistente e Legislação' },
  { nome: 'Querido Diário', para: 'Diários oficiais municipais', url: t => `https://queridodiario.ok.org.br/pesquisa?term=${encodeURIComponent(t)}` },
  { nome: 'Receita Federal – CNPJ', para: 'Situação cadastral de empresas', url: () => 'https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp', direta: 'Fornecedores' },
  { nome: 'Banco Central – índices', para: 'IGP-M, IPCA e Selic', url: () => 'https://www3.bcb.gov.br/CALCIDADAO/publico/exibirFormCorrecaoValores.do?method=exibirFormCorrecaoValores', direta: 'Reajuste de contratos' },
]

export default function FontesPage() {
  const [termo, setTermo] = useState('')
  const [busca, setBusca] = useState<{ carregando?: boolean; erro?: string; processos?: { numero: string; titulo: string; tribunal: string | null; ultimaMovimentacao: string | null; classe: string | null; link: string | null }[] } | null>(null)
  const buscarEscavador = async () => {
    setBusca({ carregando: true })
    const { data, error } = await supabase.functions.invoke('escavador', { body: { termo } })
    // Respostas de erro (503, 502…) chegam em error.context; mostramos a mensagem do servidor.
    const corpo = error ? await (error as { context?: Response }).context?.json?.().catch(() => null) : data
    if (error || corpo?.erro) return setBusca({ erro: corpo?.erro ?? 'O Escavador não respondeu. Tente de novo.' })
    setBusca({ processos: data.processos ?? [] })
  }
  // Busca gratuita nas mesmas fontes públicas que o Escavador usa (Comunica PJe, diários oficiais, DataJud).
  const [gratis, setGratis] = useState<{ carregando?: boolean; erro?: string; r?: any } | null>(null)
  const buscarGratis = async () => {
    setGratis({ carregando: true })
    const { data, error } = await supabase.functions.invoke('buscar-partes', { body: { termo }, region: FunctionRegion.SaEast1 })
    const corpo = error ? await (error as { context?: Response }).context?.json?.().catch(() => null) : data
    if (error || corpo?.erro) return setGratis({ erro: corpo?.erro ?? 'As fontes públicas não responderam. Tente de novo.' })
    setGratis({ r: data })
  }
  const dt = (d?: string) => (d ? new Date(d.length === 10 ? `${d}T12:00` : d).toLocaleDateString('pt-BR') : '')
  // Buscas salvas: repetidas todo dia pelo servidor; novidades vão para Intimações e Alertas.
  type Salva = { id: string; termo: string; ultima_execucao: string | null; ultimo_total: number; novas_ultima: number; caso_id: string | null }
  const [casos, setCasos] = useState<{ id: string; titulo: string }[]>([])
  const [salvas, setSalvas] = useState<Salva[]>([])
  const [msgSalva, setMsgSalva] = useState('')
  const carregarSalvas = async () => { const { data } = await supabase.from('buscas_salvas').select('id, termo, ultima_execucao, ultimo_total, novas_ultima, caso_id').order('criado_em'); setSalvas((data ?? []) as Salva[]) }
  // Passo 46: ligar a busca a um caso; comunicação nova vira tarefa do responsável (Meu dia e Alertas).
  const ligarCaso = async (id: string, caso_id: string) => { await supabase.from('buscas_salvas').update({ caso_id: caso_id || null }).eq('id', id); carregarSalvas() }
  useEffect(() => { carregarSalvas(); supabase.from('tarefas').select('id, titulo').eq('nivel', 'projeto').neq('situacao', 'feito').order('criado_em', { ascending: false }).limit(100).then(({ data }) => setCasos((data ?? []) as { id: string; titulo: string }[])) }, [])
  const salvarBusca = async () => {
    setMsgSalva('')
    const { error } = await supabase.from('buscas_salvas').insert({ termo: termo.trim() })
    if (error) return setMsgSalva(error.message.includes('duplicate') ? 'Essa busca já está salva.' : error.message)
    setMsgSalva('Busca salva. Ela será repetida todo dia às 7h15 e as novidades aparecem em Intimações e Alertas.')
    await carregarSalvas()
    // Primeira rodada imediata, só para as buscas deste usuário.
    supabase.functions.invoke('buscar-partes', { body: { salvas: true }, region: FunctionRegion.SaEast1 }).then(carregarSalvas)
  }
  const apagarSalva = async (id: string) => { await supabase.from('buscas_salvas').delete().eq('id', id); carregarSalvas() }
  return (
    <Layout title="Fontes do advogado">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6">
          <label htmlFor="termo" className="block font-medium mb-2">O que você quer procurar?</label>
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-grafite-claro" aria-hidden />
            <input id="termo" value={termo} onChange={e => setTermo(e.target.value)} placeholder="Nome, CNPJ, número do processo ou tema" className="flex-1 border px-3 py-2" />
          </div>
          <p className="text-sm text-grafite-claro mt-2">Escreva uma vez e clique na fonte: ela abre já com a busca feita.</p>
          <button type="button" onClick={buscarGratis} data-testid="buscar-gratis" disabled={termo.trim().length < 4 || !!gratis?.carregando} className="mt-3 mr-2 min-h-[44px] bg-dourado text-white px-5 text-sm uppercase tracking-wider disabled:opacity-50">
            {gratis?.carregando ? 'Buscando…' : 'Buscar grátis (fontes públicas)'}
          </button>
          <button type="button" onClick={buscarEscavador} disabled={termo.trim().length < 3 || !!busca?.carregando} className="mt-3 min-h-[44px] bg-navy text-white px-5 text-sm uppercase tracking-wider disabled:opacity-50">
            {busca?.carregando ? 'Buscando…' : 'Buscar processos no Escavador aqui'}
          </button>
          <button type="button" onClick={salvarBusca} data-testid="salvar-busca" disabled={termo.trim().length < 4 || termo.replace(/\D/g, '').length === 20} className="mt-3 ml-2 min-h-[44px] border border-navy text-navy px-5 text-sm uppercase tracking-wider disabled:opacity-50">
            Salvar e repetir todo dia
          </button>
          {msgSalva && <p role="status" className="mt-3 p-3 text-sm border-l-2 bg-regularFundo border-regular text-regular" data-testid="msg-salva">{msgSalva}</p>}
          {gratis?.erro && <p role="alert" className="mt-3 p-3 text-sm border-l-2 bg-criticoFundo border-critico text-critico">{gratis.erro}</p>}
          {gratis?.r && (
            <div className="mt-4 space-y-4 text-sm" aria-live="polite" data-testid="resultado-gratis">
              {gratis.r.tipo === 'numero' ? (() => { const d = gratis.r.datajud; return !d.ok ? <p>{d.erro}</p> : !d.encontrado ? <p>Processo não encontrado no DataJud ({d.tribunal}).</p> : (
                <div><p className="font-medium">{d.tribunal} · {d.classe} · {d.orgao}</p><p className="text-grafite-claro">Ajuizado em {dt(d.ajuizamento)} · {d.assuntos.join(', ')}</p>
                  <ul className="mt-2 divide-y">{d.movimentos.map((m: any, i: number) => <li key={i} className="py-1">{dt(m.data)} · {m.nome}</li>)}</ul></div>) })() : (<>
                <div><p className="font-medium">Comunicações processuais (CNJ, últimos 12 meses): {gratis.r.comunica.ok ? gratis.r.comunica.total : gratis.r.comunica.erro}</p>
                  <ul className="divide-y">{(gratis.r.comunica.itens ?? []).slice(0, 20).map((i: any, k: number) => <li key={k} className="py-2"><span className="font-mono">{i.numero}</span> · {i.tribunal} · {dt(i.data)} · {i.tipo}<span className="block text-grafite-claro">{i.trecho}</span></li>)}</ul></div>
                <div><p className="font-medium">Diários oficiais municipais (Querido Diário): {gratis.r.queridoDiario.ok ? gratis.r.queridoDiario.total : gratis.r.queridoDiario.erro}</p>
                  <ul className="divide-y">{(gratis.r.queridoDiario.itens ?? []).map((g: any, k: number) => <li key={k} className="py-2">{dt(g.data)} · {g.municipio} · <a href={g.link} target="_blank" rel="noreferrer" className="underline">abrir diário</a><span className="block text-grafite-claro">{g.trecho}</span></li>)}</ul></div>
              </>)}
              <p className="text-xs text-grafite-claro">Fontes públicas e gratuitas: Comunica PJe e DataJud (CNJ) e Querido Diário. Use só para a finalidade do caso (LGPD).</p>
            </div>
          )}
          {busca?.erro && <p role="alert" className="mt-3 p-3 text-sm border-l-2 bg-criticoFundo border-critico text-critico">{busca.erro}</p>}
          {busca?.processos && (
            <div className="mt-4" aria-live="polite">
              <p className="text-sm mb-2">{busca.processos.length ? `${busca.processos.length} processo(s) encontrado(s):` : 'Nenhum processo encontrado.'}</p>
              <ul className="divide-y">
                {busca.processos.map(p => (
                  <li key={p.numero} className="py-2 text-sm">
                    <span className="font-mono">{p.numero}</span>{p.tribunal && ` · ${p.tribunal}`}{p.classe && ` · ${p.classe}`}
                    {p.titulo && <span className="block text-grafite-claro">{p.titulo}</span>}
                    {p.ultimaMovimentacao && <span className="block text-xs text-grafite-claro">Última movimentação: {new Date(p.ultimaMovimentacao).toLocaleDateString('pt-BR')}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FONTES.map(f => (
            <a key={f.nome} data-testid="fonte" href={f.url(termo.trim())} target="_blank" rel="noopener noreferrer" className="bg-white shadow-sm p-5 border-l-4 border-navy hover:border-dourado block">
              <span className="flex items-center justify-between font-serif text-lg text-navy">{f.nome}<ExternalLink className="w-4 h-4" aria-hidden /></span>
              <span className="block text-sm text-grafite-claro mt-1">{f.para}</span>
              {f.direta && <span className="inline-block text-xs bg-pergaminho text-dourado-escuro px-2 py-0.5 mt-2">Ligada à plataforma: {f.direta}</span>}
            </a>
          ))}
        </div>
        <section className="bg-white shadow-sm p-6" data-testid="buscas-salvas">
          <h2 className="font-serif text-lg">Buscas salvas (repetidas todo dia)</h2>
          <p className="text-sm text-grafite-claro mt-1">O servidor procura cada nome no Comunica PJe (CNJ) todas as manhãs. Comunicações novas entram em Intimações e em Alertas, sem API paga. Até 20 por pessoa. Ligue a busca a um caso para que cada novidade vire tarefa do responsável em Meu dia.</p>
          {salvas.length ? (
            <ul className="mt-3 divide-y divide-navy/10">
              {salvas.map(s => (
                <li key={s.id} className="py-2 flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-medium text-navy">{s.termo}</span>
                  <span className="text-grafite-claro">{s.ultima_execucao ? `última rodada ${dt(s.ultima_execucao)} · ${s.ultimo_total} comunicação(ões) no ano · ${s.novas_ultima} nova(s)` : 'ainda não rodou'}</span>
                  <label className="text-xs text-grafite-claro">Caso: <select value={s.caso_id ?? ''} onChange={e => ligarCaso(s.id, e.target.value)} data-testid="busca-caso" aria-label={`Ligar a busca ${s.termo} a um caso`} className="border border-navy/20 rounded-sm px-2 py-1 text-xs max-w-[220px]"><option value="">nenhum</option>{casos.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}</select></label>
                  <button type="button" onClick={() => apagarSalva(s.id)} aria-label={`Apagar busca ${s.termo}`} className="ml-auto text-xs underline text-critico min-h-[44px] px-2">Apagar</button>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-grafite-claro mt-3">Nenhuma busca salva ainda. Digite um nome acima e clique em "Salvar e repetir todo dia".</p>}
        </section>
      </div>
    </Layout>
  )
}
