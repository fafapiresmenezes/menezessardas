import { useEffect, useMemo, useState } from 'react'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { formatarData, diasAte } from '@/lib/datas'
import { Banknote, Printer, TrendingDown, TrendingUp } from 'lucide-react'

// Honorários e rentabilidade: por caso, o combinado, o recebido, o vencimento e a régua de cobrança;
// a rentabilidade cruza honorários recebidos com as horas lançadas para o mesmo cliente.
type Caso = { id: string; titulo: string; cliente: string | null; area: string | null; situacao: string; honorario_previsto: number; honorario_recebido: number; vencimento_honorario: string | null }
type Hora = { cliente: string; minutos: number; valor_hora: number }
const brl = (v: number) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function HonorariosPage() {
  const [casos, setCasos] = useState<Caso[]>([])
  const [horas, setHoras] = useState<Hora[]>([])
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState<Record<string, Partial<Caso>>>({})

  const carregar = async () => {
    const [c, h] = await Promise.all([
      supabase.from('tarefas').select('id,titulo,cliente,area,situacao,honorario_previsto,honorario_recebido,vencimento_honorario').eq('nivel', 'projeto').order('criado_em', { ascending: false }),
      supabase.from('lancamentos_horas').select('cliente,minutos,valor_hora'),
    ])
    if (c.error) setErro(c.error.message)
    setCasos((c.data ?? []) as Caso[]); setHoras((h.data ?? []) as Hora[])
  }
  useEffect(() => { carregar() }, [])

  const custoPorCliente = useMemo(() => {
    const m: Record<string, number> = {}
    for (const h of horas) m[h.cliente] = (m[h.cliente] ?? 0) + (h.minutos / 60) * Number(h.valor_hora)
    return m
  }, [horas])

  const salvar = async (c: Caso) => {
    const e = editando[c.id]; if (!e) return
    const { error } = await supabase.from('tarefas').update({ honorario_previsto: Number(e.honorario_previsto ?? c.honorario_previsto) || 0, honorario_recebido: Number(e.honorario_recebido ?? c.honorario_recebido) || 0, vencimento_honorario: e.vencimento_honorario === '' ? null : (e.vencimento_honorario ?? c.vencimento_honorario) }).eq('id', c.id)
    if (error) return setErro(error.message)
    setEditando(x => { const y = { ...x }; delete y[c.id]; return y }); carregar()
  }
  // Régua de cobrança: situação do honorário pelo vencimento e saldo em aberto.
  const regua = (c: Caso) => {
    const aberto = Number(c.honorario_previsto) - Number(c.honorario_recebido)
    if (aberto <= 0) return { rotulo: 'Quitado', cor: 'text-navy', aberto }
    const d = c.vencimento_honorario ? diasAte(c.vencimento_honorario) : null
    if (d === null) return { rotulo: 'Sem vencimento', cor: 'text-grafite', aberto }
    if (d < 0) return { rotulo: `Atrasado ${-d} dias`, cor: 'text-critico', aberto }
    if (d <= 7) return { rotulo: `Vence em ${d} dias`, cor: 'text-dourado', aberto }
    return { rotulo: `Em dia (vence ${formatarData(c.vencimento_honorario!)})`, cor: 'text-navy', aberto }
  }
  const carta = (c: Caso) => {
    const r = regua(c)
    const w = window.open('', '_blank'); if (!w) return
    w.document.write(`<html><head><title>Cobrança de honorários</title><style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;line-height:1.6}</style></head><body>
<p>GMenezes Advogados Associados</p><p>Rio de Janeiro, ${new Date().toLocaleDateString('pt-BR')}</p>
<p>Prezado(a) ${c.cliente ?? 'cliente'},</p>
<p>Em relação ao caso <strong>${c.titulo}</strong>, informamos que há honorários em aberto no valor de <strong>${brl(r.aberto)}</strong>${c.vencimento_honorario ? `, com vencimento em ${formatarData(c.vencimento_honorario)}` : ''}.</p>
<p>Pedimos a gentileza de regularizar o pagamento ou entrar em contato para combinar a melhor forma. Ficamos à disposição.</p>
<p>Atenciosamente,<br/>GMenezes Advogados Associados</p></body></html>`)
    w.document.close(); w.print()
  }

  const totais = casos.reduce((s, c) => ({ previsto: s.previsto + Number(c.honorario_previsto), recebido: s.recebido + Number(c.honorario_recebido) }), { previsto: 0, recebido: 0 })
  const custoTotal = Object.values(custoPorCliente).reduce((a, b) => a + b, 0)

  return (
    <Layout title="Honorários e rentabilidade">
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-4">
          {[['Combinado', brl(totais.previsto)], ['Recebido', brl(totais.recebido)], ['Em aberto', brl(totais.previsto - totais.recebido)], ['Custo das horas', brl(custoTotal)]].map(([k, v]) => (
            <div key={k} className="bg-white shadow-sm border-t-2 border-dourado p-4"><p className="text-xs uppercase tracking-wider text-grafite">{k}</p><p className="text-2xl font-serif text-navy">{v}</p></div>
          ))}
        </section>
        {erro && <p role="alert" className="text-sm text-critico">{erro}</p>}
        <section className="bg-white shadow-sm p-5 overflow-x-auto">
          <h2 className="text-lg mb-3 flex items-center gap-2"><Banknote size={18} className="text-dourado" aria-hidden="true" /> Por caso</h2>
          <p className="text-xs text-grafite-claro mb-3">Rentabilidade = honorários recebidos menos o custo das horas lançadas para o mesmo cliente (tela Horas). Edite os valores e toque em Salvar.</p>
          <table className="w-full text-sm" data-testid="tabela-honorarios">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-grafite border-b"><th className="py-2">Caso</th><th>Combinado</th><th>Recebido</th><th>Vencimento</th><th>Cobrança</th><th>Rentabilidade</th><th></th></tr></thead>
            <tbody>
              {casos.map(c => {
                const e = editando[c.id] ?? {}
                const r = regua(c)
                const custo = c.cliente ? custoPorCliente[c.cliente] ?? 0 : 0
                const rent = Number(c.honorario_recebido) - custo
                return (
                  <tr key={c.id} className="border-b border-navy/5 align-top">
                    <td className="py-2 pr-2"><span className="text-navy font-medium">{c.titulo}</span><span className="block text-xs text-grafite-claro">{c.cliente ?? 'sem cliente'}{c.area && ` · ${c.area}`}</span></td>
                    <td><input aria-label={`Combinado ${c.titulo}`} type="number" className="border px-2 py-1 w-28" value={e.honorario_previsto ?? c.honorario_previsto} onChange={ev => setEditando({ ...editando, [c.id]: { ...e, honorario_previsto: Number(ev.target.value) } })} /></td>
                    <td><input aria-label={`Recebido ${c.titulo}`} type="number" className="border px-2 py-1 w-28" value={e.honorario_recebido ?? c.honorario_recebido} onChange={ev => setEditando({ ...editando, [c.id]: { ...e, honorario_recebido: Number(ev.target.value) } })} /></td>
                    <td><input aria-label={`Vencimento ${c.titulo}`} type="date" className="border px-2 py-1" value={e.vencimento_honorario ?? c.vencimento_honorario ?? ''} onChange={ev => setEditando({ ...editando, [c.id]: { ...e, vencimento_honorario: ev.target.value } })} /></td>
                    <td className={`${r.cor} whitespace-nowrap`}>{r.rotulo}{r.aberto > 0 && <button onClick={() => carta(c)} className="block text-xs underline text-navy mt-1 inline-flex items-center gap-1"><Printer size={12} aria-hidden="true" /> Carta de cobrança</button>}</td>
                    <td className={`whitespace-nowrap ${rent < 0 ? 'text-critico' : 'text-navy'}`}>{rent < 0 ? <TrendingDown size={14} className="inline" aria-hidden="true" /> : <TrendingUp size={14} className="inline" aria-hidden="true" />} {brl(rent)}<span className="block text-xs text-grafite-claro">custo {brl(custo)}</span></td>
                    <td>{editando[c.id] && <button onClick={() => salvar(c)} className="min-h-[36px] px-3 bg-navy text-white text-xs uppercase">Salvar</button>}</td>
                  </tr>
                )
              })}
              {!casos.length && <tr><td colSpan={7} className="py-6 text-grafite-claro">Nenhum caso ainda. Crie um em Casos e projetos.</td></tr>}
            </tbody>
          </table>
        </section>
      </div>
    </Layout>
  )
}
