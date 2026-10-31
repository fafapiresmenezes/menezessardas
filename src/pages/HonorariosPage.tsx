import { useEffect, useMemo, useState } from 'react'
import { mensagemAmigavel } from '@/lib/erros'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { formatarData, diasAte } from '@/lib/datas'
import { Banknote, Printer, QrCode, TrendingDown, TrendingUp, Receipt, Trash2 } from 'lucide-react'
import CobrancaPix from '@/components/CobrancaPix'

// Honorários e rentabilidade: por caso, o combinado, o recebido, o vencimento e a régua de cobrança;
// a rentabilidade cruza honorários recebidos com as horas lançadas para o mesmo cliente.
type Caso = { id: string; titulo: string; cliente: string | null; area: string | null; situacao: string; honorario_previsto: number; honorario_recebido: number; vencimento_honorario: string | null }
type Hora = { cliente: string; minutos: number; valor_hora: number }
// Passo 29: baixa de pagamento (data, valor, meio); o recebido do caso é a soma das baixas (gatilho no banco).
type Pagamento = { id: number; caso_id: string; data: string; valor: number; meio: string; observacao: string | null }
const MEIOS: Record<string, string> = { pix: 'PIX', transferencia: 'Transferência', boleto: 'Boleto', cartao: 'Cartão', dinheiro: 'Dinheiro', outro: 'Outro' }
const brl = (v: number) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function HonorariosPage() {
  const [casos, setCasos] = useState<Caso[]>([])
  const [horas, setHoras] = useState<Hora[]>([])
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState<Record<string, Partial<Caso>>>({})
  const [pix, setPix] = useState<Caso | null>(null)
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [baixa, setBaixa] = useState<{ caso: Caso; data: string; valor: string; meio: string; observacao: string } | null>(null)
  const [msgBaixa, setMsgBaixa] = useState('')
  const abrirBaixa = (c: Caso) => setBaixa({ caso: c, data: new Date().toISOString().slice(0, 10), valor: String(Math.max(0, Number(c.honorario_previsto) - Number(c.honorario_recebido))), meio: 'pix', observacao: '' })
  const salvarBaixa = async () => {
    if (!baixa) return
    const valor = Number(String(baixa.valor).replace(',', '.'))
    if (!valor || valor <= 0) return setMsgBaixa('Informe um valor maior que zero.')
    const { error } = await supabase.from('pagamentos_honorarios').insert({ caso_id: baixa.caso.id, data: baixa.data, valor, meio: baixa.meio, observacao: baixa.observacao.trim() || null })
    if (error) return setMsgBaixa(mensagemAmigavel(error))
    setMsgBaixa(`Pagamento de ${brl(valor)} registrado em ${formatarData(baixa.data)} (${MEIOS[baixa.meio]}).`); setBaixa(null); carregar()
  }
  const apagarPagamento = async (p: Pagamento) => { await supabase.from('pagamentos_honorarios').delete().eq('id', p.id); carregar() }

  const carregar = async () => {
    const [c, h, pg] = await Promise.all([
      supabase.from('tarefas').select('id,titulo,cliente,area,situacao,honorario_previsto,honorario_recebido,vencimento_honorario').eq('nivel', 'projeto').order('criado_em', { ascending: false }),
      supabase.from('lancamentos_horas').select('cliente,minutos,valor_hora'),
      supabase.from('pagamentos_honorarios').select('id,caso_id,data,valor,meio,observacao').order('data', { ascending: false }),
    ])
    if (c.error) setErro(mensagemAmigavel(c.error))
    setCasos((c.data ?? []) as Caso[]); setHoras((h.data ?? []) as Hora[]); setPagamentos((pg.data ?? []) as Pagamento[])
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
    if (error) return setErro(mensagemAmigavel(error))
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
            <thead><tr className="text-left text-xs uppercase tracking-wider text-grafite border-b"><th className="py-2">Caso</th><th>Combinado</th><th>Recebido</th><th>Vencimento</th><th>Cobrança</th><th>Rentabilidade</th><th><span className="sr-only">Ações</span></th></tr></thead>
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
                    <td className={`${r.cor} whitespace-nowrap`}>{r.rotulo}{r.aberto > 0 && <button onClick={() => carta(c)} className="block text-xs underline text-navy mt-1 inline-flex items-center gap-1"><Printer size={12} aria-hidden="true" /> Carta de cobrança</button>}{r.aberto > 0 && <button onClick={() => setPix(c)} className="block text-xs underline text-navy mt-1 inline-flex items-center gap-1" data-testid="cobrar-pix"><QrCode size={12} aria-hidden="true" /> Cobrar por PIX</button>}<button onClick={() => abrirBaixa(c)} className="block text-xs underline text-navy mt-1 inline-flex items-center gap-1" data-testid="registrar-pagamento"><Receipt size={12} aria-hidden="true" /> Registrar pagamento</button>
                      {pagamentos.filter(p => p.caso_id === c.id).length > 0 && <ul className="mt-1 text-[11px] text-grafite-claro" data-testid="pagamentos-caso">{pagamentos.filter(p => p.caso_id === c.id).slice(0, 5).map(p => <li key={p.id} data-testid="pagamento">{formatarData(p.data)} · {brl(Number(p.valor))} · {MEIOS[p.meio] ?? p.meio} <button onClick={() => apagarPagamento(p)} aria-label="Apagar pagamento" className="align-middle"><Trash2 size={10} aria-hidden="true" /></button></li>)}</ul>}</td>
                    <td className={`whitespace-nowrap ${rent < 0 ? 'text-critico' : 'text-navy'}`}>{rent < 0 ? <TrendingDown size={14} className="inline" aria-hidden="true" /> : <TrendingUp size={14} className="inline" aria-hidden="true" />} {brl(rent)}<span className="block text-xs text-grafite-claro">custo {brl(custo)}</span></td>
                    <td>{editando[c.id] && <button onClick={() => salvar(c)} className="min-h-[36px] px-3 bg-navy text-white text-xs uppercase">Salvar</button>}</td>
                  </tr>
                )
              })}
              {!casos.length && <tr><td colSpan={7} className="py-6 text-grafite-claro">Nenhum caso ainda. Crie um em Casos e projetos.</td></tr>}
            </tbody>
          </table>
        </section>
        {msgBaixa && <p role="status" className="text-sm text-navy" data-testid="msg-baixa">{msgBaixa}</p>}
        {baixa && (
          <section className="bg-white shadow-sm border-l-4 border-dourado p-5" aria-label="Registrar pagamento" data-testid="form-baixa">
            <h2 className="text-lg mb-1">Registrar pagamento · {baixa.caso.titulo}</h2>
            <p className="text-xs text-grafite-claro mb-3">Em aberto: {brl(Math.max(0, Number(baixa.caso.honorario_previsto) - Number(baixa.caso.honorario_recebido)))}. O recebido do caso e a régua de cobrança são atualizados na hora.</p>
            <div className="grid gap-3 sm:grid-cols-5">
              <label className="text-xs">Data<input type="date" value={baixa.data} onChange={e => setBaixa({ ...baixa, data: e.target.value })} className="block border px-2 py-2 w-full min-h-[44px]" data-testid="baixa-data" /></label>
              <label className="text-xs">Valor (R$)<input type="number" min="0.01" step="0.01" value={baixa.valor} onChange={e => setBaixa({ ...baixa, valor: e.target.value })} className="block border px-2 py-2 w-full min-h-[44px]" data-testid="baixa-valor" /></label>
              <label className="text-xs">Meio<select value={baixa.meio} onChange={e => setBaixa({ ...baixa, meio: e.target.value })} className="block border px-2 py-2 w-full min-h-[44px]" data-testid="baixa-meio">{Object.entries(MEIOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              <label className="text-xs sm:col-span-2">Observação<input value={baixa.observacao} onChange={e => setBaixa({ ...baixa, observacao: e.target.value })} placeholder="Ex.: comprovante PIX 1234" className="block border px-2 py-2 w-full min-h-[44px]" /></label>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={salvarBaixa} className="min-h-[44px] px-4 bg-navy text-white text-sm uppercase tracking-wider" data-testid="baixa-salvar">Salvar pagamento</button>
              <button onClick={() => setBaixa(null)} className="min-h-[44px] px-4 border text-sm">Cancelar</button>
            </div>
          </section>
        )}
        {pix && <CobrancaPix valor={regua(pix).aberto} caso={pix.titulo} cliente={pix.cliente} fechar={() => setPix(null)} />}
      </div>
    </Layout>
  )
}
