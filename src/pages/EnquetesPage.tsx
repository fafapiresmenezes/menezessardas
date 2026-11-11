import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import Vazio from '@/components/Vazio'
import { supabase } from '@/lib/supabase'
import { perfilAtual } from '@/lib/equipe'
import { aberta, resumir, validar, type Enquete, type Resultado } from '@/lib/enquetes'
import { Vote, Plus, Globe, Lock } from 'lucide-react'

// Bloco B14 (pedido de M, 06/11/2026): enquetes sobre temas do desenvolvimento do direito.
// Um voto por conta. Ninguém vê voto de ninguém: a tela mostra só o agregado, com n e margem de erro.

type Estado = { votei: number | null; resultado: Resultado | null }

export default function EnquetesPage() {
  const [admin, setAdmin] = useState(false)
  const [lista, setLista] = useState<Enquete[]>([])
  const [estado, setEstado] = useState<Record<number, Estado>>({})
  const [msg, setMsg] = useState<{ ok?: string; erro?: string }>({})
  const [nova, setNova] = useState({ tema: '', pergunta: '', opcoes: ['', ''], publica: false, dias: 14 })
  const [criando, setCriando] = useState(false)

  const carregar = async () => {
    const { data } = await supabase.from('enquetes').select('id,tema,pergunta,opcoes,publica,aberta_ate,criado_em').order('criado_em', { ascending: false }).limit(50)
    const es = (data ?? []) as Enquete[]
    setLista(es)
    const { data: meus } = await supabase.from('enquete_votos').select('enquete_id,opcao')
    const votei = new Map<number, number>((meus ?? []).map((v: { enquete_id: number; opcao: number }) => [v.enquete_id, v.opcao]))
    const novo: Record<number, Estado> = {}
    for (const e of es) {
      const v = votei.get(e.id) ?? null
      let resultado: Resultado | null = null
      if (v !== null || !aberta(e)) { const { data: r } = await supabase.rpc('enquete_resultado', { p_id: e.id }); resultado = (r as Resultado | null) ?? null }
      novo[e.id] = { votei: v, resultado }
    }
    setEstado(novo)
  }
  useEffect(() => { perfilAtual().then(f => setAdmin(f === 'admin')).catch(() => undefined); carregar() }, [])

  const votar = async (e: Enquete, opcao: number) => {
    setMsg({})
    const { error } = await supabase.from('enquete_votos').insert({ enquete_id: e.id, opcao })
    if (error) return setMsg({ erro: 'Não foi possível registrar o voto. Talvez você já tenha votado ou a enquete fechou.' })
    setMsg({ ok: 'Voto registrado. Só o total aparece para a equipe; ninguém vê o seu voto.' })
    carregar()
  }

  const criar = async () => {
    setMsg({})
    const erro = validar(nova); if (erro) return setMsg({ erro })
    const opcoes = nova.opcoes.map(o => o.trim()).filter(Boolean)
    const { error } = await supabase.from('enquetes').insert({ tema: nova.tema.trim(), pergunta: nova.pergunta.trim(), opcoes, publica: nova.publica, aberta_ate: new Date(Date.now() + nova.dias * 86400000).toISOString() })
    if (error) return setMsg({ erro: 'Não foi possível criar a enquete agora.' })
    setMsg({ ok: 'Enquete criada.' }); setCriando(false); setNova({ tema: '', pergunta: '', opcoes: ['', ''], publica: false, dias: 14 }); carregar()
  }

  return (
    <Layout title="Enquetes do direito">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl space-y-1">
            <p className="text-sm text-grafite-claro">Votação da equipe sobre temas importantes para o desenvolvimento do direito. Um voto por pessoa; o resultado mostra sempre o número de votos e a margem de erro, e só declara um lado vencedor quando os intervalos não se cruzam. Enquetes marcadas como públicas aparecem no site do THEYE Institute apenas como agregado, e só a partir de 10 votos.</p>
          </div>
          {admin && <button type="button" onClick={() => setCriando(c => !c)} className="min-h-[44px] px-4 bg-navy text-white text-sm uppercase tracking-wider inline-flex items-center gap-2" data-testid="nova-enquete"><Plus className="w-4 h-4" aria-hidden />Nova enquete</button>}
        </section>
        {msg.ok && <p role="status" className="text-sm text-sucesso bg-sucesso/10 px-4 py-2">{msg.ok}</p>}
        {msg.erro && <p role="alert" className="text-sm text-perigo bg-perigo/10 px-4 py-2">{msg.erro}</p>}

        {admin && criando && (
          <section className="bg-white shadow-sm p-6 space-y-3" data-testid="form-enquete">
            <h2 className="font-serif text-xl">Nova enquete</h2>
            <label className="block text-sm"><span className="font-medium">Tema</span><input value={nova.tema} onChange={e => setNova({ ...nova, tema: e.target.value })} className="border w-full px-3 py-2 mt-1 min-h-[44px]" placeholder="ex.: IA no Judiciário" /></label>
            <label className="block text-sm"><span className="font-medium">Pergunta</span><textarea value={nova.pergunta} onChange={e => setNova({ ...nova, pergunta: e.target.value })} rows={2} className="border w-full px-3 py-2 mt-1" /></label>
            <fieldset className="space-y-2"><legend className="text-sm font-medium">Opções (2 a 6)</legend>
              {nova.opcoes.map((o, i) => <input key={i} aria-label={`Opção ${i + 1}`} value={o} onChange={e => setNova({ ...nova, opcoes: nova.opcoes.map((x, j) => j === i ? e.target.value : x) })} className="border w-full px-3 py-2 min-h-[44px]" />)}
              {nova.opcoes.length < 6 && <button type="button" onClick={() => setNova({ ...nova, opcoes: [...nova.opcoes, ''] })} className="text-sm underline min-h-[44px]">Mais uma opção</button>}
            </fieldset>
            <div className="flex flex-wrap gap-4 items-center text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={nova.publica} onChange={e => setNova({ ...nova, publica: e.target.checked })} className="w-5 h-5" />Pública no site do Instituto (só agregado, a partir de 10 votos)</label>
              <label className="flex items-center gap-2">Aberta por <input type="number" min={1} max={90} value={nova.dias} onChange={e => setNova({ ...nova, dias: Number(e.target.value) || 14 })} className="border w-20 px-2 py-1 min-h-[44px]" aria-label="Dias aberta" /> dias</label>
            </div>
            <button type="button" onClick={criar} className="min-h-[44px] px-4 bg-navy text-white text-sm uppercase tracking-wider">Criar enquete</button>
          </section>
        )}

        {lista.length === 0 ? <Vazio testid="enquetes-vazio" icone={<Vote size={28} />} titulo="Nenhuma enquete ainda" texto={admin ? 'Crie a primeira com o botão acima.' : 'Quando um administrador abrir uma enquete, ela aparece aqui.'} /> : (
          <div className="space-y-4">
            {lista.map(e => {
              const st = estado[e.id]
              const ab = aberta(e)
              const r = resumir(e.opcoes, st?.resultado ?? null)
              const mostrarResultado = st?.votei !== null && st?.votei !== undefined || !ab
              return (
                <article key={e.id} className="bg-white shadow-sm p-6 space-y-3" data-testid={`enquete-${e.id}`}>
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-grafite-claro">
                    <span className="text-dourado-escuro font-semibold">{e.tema}</span>
                    <span>·</span><span>{ab ? `aberta até ${new Date(e.aberta_ate).toLocaleDateString('pt-BR')}` : 'encerrada'}</span>
                    <span>·</span><span className="inline-flex items-center gap-1">{e.publica ? <><Globe className="w-3 h-3" aria-hidden />pública (agregado)</> : <><Lock className="w-3 h-3" aria-hidden />só a equipe</>}</span>
                  </div>
                  <h2 className="font-serif text-lg">{e.pergunta}</h2>
                  {!mostrarResultado ? (
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Opções de voto">
                      {e.opcoes.map((o, i) => <button key={i} type="button" onClick={() => votar(e, i)} className="min-h-[44px] px-4 border border-navy/30 text-sm hover:bg-navy/5">{o}</button>)}
                    </div>
                  ) : (
                    <div className="space-y-2" data-testid={`resultado-${e.id}`}>
                      {r.linhas.map((l, i) => (
                        <div key={i} className="text-sm">
                          <div className="flex justify-between"><span>{l.opcao}{st?.votei === i && <span className="text-grafite-claro"> (seu voto)</span>}</span><span className="font-medium">{(l.p * 100).toFixed(0)}% <span className="text-grafite-claro font-normal">({(l.min * 100).toFixed(0)}–{(l.max * 100).toFixed(0)}%)</span></span></div>
                          <div className="h-2 bg-navy/10 relative" aria-hidden>
                            <div className="absolute inset-y-0 bg-navy/20" style={{ left: `${l.min * 100}%`, width: `${Math.max(0, (l.max - l.min) * 100)}%` }} />
                            <div className="absolute inset-y-0 w-0.5 bg-navy" style={{ left: `${l.p * 100}%` }} />
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-grafite-claro">
                        {r.n} voto{r.n === 1 ? '' : 's'} · margem máxima ±{r.margem} pontos · {r.n === 0 ? 'sem votos ainda' : r.amostraPequena ? 'amostra pequena: resultado só indicativo' : r.empate ? 'empate técnico: os intervalos se cruzam' : `à frente: ${r.lider}`}
                      </p>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
