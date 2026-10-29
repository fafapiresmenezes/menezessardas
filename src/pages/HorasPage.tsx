import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { Play, Square, Download, Printer, Trash2 } from 'lucide-react'

// Controle de horas e honorários: cronômetro ou lançamento manual, totais por cliente no mês,
// exportação CSV para faturar e relatório imprimível para o cliente.
type Lanc = { id: string; data: string; cliente: string; descricao: string; minutos: number; valor_hora: number; faturavel: boolean }
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const hm = (m: number) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`
const mesAtual = () => new Date().toISOString().slice(0, 7)

export default function HorasPage() {
  const [mes, setMes] = useState(mesAtual())
  const [lista, setLista] = useState<Lanc[]>([])
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({ data: new Date().toISOString().slice(0, 10), cliente: '', descricao: '', horas: '', valor_hora: '', faturavel: true })
  const [inicio, setInicio] = useState<number | null>(() => { try { const v = localStorage.getItem('lsm-cronometro'); return v ? Number(v) : null } catch { return null } })
  const [agora, setAgora] = useState(Date.now())

  useEffect(() => { if (!inicio) return; const t = setInterval(() => setAgora(Date.now()), 1000); return () => clearInterval(t) }, [inicio])
  const carregar = async () => {
    const fim = new Date(`${mes}-01T12:00`); fim.setMonth(fim.getMonth() + 1)
    const { data, error } = await supabase.from('lancamentos_horas').select('id,data,cliente,descricao,minutos,valor_hora,faturavel')
      .gte('data', `${mes}-01`).lt('data', fim.toISOString().slice(0, 10)).order('data', { ascending: false })
    if (error) setErro('Não foi possível carregar os lançamentos.'); else setLista((data ?? []).map(l => ({ ...l, valor_hora: Number(l.valor_hora) })))
  }
  useEffect(() => { carregar() }, [mes]) // eslint-disable-line react-hooks/exhaustive-deps

  const cronometro = () => {
    if (!inicio) { const t = Date.now(); setInicio(t); try { localStorage.setItem('lsm-cronometro', String(t)) } catch { /* */ } return }
    const min = Math.max(1, Math.round((Date.now() - inicio) / 60000))
    setForm(f => ({ ...f, horas: (min / 60).toFixed(2) })); setInicio(null)
    try { localStorage.removeItem('lsm-cronometro') } catch { /* */ }
  }
  const salvar = async () => {
    setErro('')
    const minutos = Math.round(Number(form.horas.replace(',', '.')) * 60)
    if (!form.cliente.trim() || !form.descricao.trim() || !(minutos > 0)) return setErro('Preencha cliente, o que foi feito e as horas.')
    const { error } = await supabase.from('lancamentos_horas').insert({ data: form.data, cliente: form.cliente.trim(), descricao: form.descricao.trim(), minutos, valor_hora: Number(form.valor_hora.replace(',', '.')) || 0, faturavel: form.faturavel })
    if (error) return setErro('Não foi possível salvar (leitores não lançam horas).')
    setForm(f => ({ ...f, descricao: '', horas: '' })); carregar()
  }
  const apagar = async (id: string) => { await supabase.from('lancamentos_horas').delete().eq('id', id); carregar() }

  const porCliente = Object.values(lista.reduce((acc, l) => {
    const c = (acc[l.cliente] ??= { cliente: l.cliente, min: 0, valor: 0, naoFat: 0 })
    if (l.faturavel) { c.min += l.minutos; c.valor += (l.minutos / 60) * l.valor_hora } else c.naoFat += l.minutos
    return acc
  }, {} as Record<string, { cliente: string; min: number; valor: number; naoFat: number }>)).sort((a, b) => b.valor - a.valor)
  const totalMin = lista.reduce((s, l) => s + l.minutos, 0)
  const totalFat = lista.filter(l => l.faturavel).reduce((s, l) => s + l.minutos, 0)
  const totalValor = porCliente.reduce((s, c) => s + c.valor, 0)
  const csv = () => {
    const linhas = [['data', 'cliente', 'descricao', 'horas', 'valor_hora', 'valor', 'faturavel'], ...lista.map(l => [l.data, l.cliente, l.descricao.replace(/"/g, "'"), (l.minutos / 60).toFixed(2), l.valor_hora.toFixed(2), ((l.minutos / 60) * l.valor_hora).toFixed(2), l.faturavel ? 'sim' : 'nao'])]
    const blob = new Blob(['﻿' + linhas.map(r => r.map(c => `"${c}"`).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `horas-${mes}.csv`; a.click()
  }
  const campo = 'border px-3 py-2 w-full'
  return (
    <Layout title="Horas e honorários">
      <div className="space-y-5">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-5 print:hidden">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <button type="button" onClick={cronometro} data-testid="cronometro" className={`min-h-[44px] px-5 text-sm uppercase tracking-wider inline-flex items-center gap-2 ${inicio ? 'bg-critico text-white' : 'bg-navy text-white'}`}>
              {inicio ? <><Square className="w-4 h-4" aria-hidden />Parar ({hm(Math.floor((agora - inicio) / 60000))})</> : <><Play className="w-4 h-4" aria-hidden />Iniciar cronômetro</>}
            </button>
            <span className="text-sm text-grafite-claro">Ou digite as horas abaixo.</span>
          </div>
          <div className="grid gap-3 md:grid-cols-6 text-sm">
            <label className="md:col-span-1">Data<input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} className={campo} /></label>
            <label className="md:col-span-2">Cliente ou caso<input value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })} className={campo} data-testid="h-cliente" list="clientes" /></label>
            <datalist id="clientes">{[...new Set(lista.map(l => l.cliente))].map(c => <option key={c} value={c} />)}</datalist>
            <label>Horas<input value={form.horas} onChange={e => setForm({ ...form, horas: e.target.value })} placeholder="1,5" className={campo} data-testid="h-horas" /></label>
            <label>Valor/hora (R$)<input value={form.valor_hora} onChange={e => setForm({ ...form, valor_hora: e.target.value })} placeholder="450" className={campo} data-testid="h-valor" /></label>
            <label className="flex items-center gap-2 min-h-[44px] mt-5"><input type="checkbox" checked={form.faturavel} onChange={e => setForm({ ...form, faturavel: e.target.checked })} />Faturável</label>
            <label className="md:col-span-5">O que foi feito<input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className={campo} data-testid="h-desc" /></label>
            <button type="button" onClick={salvar} data-testid="h-salvar" className="min-h-[44px] bg-navy text-white text-sm uppercase tracking-wider mt-5">Lançar</button>
          </div>
          {erro && <p role="alert" className="mt-3 p-3 text-sm border-l-2 bg-criticoFundo border-critico text-critico">{erro}</p>}
        </section>

        <section className="bg-white shadow-sm p-5">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <label className="text-sm print:hidden">Mês <input type="month" value={mes} onChange={e => setMes(e.target.value)} className="border px-3 py-2 ml-2" /></label>
            <div className="flex gap-2 print:hidden">
              <button type="button" onClick={csv} className="min-h-[44px] px-4 border text-sm inline-flex items-center gap-2"><Download className="w-4 h-4" aria-hidden />Planilha (CSV)</button>
              <button type="button" onClick={() => window.print()} className="min-h-[44px] px-4 border text-sm inline-flex items-center gap-2"><Printer className="w-4 h-4" aria-hidden />Relatório para o cliente</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 my-4 text-center">
            <div><p className="text-2xl font-serif" data-testid="h-total">{hm(totalMin)}</p><p className="text-xs text-grafite-claro">horas no mês</p></div>
            <div><p className="text-2xl font-serif">{totalMin ? Math.round((totalFat / totalMin) * 100) : 0}%</p><p className="text-xs text-grafite-claro">faturáveis (meta comum: 70%+)</p></div>
            <div><p className="text-2xl font-serif" data-testid="h-valor-total">{brl(totalValor)}</p><p className="text-xs text-grafite-claro">a faturar</p></div>
          </div>
          {!!porCliente.length && (
            <table className="w-full text-sm mb-4">
              <thead><tr className="text-left border-b"><th className="py-1">Cliente</th><th>Horas faturáveis</th><th>Valor</th><th>Não faturáveis</th></tr></thead>
              <tbody>{porCliente.map(c => <tr key={c.cliente} className="border-b"><td className="py-1">{c.cliente}</td><td>{hm(c.min)}</td><td>{brl(c.valor)}</td><td>{hm(c.naoFat)}</td></tr>)}</tbody>
            </table>
          )}
          <ul className="divide-y text-sm">
            {lista.map(l => (
              <li key={l.id} className="py-2 flex items-start gap-3">
                <span className="w-20 shrink-0">{new Date(`${l.data}T12:00`).toLocaleDateString('pt-BR')}</span>
                <span className="flex-1"><strong>{l.cliente}</strong> · {l.descricao}{!l.faturavel && <span className="text-grafite-claro"> (não faturável)</span>}</span>
                <span className="w-14 text-right">{hm(l.minutos)}</span>
                <button type="button" onClick={() => apagar(l.id)} aria-label="Apagar lançamento" className="print:hidden p-2"><Trash2 className="w-4 h-4" aria-hidden /></button>
              </li>
            ))}
            {!lista.length && <li className="py-3 text-grafite-claro">Nenhum lançamento neste mês.</li>}
          </ul>
        </section>
      </div>
    </Layout>
  )
}
