// Mesa de coordenação BIM em tempo real: sala partilhada, quem está online e apontamentos sincronizados.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { mesclar, aplicar, editar, novoApontamento, painel, normalizarSala, apontamentosParaCSV, apontamentosDeConflitos, SITUACOES, type Apontamento, type Evento, type Situacao } from '@/lib/engenharia/coordenacao'
import { lerCaixas, detectarConflitos, CAIXAS_EXEMPLO } from '@/lib/engenharia/conflitos'

const caixa = 'bg-white p-5 shadow-sm'
const botao = 'text-sm px-3 py-1 border border-navy/30 text-navy hover:bg-navy/5'
const armazem = () => { try { return window.localStorage } catch { return null } }
const chaveSala = (s: string) => `theye-coord-${s}`
function lerSala(s: string): Apontamento[] { try { const v = JSON.parse(armazem()?.getItem(chaveSala(s)) ?? '[]'); return Array.isArray(v) ? v : [] } catch { return [] } }
function gravarSala(s: string, aps: Apontamento[]) { try { armazem()?.setItem(chaveSala(s), JSON.stringify(aps)) } catch { /* sem espaço: segue só em memória */ } }

function baixar(nome: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = nome; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

type Conexao = 'local' | 'conectando' | 'ao vivo' | 'falhou'

export default function CoordenacaoBIM() {
  const [nome, setNome] = useState(() => { try { return armazem()?.getItem('theye-coord-nome') ?? '' } catch { return '' } })
  const [salaTexto, setSalaTexto] = useState('obra-exemplo')
  const [sala, setSala] = useState<string | null>(null)
  const [aps, setAps] = useState<Apontamento[]>([])
  const [online, setOnline] = useState<string[]>([])
  const [conexao, setConexao] = useState<Conexao>('local')
  const [novo, setNovo] = useState({ titulo: '', elemento: '', disciplinas: '', descricao: '', responsavel: '', prazo: '' })
  const [filtro, setFiltro] = useState<Situacao | 'todos'>('todos')
  const canal = useRef<RealtimeChannel | null>(null)
  const apsRef = useRef<Apontamento[]>([])
  apsRef.current = aps

  useEffect(() => { if (sala) gravarSala(sala, aps) }, [sala, aps])

  useEffect(() => {
    if (!sala) return
    setAps(lerSala(sala))
    if (!supabaseConfigurado) { setConexao('local'); return }
    setConexao('conectando')
    const ch = supabase.channel(`coord-eng-${sala}`, { config: { broadcast: { self: false }, presence: { key: `${nome}-${Math.random().toString(36).slice(2, 6)}` } } })
    ch.on('broadcast', { event: 'ev' }, ({ payload }) => setAps(a => aplicar(a, payload as Evento)))
      .on('broadcast', { event: 'pedir-estado' }, () => { ch.send({ type: 'broadcast', event: 'ev', payload: { tipo: 'estado', aps: apsRef.current } satisfies Evento }) })
      .on('presence', { event: 'sync' }, () => {
        const st = ch.presenceState() as Record<string, { nome?: string }[]>
        setOnline([...new Set(Object.values(st).flat().map(p => p.nome ?? '?'))].sort())
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          setConexao('ao vivo')
          ch.track({ nome })
          ch.send({ type: 'broadcast', event: 'pedir-estado', payload: {} })
          ch.send({ type: 'broadcast', event: 'ev', payload: { tipo: 'estado', aps: apsRef.current } satisfies Evento })
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setConexao(c => (c === 'ao vivo' && status === 'CLOSED' ? 'local' : 'falhou'))
      })
    canal.current = ch
    return () => { canal.current = null; supabase.removeChannel(ch) }
  }, [sala, nome])

  const publicar = (lista: Apontamento[]) => {
    setAps(a => mesclar(a, lista))
    canal.current?.send({ type: 'broadcast', event: 'ev', payload: { tipo: 'estado', aps: lista } satisfies Evento })
  }
  const p = useMemo(() => painel(aps), [aps])
  const visiveis = aps.filter(a => !a.apagado && (filtro === 'todos' || a.situacao === filtro))

  if (!sala) {
    return (
      <form className={`${caixa} grid sm:grid-cols-3 gap-3 text-sm`} aria-label="Entrar na mesa de coordenação"
        onSubmit={e => { e.preventDefault(); const s = normalizarSala(salaTexto); if (!s || !nome.trim()) return; try { armazem()?.setItem('theye-coord-nome', nome.trim()) } catch { /* */ } setSala(s) }}>
        <p className="sm:col-span-3 text-grafite-claro">Todos que entrarem na mesma sala veem os mesmos apontamentos ao vivo e sabem quem está online. Use o nome da obra como sala e combine com a equipe.</p>
        <label className="flex flex-col">Seu nome<input required className="border border-navy/20 px-2 py-1" value={nome} onChange={e => setNome(e.target.value)} data-testid="coord-nome" /></label>
        <label className="flex flex-col">Sala (obra)<input required className="border border-navy/20 px-2 py-1" value={salaTexto} onChange={e => setSalaTexto(e.target.value)} data-testid="coord-sala" /></label>
        <div className="flex items-end"><button type="submit" className="text-sm px-3 py-1.5 bg-navy text-white">Entrar na sala</button></div>
      </form>
    )
  }

  return (
    <div className="space-y-4">
      <div className={`${caixa} flex flex-wrap justify-between gap-2 text-sm`}>
        <div><strong>Sala {sala}</strong> · você: {nome}</div>
        <div className="flex flex-wrap gap-2 items-center">
          <span data-testid="coord-conexao" className={`text-xs px-2 py-0.5 ${conexao === 'ao vivo' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
            {conexao === 'ao vivo' ? `ao vivo · ${online.length} online: ${online.join(', ')}` : conexao === 'conectando' ? 'conectando…' : conexao === 'falhou' ? 'sem conexão ao vivo: guardando neste aparelho' : 'modo local (este aparelho)'}
          </span>
          <button type="button" className={botao} onClick={() => setSala(null)}>Sair da sala</button>
        </div>
      </div>
      <div className={`${caixa} grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-sm`} data-testid="coord-painel">
        {([['Total', p.total], ['Abertos', p.aberto], ['Em análise', p.analise], ['Resolvidos', p.resolvido], ['Fechados', p.fechado], ['Atrasados', p.atrasados]] as [string, number][]).map(([r, v]) => (
          <div key={r}><div className="text-xs uppercase text-grafite-claro">{r}</div><div className={`text-lg ${r === 'Atrasados' && v ? 'text-red-700' : 'text-navy'}`}>{v}</div></div>))}
      </div>
      <form className={`${caixa} grid sm:grid-cols-3 gap-2 text-sm`} aria-label="Novo apontamento" onSubmit={e => {
        e.preventDefault(); if (!novo.titulo.trim()) return
        publicar([novoApontamento(novo, nome)]); setNovo({ titulo: '', elemento: '', disciplinas: '', descricao: '', responsavel: '', prazo: '' })
      }}>
        <input aria-label="Título" required placeholder="Título do apontamento" className="border border-navy/20 px-2 py-1 sm:col-span-2" value={novo.titulo} onChange={e => setNovo({ ...novo, titulo: e.target.value })} data-testid="coord-titulo" />
        <input aria-label="Elemento" placeholder="Elemento (ex.: V1, T1)" className="border border-navy/20 px-2 py-1" value={novo.elemento} onChange={e => setNovo({ ...novo, elemento: e.target.value })} />
        <input aria-label="Disciplinas" placeholder="Disciplinas (ex.: Estrutura × Hidráulica)" className="border border-navy/20 px-2 py-1" value={novo.disciplinas} onChange={e => setNovo({ ...novo, disciplinas: e.target.value })} />
        <input aria-label="Responsável" placeholder="Responsável" className="border border-navy/20 px-2 py-1" value={novo.responsavel} onChange={e => setNovo({ ...novo, responsavel: e.target.value })} />
        <input aria-label="Prazo" type="date" className="border border-navy/20 px-2 py-1" value={novo.prazo} onChange={e => setNovo({ ...novo, prazo: e.target.value })} />
        <textarea aria-label="Descrição" placeholder="Descrição" className="border border-navy/20 px-2 py-1 sm:col-span-3" rows={2} value={novo.descricao} onChange={e => setNovo({ ...novo, descricao: e.target.value })} />
        <div className="sm:col-span-3 flex flex-wrap gap-2">
          <button type="submit" className="text-sm px-3 py-1 bg-navy text-white">Adicionar</button>
          <button type="button" className={botao} onClick={() => publicar(apontamentosDeConflitos(detectarConflitos(lerCaixas(CAIXAS_EXEMPLO), { folga: 0.05 }), nome))}>Trazer os conflitos do exemplo</button>
          <button type="button" className={botao} onClick={() => baixar(`coordenacao-${sala}.csv`, apontamentosParaCSV(aps))}>Baixar pauta (.csv)</button>
        </div>
      </form>
      <div className={`${caixa} overflow-x-auto`}>
        <div className="flex flex-wrap gap-2 mb-2">{(['todos', ...SITUACOES] as const).map(s => <button key={s} type="button" aria-pressed={filtro === s} className={`text-xs px-2 py-1 border ${filtro === s ? 'bg-navy text-white border-navy' : 'border-navy/30'}`} onClick={() => setFiltro(s)}>{s}</button>)}</div>
        {visiveis.length === 0 ? <p className="text-sm text-grafite-claro">Nenhum apontamento.</p> : (
          <table className="w-full text-sm" data-testid="coord-tabela"><thead><tr className="text-left text-xs uppercase text-grafite-claro"><th className="pr-2">Título</th><th className="pr-2">Elemento</th><th className="pr-2">Disciplinas</th><th className="pr-2">Responsável</th><th className="pr-2">Prazo</th><th className="pr-2">Situação</th><th>Última mudança</th></tr></thead>
            <tbody>{visiveis.map(a => (
              <tr key={a.id} className="border-t border-navy/10 align-top">
                <td className="pr-2"><div className="font-medium">{a.titulo}</div>{a.descricao && <div className="text-xs text-grafite-claro">{a.descricao}</div>}</td>
                <td className="pr-2">{a.elemento}</td><td className="pr-2">{a.disciplinas}</td>
                <td className="pr-2"><input aria-label={`Responsável de ${a.titulo}`} className="w-28 border border-navy/10 px-1" defaultValue={a.responsavel} onBlur={e => e.target.value !== a.responsavel && publicar([editar(a, { responsavel: e.target.value }, nome)])} /></td>
                <td className="pr-2"><input aria-label={`Prazo de ${a.titulo}`} type="date" className="border border-navy/10 px-1" value={a.prazo} onChange={e => publicar([editar(a, { prazo: e.target.value }, nome)])} /></td>
                <td className="pr-2"><select aria-label={`Situação de ${a.titulo}`} className="border border-navy/20 px-1" value={a.situacao} onChange={e => publicar([editar(a, { situacao: e.target.value as Situacao }, nome)])}>{SITUACOES.map(s => <option key={s}>{s}</option>)}</select></td>
                <td className="text-xs text-grafite-claro">{a.atualizadoPor} · {a.atualizadoEm.slice(0, 16).replace('T', ' ')} · v{a.versao}
                  <button type="button" className="block text-red-700" onClick={() => publicar([editar(a, { apagado: true }, nome)])}>remover</button></td>
              </tr>))}</tbody></table>
        )}
      </div>
      <p className="text-xs text-grafite-claro">A troca ao vivo não grava no banco: cada aparelho guarda a sua cópia da pauta, e quem entra recebe o que os outros já têm. Quem estiver sem internet continua trabalhando e sincroniza ao voltar. Visualização 3D partilhada do modelo fica para a fase seguinte.</p>
    </div>
  )
}
