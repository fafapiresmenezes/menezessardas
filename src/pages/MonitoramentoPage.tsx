import { useEffect, useState } from 'react'
import { FunctionRegion } from '@supabase/supabase-js'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { Radar, Trash2, RefreshCw } from 'lucide-react'

// Monitoramento de processos e de nomes (como o do Escavador), com fontes públicas do CNJ.
// O robô verifica todo dia às 7h30 (Brasília); o botão verifica na hora.
type Mon = { id: string; tipo: 'processo' | 'nome'; valor: string; rotulo: string | null; ultimo_estado: { classe?: string; orgao?: string; encontrado?: boolean } | null
  novidades: { data: string; texto: string; vista_em: string }[]; verificado_em: string | null; novidade_em: string | null }
const dt = (d?: string | null) => (d ? new Date(d.length === 10 ? `${d}T12:00` : d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: d.length === 10 ? undefined : 'short' }) : 'ainda não')

export default function MonitoramentoPage() {
  const [lista, setLista] = useState<Mon[]>([])
  const [tipo, setTipo] = useState<'processo' | 'nome'>('processo')
  const [valor, setValor] = useState('')
  const [rotulo, setRotulo] = useState('')
  const [msg, setMsg] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const carregar = async () => {
    const { data } = await supabase.from('monitoramentos').select('id,tipo,valor,rotulo,ultimo_estado,novidades,verificado_em,novidade_em').order('novidade_em', { ascending: false, nullsFirst: false })
    setLista((data ?? []) as Mon[])
  }
  useEffect(() => { carregar() }, [])
  const verificar = async (id?: string) => {
    setOcupado(true); setMsg('')
    const { data, error } = await supabase.functions.invoke('monitorar', { body: id ? { id } : {}, region: FunctionRegion.SaEast1 })
    setOcupado(false)
    if (error) return setMsg('As fontes do CNJ não responderam agora. Tente de novo em instantes.')
    const novas = (data?.resumo ?? []).reduce((s: number, r: { novas: number }) => s + r.novas, 0)
    const erros = (data?.resumo ?? []).filter((r: { erro?: string }) => r.erro).map((r: { valor: string; erro: string }) => `${r.valor}: ${r.erro}`)
    setMsg(`${data?.verificados ?? 0} verificado(s), ${novas} novidade(s).${erros.length ? ` Falhas: ${erros.join('; ')}` : ''}`)
    carregar()
  }
  const adicionar = async () => {
    setMsg('')
    const v = valor.trim()
    if (tipo === 'processo' && v.replace(/\D/g, '').length !== 20) return setMsg('O número do processo precisa ter 20 dígitos (padrão CNJ).')
    if (v.length < 4) return setMsg('Digite pelo menos 4 letras.')
    const { data, error } = await supabase.from('monitoramentos').insert({ tipo, valor: tipo === 'processo' ? v.replace(/\D/g, '') : v.toUpperCase(), rotulo: rotulo.trim() || null }).select('id').single()
    if (error) return setMsg(error.code === '23505' ? 'Isso já está sendo monitorado.' : 'Não foi possível adicionar (leitores não incluem monitoramentos).')
    setValor(''); setRotulo('')
    await verificar(data.id)
  }
  const remover = async (id: string) => { await supabase.from('monitoramentos').delete().eq('id', id); carregar() }
  return (
    <Layout title="Monitoramento de processos">
      <div className="space-y-5">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-5">
          <p className="text-sm mb-3">Acompanhe processos pelo número e nomes de clientes ou contrapartes. Todo dia às 7h30 o robô verifica o CNJ e mostra o que mudou. Grátis, sem Escavador.</p>
          <div role="radiogroup" className="flex gap-2 mb-3">
            {(['processo', 'nome'] as const).map(t => <button key={t} type="button" role="radio" aria-checked={tipo === t} onClick={() => setTipo(t)} className={`min-h-[44px] px-4 text-sm border ${tipo === t ? 'bg-navy text-white' : ''}`}>{t === 'processo' ? 'Processo (número)' : 'Nome de parte'}</button>)}
          </div>
          <div className="grid gap-2 md:grid-cols-5">
            <input value={valor} onChange={e => setValor(e.target.value)} placeholder={tipo === 'processo' ? '0000000-00.0000.8.19.0000' : 'Nome completo ou razão social'} className="border px-3 py-2 md:col-span-2" aria-label="Valor a monitorar" data-testid="mon-valor" />
            <input value={rotulo} onChange={e => setRotulo(e.target.value)} placeholder="Apelido (opcional)" className="border px-3 py-2 md:col-span-2" aria-label="Apelido" />
            <button type="button" onClick={adicionar} disabled={ocupado} data-testid="mon-adicionar" className="min-h-[44px] bg-navy text-white text-sm uppercase tracking-wider disabled:opacity-50">Monitorar</button>
          </div>
          <button type="button" onClick={() => verificar()} disabled={ocupado || !lista.length} className="mt-3 min-h-[44px] px-4 border text-sm inline-flex items-center gap-2 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${ocupado ? 'animate-spin' : ''}`} aria-hidden />Verificar tudo agora</button>
          {msg && <p role="status" className="mt-3 text-sm" data-testid="mon-msg">{msg}</p>}
        </section>
        {lista.map(m => (
          <section key={m.id} className="bg-white shadow-sm p-5" data-testid="mon-item">
            <div className="flex items-start gap-3">
              <Radar className="w-5 h-5 text-dourado mt-1" aria-hidden />
              <div className="flex-1">
                <p className="font-medium">{m.rotulo ? `${m.rotulo} · ` : ''}<span className="font-mono">{m.valor}</span></p>
                <p className="text-xs text-grafite-claro">{m.tipo === 'processo' ? (m.ultimo_estado?.encontrado === false ? 'Não encontrado no DataJud' : [m.ultimo_estado?.classe, m.ultimo_estado?.orgao].filter(Boolean).join(' · ')) : 'Nome monitorado no Diário de Justiça Eletrônico Nacional'} · verificado {dt(m.verificado_em)}</p>
                {m.novidades.length ? (
                  <ul className="mt-2 text-sm space-y-1">{m.novidades.slice(0, 8).map((n, i) => <li key={i}><span className="text-xs bg-dourado/20 px-1">novo</span> {dt(n.data)} · {n.texto}</li>)}</ul>
                ) : <p className="text-sm text-grafite-claro mt-2">Sem novidades desde que começou o monitoramento.</p>}
              </div>
              <button type="button" onClick={() => verificar(m.id)} disabled={ocupado} aria-label="Verificar este agora" className="p-2"><RefreshCw className="w-4 h-4" aria-hidden /></button>
              <button type="button" onClick={() => remover(m.id)} aria-label="Parar de monitorar" className="p-2"><Trash2 className="w-4 h-4" aria-hidden /></button>
            </div>
          </section>
        ))}
      </div>
    </Layout>
  )
}
