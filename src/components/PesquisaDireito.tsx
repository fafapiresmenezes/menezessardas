import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { perguntar } from '@/lib/assistente'
import { ExternalLink, FlaskConical, Globe2, Scale } from 'lucide-react'

// Pesquisa e desenvolvimento do direito (pedido de M, 30/10/2026): jurisprudência brasileira, direito estrangeiro
// e comparado, e o programa do Instituto THEYE de pesquisas para o desenvolvimento do direito brasileiro,
// ligadas a casos internos ou a perguntas do mundo todo. Só fontes gratuitas; a IA sinaliza o que precisa conferir.
const q = (s: string) => encodeURIComponent(s.trim())
const BRASIL = [
  { nome: 'STF — jurisprudência', url: (t: string) => `https://jurisprudencia.stf.jus.br/pages/search?base=acordaos&pesquisa_inteiro_teor=false&sinonimo=true&plural=true&radicais=false&buscaExata=true&page=1&pageSize=10&queryString=${q(t)}&sort=_score&sortBy=desc` },
  { nome: 'STJ — jurisprudência', url: (t: string) => `https://scon.stj.jus.br/SCON/pesquisar.jsp?livre=${q(t)}&b=ACOR` },
  { nome: 'TST — jurisprudência', url: (t: string) => `https://jurisprudencia.tst.jus.br/#/pesquisa?texto=${q(t)}` },
  { nome: 'TJRJ — jurisprudência', url: (t: string) => `https://www3.tjrj.jus.br/ejuris/ConsultarJurisprudencia.aspx?CodDesc=${q(t)}` },
  { nome: 'Súmulas STF e STJ (Planalto/Jus)', url: (t: string) => `https://www.google.com/search?q=s%C3%BAmula+${q(t)}+site%3Astf.jus.br+OR+site%3Astj.jus.br` },
  { nome: 'Teses repetitivas e repercussão geral', url: (t: string) => `https://www.google.com/search?q=${q(t)}+%22tema%22+repetitivo+OR+%22repercuss%C3%A3o+geral%22+site%3Astj.jus.br+OR+site%3Astf.jus.br` },
]
const MUNDO = [
  { nome: 'CourtListener (EUA, todas as cortes)', url: (t: string) => `https://www.courtlistener.com/?q=${q(t)}` },
  { nome: 'EUR-Lex (União Europeia)', url: (t: string) => `https://eur-lex.europa.eu/search.html?scope=EURLEX&text=${q(t)}&lang=pt&type=quick` },
  { nome: 'HUDOC (Corte Europeia de Direitos Humanos)', url: (t: string) => `https://hudoc.echr.coe.int/eng#{%22fulltext%22:[%22${q(t)}%22]}` },
  { nome: 'BAILII (Reino Unido e Irlanda)', url: (t: string) => `https://www.bailii.org/cgi-bin/lucy_search_1.cgi?query=${q(t)}` },
  { nome: 'CanLII (Canadá)', url: (t: string) => `https://www.canlii.org/en/#search/text=${q(t)}` },
  { nome: 'Légifrance (França)', url: (t: string) => `https://www.legifrance.gouv.fr/search/all?tab_selection=all&searchField=ALL&query=${q(t)}&page=1` },
  { nome: 'DGSI (Portugal)', url: (t: string) => `https://www.google.com/search?q=${q(t)}+site%3Adgsi.pt` },
  { nome: 'Corte Interamericana de Direitos Humanos', url: (t: string) => `https://www.google.com/search?q=${q(t)}+site%3Acorteidh.or.cr` },
  { nome: 'WorldLII (mundo)', url: (t: string) => `http://www.worldlii.org/cgi-bin/sinosrch.cgi?query=${q(t)}` },
]
type Pesquisa = { id: string; titulo: string; pergunta: string; origem: string; caso_id: string | null; jurisdicoes: string; status: string; nota: string | null; nota_em: string | null; criado_em: string }
type Caso = { id: string; titulo: string; cliente: string | null }

export default function PesquisaDireito() {
  const [termo, setTermo] = useState('')
  const [lista, setLista] = useState<Pesquisa[]>([])
  const [casos, setCasos] = useState<Caso[]>([])
  const [form, setForm] = useState({ titulo: '', pergunta: '', origem: 'caso interno', caso_id: '', jurisdicoes: 'Brasil, EUA, União Europeia' })
  const [msg, setMsg] = useState('')
  const [gerando, setGerando] = useState<string | null>(null)
  const carregar = async () => {
    const { data } = await supabase.from('pesquisas_instituto').select('*').order('criado_em', { ascending: false })
    setLista((data ?? []) as Pesquisa[])
  }
  useEffect(() => {
    carregar()
    supabase.from('tarefas').select('id,titulo,cliente').is('pai_id', null).order('criado_em', { ascending: false }).limit(100).then(({ data }) => setCasos((data ?? []) as Caso[]))
  }, [])
  const salvar = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg('')
    const { error } = await supabase.from('pesquisas_instituto').insert({ titulo: form.titulo.trim(), pergunta: form.pergunta.trim(), origem: form.origem, caso_id: form.caso_id || null, jurisdicoes: form.jurisdicoes.trim() || 'Brasil' })
    if (error) return setMsg(error.message)
    setMsg('Pesquisa registrada no programa do Instituto.'); setForm({ ...form, titulo: '', pergunta: '', caso_id: '' }); carregar()
  }
  const gerar = async (p: Pesquisa) => {
    setGerando(p.id); setMsg('')
    try {
      await supabase.from('pesquisas_instituto').update({ status: 'em andamento' }).eq('id', p.id)
      const r = await perguntar(`Pesquisa do Instituto: "${p.titulo}". Pergunta: ${p.pergunta}. Jurisdições a comparar: ${p.jurisdicoes}. Origem: ${p.origem}.`, 'pesquisa', [], 'responder', '', false)
      await supabase.from('pesquisas_instituto').update({ nota: r.resposta, nota_em: new Date().toISOString(), status: 'concluida' }).eq('id', p.id)
      await carregar()
    } catch (e) { setMsg(e instanceof Error ? e.message : 'A IA não respondeu.') } finally { setGerando(null) }
  }
  const apagar = async (id: string) => { await supabase.from('pesquisas_instituto').delete().eq('id', id); carregar() }
  const casoNome = (id: string | null) => { const c = casos.find(x => x.id === id); return c ? `${c.titulo}${c.cliente ? ` (${c.cliente})` : ''}` : '' }
  return (
    <div className="space-y-6" data-testid="pesquisa-direito">
      <section className="bg-white p-6 shadow-sm">
        <h2 className="text-lg mb-1 flex items-center gap-2"><Scale size={18} className="text-dourado" aria-hidden /> Jurisprudência brasileira e direito estrangeiro</h2>
        <p className="text-sm text-grafite-claro mb-3">Escreva o tema uma vez; cada fonte gratuita abre já com a busca feita. Nenhuma API paga.</p>
        <label htmlFor="pesq-termo" className="sr-only">Tema da pesquisa</label>
        <input id="pesq-termo" value={termo} onChange={e => setTermo(e.target.value)} placeholder="Ex.: despejo liminar caução, dano moral consumidor, non-compete clause" className="w-full border px-3 py-2" />
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div>
            <h3 className="text-sm font-medium text-navy mb-2">Brasil</h3>
            <ul className="space-y-1">{BRASIL.map(f => <li key={f.nome}><a data-testid="fonte-br" href={f.url(termo || 'direito')} target="_blank" rel="noopener noreferrer" className="text-sm underline decoration-dourado inline-flex items-center gap-1">{f.nome} <ExternalLink size={12} aria-hidden /></a></li>)}</ul>
          </div>
          <div>
            <h3 className="text-sm font-medium text-navy mb-2 flex items-center gap-1"><Globe2 size={14} aria-hidden /> Direito estrangeiro e comparado</h3>
            <ul className="space-y-1">{MUNDO.map(f => <li key={f.nome}><a data-testid="fonte-mundo" href={f.url(termo || 'law')} target="_blank" rel="noopener noreferrer" className="text-sm underline decoration-dourado inline-flex items-center gap-1">{f.nome} <ExternalLink size={12} aria-hidden /></a></li>)}</ul>
          </div>
        </div>
        <Link to={`/assistente?agente=pesquisa${termo ? `&pedido=${q(`Pesquise jurisprudência brasileira e direito comparado sobre: ${termo}`)}` : ''}`} data-testid="agente-pesquisa" className="mt-4 inline-flex items-center gap-2 bg-navy text-white min-h-[44px] px-5 uppercase tracking-wider text-sm">Perguntar ao pesquisador do Instituto</Link>
      </section>
      <section className="bg-white p-6 shadow-sm">
        <h2 className="text-lg mb-1 flex items-center gap-2"><FlaskConical size={18} className="text-dourado" aria-hidden /> Programa de desenvolvimento do direito brasileiro</h2>
        <p className="text-sm text-grafite-claro mb-3">Perguntas que nascem de casos internos ou de soluções do mundo todo viram pesquisas do Instituto THEYE: o pesquisador compara jurisdições, propõe teses para o direito brasileiro e diz como aplicar no caso. Tudo fica registrado para o escritório.</p>
        <form onSubmit={salvar} className="grid gap-3 md:grid-cols-2" data-testid="form-pesquisa">
          <label className="text-sm md:col-span-2">Título<input required minLength={3} value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} id="pesq-titulo" className="mt-1 w-full border px-3 py-2" placeholder="Ex.: Cláusula de não concorrência em locação comercial: o que fazem EUA e UE" /></label>
          <label className="text-sm md:col-span-2">Pergunta de pesquisa<textarea required minLength={10} rows={3} value={form.pergunta} onChange={e => setForm({ ...form, pergunta: e.target.value })} id="pesq-pergunta" className="mt-1 w-full border px-3 py-2" placeholder="O que o direito brasileiro ainda não resolve bem e como outras jurisdições tratam?" /></label>
          <label className="text-sm">Origem<select value={form.origem} onChange={e => setForm({ ...form, origem: e.target.value })} id="pesq-origem" className="mt-1 w-full border px-3 py-2"><option value="caso interno">Caso interno do escritório</option><option value="mundo">Solução ou pergunta do mundo</option><option value="academia">Academia</option></select></label>
          <label className="text-sm">Caso relacionado (opcional)<select value={form.caso_id} onChange={e => setForm({ ...form, caso_id: e.target.value })} id="pesq-caso" className="mt-1 w-full border px-3 py-2"><option value="">Nenhum</option>{casos.map(c => <option key={c.id} value={c.id}>{c.titulo}{c.cliente ? ` (${c.cliente})` : ''}</option>)}</select></label>
          <label className="text-sm md:col-span-2">Jurisdições a comparar<input value={form.jurisdicoes} onChange={e => setForm({ ...form, jurisdicoes: e.target.value })} id="pesq-jurisdicoes" className="mt-1 w-full border px-3 py-2" /></label>
          <div className="md:col-span-2"><button type="submit" data-testid="salvar-pesquisa" className="min-h-[44px] bg-navy text-white px-5 text-sm uppercase tracking-wider">Registrar pesquisa</button></div>
        </form>
        {msg && <p role="status" data-testid="msg-pesquisa" className="mt-3 p-3 text-sm border-l-2 bg-regularFundo border-regular text-regular">{msg}</p>}
        <ul className="mt-5 divide-y divide-navy/10" data-testid="lista-pesquisas">
          {lista.map(p => (
            <li key={p.id} className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-navy">{p.titulo}</span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 border border-navy/20 text-grafite-claro">{p.status}</span>
                <span className="text-xs text-grafite-claro">{p.origem}{p.caso_id ? ` · ${casoNome(p.caso_id)}` : ''} · {p.jurisdicoes}</span>
                <div className="ml-auto flex gap-2">
                  <button type="button" onClick={() => gerar(p)} disabled={gerando === p.id} data-testid="gerar-nota" className="min-h-[36px] px-3 text-xs uppercase tracking-wider border border-navy text-navy disabled:opacity-50">{gerando === p.id ? 'Pesquisando…' : p.nota ? 'Refazer nota' : 'Gerar nota de pesquisa'}</button>
                  <button type="button" onClick={() => apagar(p.id)} aria-label={`Apagar pesquisa ${p.titulo}`} className="text-xs underline text-critico px-2">Apagar</button>
                </div>
              </div>
              <p className="text-sm text-grafite mt-1">{p.pergunta}</p>
              {p.nota && <details className="mt-2"><summary className="text-sm text-navy cursor-pointer">Nota de pesquisa ({p.nota_em ? new Date(p.nota_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''})</summary><pre className="whitespace-pre-wrap text-sm mt-2 font-sans" data-testid="nota-pesquisa">{p.nota}</pre></details>}
            </li>
          ))}
          {!lista.length && <li className="py-3 text-sm text-grafite-claro">Nenhuma pesquisa registrada ainda.</li>}
        </ul>
      </section>
    </div>
  )
}
