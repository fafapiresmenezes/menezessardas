import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { mensagemAmigavel } from '@/lib/erros'
import { formatarData, hojeLocal } from '@/lib/datas'
import { tabelaAusente } from '@/lib/escritorio/tabelaAusente'
import { CATEGORIAS_DESPESA, CATEGORIAS_RECEITA, fluxoMensal, recebiveis, aging, contasAPagar, previsao90, resultadoPorArea, despesasPorCategoria, pontoEquilibrio, reembolsosPendentes, repetirMensal, mesesAte, somarMeses, type Lancamento, type PagamentoHonorario, type ParcelaHonorario, type CasoFin } from '@/lib/escritorio/financeiro'
import { Wallet, Plus, Download, Check } from 'lucide-react'
import { meuAlcance, rotuloCargo } from '@/lib/hierarquia'

// Financeiro do escritório: honorários recebidos e a receber (já existentes) somados às outras receitas e às despesas,
// com fluxo de caixa, contas a receber por atraso, contas a pagar, previsão de 90 dias e resultado por área.
const brl = (v: number) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`)
const nomeMes = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
const hojeIso = () => hojeLocal()
const VAZIO = { tipo: 'despesa' as 'receita' | 'despesa', categoria: CATEGORIAS_DESPESA[0], descricao: '', valor: '', vencimento: hojeIso(), pago: false, caso_id: '', cliente: '', reembolsavel: false, repetir: '1' }

export default function FinanceiroPage() {
  const [lancTudo, setLanc] = useState<Lancamento[]>([])
  const [pgTudo, setPg] = useState<PagamentoHonorario[]>([])
  const [parcelasTudo, setParcelas] = useState<ParcelaHonorario[]>([])
  const [casosTudo, setCasos] = useState<(CasoFin & { responsavel_id?: string | null })[]>([])
  const [alcance, setAlcance] = useState<Awaited<ReturnType<typeof meuAlcance>> | null>(null)
  const [ausente, setAusente] = useState(false)
  const [novo, setNovo] = useState(VAZIO)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [saldoInicial, setSaldoInicial] = useState('')

  const carregar = async () => {
    const [l, p, pc, c] = await Promise.all([
      supabase.from('lancamentos_financeiros').select('id,tipo,categoria,descricao,valor,vencimento,pago_em,caso_id,cliente,reembolsavel').order('vencimento'),
      supabase.from('pagamentos_honorarios').select('id,caso_id,data,valor'),
      supabase.from('parcelas_honorarios').select('id,caso_id,numero,vencimento,valor,pago_em'),
      supabase.from('tarefas').select('id,titulo,cliente,area,honorario_previsto,honorario_recebido,vencimento_honorario,responsavel_id').eq('nivel', 'projeto'),
    ])
    if (tabelaAusente(l.error)) setAusente(true); else if (l.error) setErro(mensagemAmigavel(l.error))
    setLanc((l.data ?? []) as Lancamento[]); setPg((p.data ?? []) as PagamentoHonorario[]); setParcelas((pc.data ?? []) as ParcelaHonorario[]); setCasos((c.data ?? []) as (CasoFin & { responsavel_id?: string | null })[])
  }
  useEffect(() => { carregar(); meuAlcance().then(setAlcance).catch(() => setAlcance({ id: '', cargo: null, admin: false, veTudo: true })) }, [])
  // Hierarquia: pleno e júnior veem só os números dos próprios casos; despesas gerais do escritório ficam com sócios e gestor.
  const restrito = !!alcance && !alcance.veTudo
  const casos = useMemo(() => (restrito ? casosTudo.filter(c => !c.responsavel_id || c.responsavel_id === alcance!.id) : casosTudo), [casosTudo, restrito, alcance])
  const idsMeus = useMemo(() => new Set(casos.map(c => c.id)), [casos])
  const lanc = useMemo(() => (restrito ? lancTudo.filter(l => l.caso_id && idsMeus.has(l.caso_id)) : lancTudo), [lancTudo, restrito, idsMeus])
  const pg = useMemo(() => (restrito ? pgTudo.filter(x => idsMeus.has(x.caso_id)) : pgTudo), [pgTudo, restrito, idsMeus])
  const parcelas = useMemo(() => (restrito ? parcelasTudo.filter(x => idsMeus.has(x.caso_id)) : parcelasTudo), [parcelasTudo, restrito, idsMeus])

  const hoje = hojeIso()
  const meses = useMemo(() => mesesAte(somarMeses(hoje, -5), 9), [hoje])
  const fluxo = useMemo(() => fluxoMensal(lanc, pg, parcelas, meses), [lanc, pg, parcelas, meses])
  const rec = useMemo(() => recebiveis(lanc, parcelas, casos, hoje), [lanc, parcelas, casos, hoje])
  const ag = useMemo(() => aging(rec, hoje), [rec, hoje])
  const pagar = useMemo(() => contasAPagar(lanc, hoje), [lanc, hoje])
  const prev = useMemo(() => previsao90(lanc, rec, hoje, Number(saldoInicial.replace(/\./g, '').replace(',', '.')) || 0), [lanc, rec, hoje, saldoInicial])
  const inicioAno = `${hoje.slice(0, 4)}-01-01`
  const porArea = useMemo(() => resultadoPorArea(lanc, pg, casos, inicioAno), [lanc, pg, casos, inicioAno])
  const porCategoria = useMemo(() => despesasPorCategoria(lanc, inicioAno), [lanc, inicioAno])
  const equilibrio = useMemo(() => pontoEquilibrio(lanc, pg, hoje), [lanc, pg, hoje])
  const reembolsos = useMemo(() => reembolsosPendentes(lanc), [lanc])
  const mesAtual = fluxo.find(f => f.mes === hoje.slice(0, 7))

  const salvar = async () => {
    setErro(''); setMsg('')
    const valor = Number(String(novo.valor).replace(/\./g, '').replace(',', '.'))
    if (novo.descricao.trim().length < 2) return setErro('Escreva a descrição.')
    if (!(valor > 0)) return setErro('Informe um valor maior que zero.')
    if (!novo.vencimento) return setErro('Informe a data de vencimento.')
    const caso = casos.find(c => c.id === novo.caso_id)
    const base = { tipo: novo.tipo, categoria: novo.categoria, descricao: novo.descricao.trim(), valor, vencimento: novo.vencimento, pago_em: novo.pago ? novo.vencimento : null, caso_id: novo.caso_id || null, cliente: novo.cliente.trim() || caso?.cliente || null, reembolsavel: novo.tipo === 'despesa' && novo.reembolsavel }
    const linhas = repetirMensal(base, Number(novo.repetir) || 1).map((x, i) => ({ ...x, pago_em: i === 0 ? x.pago_em : null }))
    const { error } = await supabase.from('lancamentos_financeiros').insert(linhas)
    if (tabelaAusente(error)) return setAusente(true)
    if (error) return setErro(mensagemAmigavel(error))
    setMsg(`${linhas.length > 1 ? `${linhas.length} lançamentos` : 'Lançamento'} de ${brl(valor)} gravado${linhas.length > 1 ? 's' : ''}.`); setNovo({ ...VAZIO, tipo: novo.tipo, categoria: novo.categoria }); carregar()
  }
  const marcarPago = async (l: Lancamento) => {
    const { error } = await supabase.from('lancamentos_financeiros').update({ pago_em: l.pago_em ? null : hoje }).eq('id', l.id)
    if (error) return setErro(mensagemAmigavel(error))
    carregar()
  }
  const apagar = async (l: Lancamento) => { if (!window.confirm(`Apagar "${l.descricao}"?`)) return; await supabase.from('lancamentos_financeiros').delete().eq('id', l.id); carregar() }
  const baixarCsv = () => {
    const linhas = ['data;tipo;categoria;descrição;cliente;valor;situação',
      ...pg.map(p => `${p.data};receita;Honorários;${(casos.find(c => c.id === p.caso_id)?.titulo ?? '').replace(/;/g, ',')};${casos.find(c => c.id === p.caso_id)?.cliente ?? ''};${String(p.valor).replace('.', ',')};pago`),
      ...lanc.map(l => `${l.pago_em ?? l.vencimento};${l.tipo};${l.categoria};${l.descricao.replace(/;/g, ',')};${l.cliente ?? ''};${String(l.valor).replace('.', ',')};${l.pago_em ? 'pago' : 'em aberto'}`)]
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + linhas.join('\n')], { type: 'text/csv;charset=utf-8' })); a.download = 'financeiro.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
  const categorias = novo.tipo === 'despesa' ? CATEGORIAS_DESPESA : CATEGORIAS_RECEITA
  const cartoes: [string, string, boolean?][] = [
    ['Recebido no mês', brl(mesAtual?.recebido ?? 0)], ['Pago no mês', brl(mesAtual?.pago ?? 0)], ['Resultado do mês', brl(mesAtual?.resultado ?? 0), (mesAtual?.resultado ?? 0) < 0],
    ['A receber', brl(ag.total)], ['Vencido a receber', `${brl(ag.vencido)} (${pct(ag.inadimplencia)})`, ag.vencido > 0], ['A pagar em 30 dias', brl(pagar.total30 + pagar.totalVencido), pagar.totalVencido > 0],
  ]

  return (
    <Layout title="Financeiro">
      <div className="space-y-5">
        {restrito && alcance && (
          <p className="bg-white border-l-2 border-dourado p-3 text-sm" data-testid="financeiro-alcance" title="A hierarquia é definida pela administração na tela Equipe.">
            Você está vendo <strong>os números dos seus casos</strong> ({rotuloCargo[alcance.cargo ?? 'nenhum']}). O financeiro completo do escritório fica com sócios, gestor e administração.
          </p>
        )}
        {ausente && <p role="status" className="bg-white shadow-sm border-l-4 border-dourado p-4 text-sm" data-testid="financeiro-ausente">Os honorários e parcelas já aparecem aqui. Para lançar despesas e outras receitas, um administrador aplica a atualização <code>108_funil_financeiro.sql</code> no banco.</p>}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-6" data-testid="financeiro-resumo">
          {cartoes.map(([r, v, alerta]) => <div key={r} className={`bg-white shadow-sm p-4 border-t-2 ${alerta ? 'border-critico' : 'border-dourado'}`}><span className="block text-xs uppercase tracking-wider text-grafite-claro">{r}</span><span className={`block text-lg font-serif ${alerta ? 'text-critico' : 'text-navy'}`}>{v}</span></div>)}
        </div>
        <p className="text-sm bg-white shadow-sm p-4" data-testid="ponto-equilibrio"><Wallet size={16} className="inline text-dourado mr-1" aria-hidden />
          {equilibrio.despesaMedia > 0 ? (equilibrio.atingido ? <>Ponto de equilíbrio do mês atingido: já entrou {brl(equilibrio.recebidoMes)} e a despesa média é {brl(equilibrio.despesaMedia)}.</> : <>Para cobrir a despesa média dos últimos 3 meses ({brl(equilibrio.despesaMedia)}), faltam <strong>{brl(equilibrio.falta)}</strong> de recebimentos este mês.</>) : 'Lance as despesas para ver o ponto de equilíbrio (quanto o escritório precisa receber por mês para pagar as contas).'}
        </p>

        {!ausente && (
          <section className="bg-white shadow-sm p-5" aria-labelledby="t-lanc">
            <h2 id="t-lanc" className="text-lg mb-3 flex items-center gap-2"><Plus size={18} className="text-dourado" aria-hidden /> Novo lançamento</h2>
            <div className="grid gap-3 sm:grid-cols-6 text-sm">
              <div role="radiogroup" aria-label="Tipo" className="flex gap-2 sm:col-span-2">
                {(['despesa', 'receita'] as const).map(t => <button key={t} type="button" role="radio" aria-checked={novo.tipo === t} onClick={() => setNovo({ ...novo, tipo: t, categoria: (t === 'despesa' ? CATEGORIAS_DESPESA : CATEGORIAS_RECEITA)[0] })} data-testid={`tipo-${t}`} title={t === 'despesa' ? 'Define o novo lançamento como despesa (dinheiro que sai)' : 'Define o novo lançamento como receita (dinheiro que entra)'} className={`min-h-[44px] px-4 border flex-1 ${novo.tipo === t ? 'bg-navy text-white' : ''}`}>{t === 'despesa' ? 'Despesa' : 'Receita'}</button>)}
              </div>
              <select aria-label="Categoria" title="Define a categoria do lançamento, usada no relatório de para onde vai o dinheiro" value={novo.categoria} onChange={e => setNovo({ ...novo, categoria: e.target.value })} className="border px-2 py-2 sm:col-span-2" data-testid="lanc-categoria">{categorias.map(c => <option key={c}>{c}</option>)}</select>
              <input aria-label="Descrição" placeholder="Descrição" value={novo.descricao} onChange={e => setNovo({ ...novo, descricao: e.target.value })} className="border px-3 py-2 sm:col-span-2" data-testid="lanc-descricao" />
              <input aria-label="Valor (R$)" placeholder="Valor (R$)" inputMode="decimal" value={novo.valor} onChange={e => setNovo({ ...novo, valor: e.target.value })} className="border px-3 py-2" data-testid="lanc-valor" />
              <label className="text-xs text-grafite">Vencimento<input type="date" value={novo.vencimento} onChange={e => setNovo({ ...novo, vencimento: e.target.value })} className="border px-2 py-2 w-full text-sm" data-testid="lanc-vencimento" /></label>
              <select aria-label="Caso" title="Liga o lançamento a um caso, para aparecer no resultado por área" value={novo.caso_id} onChange={e => setNovo({ ...novo, caso_id: e.target.value })} className="border px-2 py-2 sm:col-span-2"><option value="">Sem caso ligado</option>{casos.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}</select>
              <input aria-label="Cliente" placeholder="Cliente (opcional)" value={novo.cliente} onChange={e => setNovo({ ...novo, cliente: e.target.value })} className="border px-3 py-2 sm:col-span-2" />
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={novo.pago} onChange={e => setNovo({ ...novo, pago: e.target.checked })} data-testid="lanc-pago" /> Já {novo.tipo === 'despesa' ? 'pago' : 'recebido'}</label>
              {novo.tipo === 'despesa' && <label className="inline-flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={novo.reembolsavel} onChange={e => setNovo({ ...novo, reembolsavel: e.target.checked })} data-testid="lanc-reembolsavel" /> Cliente reembolsa (custas, diligências)</label>}
              <label className="text-xs text-grafite">Repetir por (meses)<input type="number" min={1} max={60} value={novo.repetir} onChange={e => setNovo({ ...novo, repetir: e.target.value })} className="border px-2 py-2 w-full text-sm" data-testid="lanc-repetir" /></label>
              <button type="button" onClick={salvar} data-testid="lanc-salvar" title="Grava o lançamento no financeiro; com repetição, cria uma cópia para cada mês" className="min-h-[44px] bg-navy text-white px-5 uppercase tracking-wider sm:col-span-2">Lançar</button>
            </div>
            {(erro || msg) && <p role={erro ? 'alert' : 'status'} className={`text-sm mt-3 ${erro ? 'text-critico' : ''}`} data-testid="financeiro-msg">{erro || msg}</p>}
          </section>
        )}

        <section className="bg-white shadow-sm p-5" aria-labelledby="t-fluxo">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="t-fluxo" className="font-serif text-lg">Fluxo de caixa</h2>
            <button type="button" onClick={baixarCsv} data-testid="financeiro-csv" title="Baixa todos os lançamentos e honorários em arquivo CSV para abrir em planilha" className="min-h-[44px] px-4 border border-navy/20 text-navy text-sm inline-flex items-center gap-2"><Download size={16} aria-hidden /> Baixar CSV</button></div>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm min-w-[640px]" data-testid="fluxo-caixa">
              <thead><tr className="text-left text-xs uppercase tracking-wider text-grafite-claro"><th className="py-1">Mês</th><th>Recebido</th><th>Pago</th><th>Resultado</th><th>Acumulado</th><th>A receber</th><th>A pagar</th></tr></thead>
              <tbody className="divide-y divide-navy/10">{fluxo.map(f => <tr key={f.mes} className={f.mes === hoje.slice(0, 7) ? 'bg-pergaminho font-medium' : ''}><td className="py-1">{nomeMes(f.mes)}</td><td>{brl(f.recebido)}</td><td>{brl(f.pago)}</td><td className={f.resultado < 0 ? 'text-critico' : ''}>{brl(f.resultado)}</td><td>{brl(f.acumulado)}</td><td>{brl(f.aReceber)}</td><td>{brl(f.aPagar)}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          <section className="bg-white shadow-sm p-5" aria-labelledby="t-receber" data-testid="contas-receber">
            <h2 id="t-receber" className="font-serif text-lg">Contas a receber</h2>
            <ul className="text-sm mt-2 space-y-1">{ag.faixas.map(f => <li key={f.faixa} className="flex justify-between"><span>{f.faixa} ({f.quantidade})</span><strong className={f.faixa !== 'A vencer' && f.valor ? 'text-critico' : ''}>{brl(f.valor)}</strong></li>)}</ul>
            {rec.filter(r => r.atraso > 0).length > 0 && <><h3 className="text-xs uppercase tracking-wider text-grafite-claro mt-4">Mais atrasados</h3>
              <ul className="text-sm mt-1 space-y-1">{rec.filter(r => r.atraso > 0).slice(0, 8).map((r, i) => <li key={i}>{r.descricao}{r.cliente ? ` · ${r.cliente}` : ''} · <strong>{brl(r.valor)}</strong> · <span className="text-critico">{r.atraso} dia(s)</span></li>)}</ul>
              <Link to="/honorarios" title="Abre a página de Honorários para cobrar os valores atrasados com PIX e carta de cobrança" className="text-sm underline text-navy mt-2 inline-block">Cobrar em Honorários (PIX e carta de cobrança)</Link></>}
          </section>
          <section className="bg-white shadow-sm p-5" aria-labelledby="t-pagar" data-testid="contas-pagar">
            <h2 id="t-pagar" className="font-serif text-lg">Contas a pagar</h2>
            <p className="text-sm mt-1">Vencidas: <strong className={pagar.totalVencido ? 'text-critico' : ''}>{brl(pagar.totalVencido)}</strong> · Próximos 7 dias: <strong>{brl(pagar.totalSemana)}</strong> · 30 dias: <strong>{brl(pagar.total30)}</strong></p>
            <ul className="text-sm mt-2 divide-y divide-navy/10">{pagar.abertas.slice(0, 12).map(l => <li key={l.id} className="py-1 flex items-center gap-2" data-testid="conta-pagar"><span className="flex-1">{formatarData(l.vencimento)} · {l.descricao} <span className="text-xs text-grafite-claro">({l.categoria})</span></span><strong className={l.vencimento < hoje ? 'text-critico' : ''}>{brl(Number(l.valor))}</strong><button type="button" onClick={() => marcarPago(l)} aria-label={`Marcar ${l.descricao} como pago`} title="Marca esta conta como paga na data de hoje" className="p-1 text-navy" data-testid="marcar-pago"><Check size={16} aria-hidden /></button></li>)}</ul>
            {!pagar.abertas.length && <p className="text-sm text-grafite-claro mt-2">Nenhuma conta em aberto.</p>}
          </section>
        </div>

        <section className="bg-white shadow-sm p-5" aria-labelledby="t-prev" data-testid="previsao-90">
          <div className="flex flex-wrap items-end justify-between gap-2"><h2 id="t-prev" className="font-serif text-lg">Previsão de caixa (90 dias)</h2>
            <label className="text-xs text-grafite">Saldo em conta hoje (R$)<input value={saldoInicial} onChange={e => setSaldoInicial(e.target.value)} inputMode="decimal" className="border px-2 py-1 block text-sm" data-testid="saldo-inicial" /></label></div>
          <table className="w-full text-sm mt-2"><thead><tr className="text-left text-xs uppercase text-grafite-claro"><th>Período</th><th>Entra</th><th>Sai</th><th>Saldo previsto</th></tr></thead>
            <tbody>{prev.map(p => <tr key={p.janela}><td className="py-1">{p.janela}</td><td>{brl(p.entra)}</td><td>{brl(p.sai)}</td><td className={p.saldo < 0 ? 'text-critico font-medium' : 'font-medium'}>{brl(p.saldo)}</td></tr>)}</tbody></table>
          <p className="text-xs text-grafite-claro mt-2">Valores atrasados entram nos próximos 30 dias com 50% de chance de recebimento (estimativa conservadora).</p>
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          <section className="bg-white shadow-sm p-5" data-testid="resultado-area"><h2 className="font-serif text-lg">Resultado por área (no ano)</h2>
            {porArea.length ? <table className="w-full text-sm mt-2"><thead><tr className="text-left text-xs uppercase text-grafite-claro"><th>Área</th><th>Receita</th><th>Despesa ligada</th><th>Margem</th></tr></thead>
              <tbody>{porArea.map(a => <tr key={a.area}><td className="py-1">{a.area}</td><td>{brl(a.receita)}</td><td>{brl(a.despesa)}</td><td>{pct(a.margem)}</td></tr>)}</tbody></table> : <p className="text-sm text-grafite-claro mt-2">Sem recebimentos no ano.</p>}</section>
          <section className="bg-white shadow-sm p-5" data-testid="despesas-categoria"><h2 className="font-serif text-lg">Para onde vai o dinheiro (no ano)</h2>
            {porCategoria.length ? <ul className="text-sm mt-2 space-y-1">{porCategoria.map(c => <li key={c.categoria}><div className="flex justify-between"><span>{c.categoria}</span><span>{brl(c.valor)} · {pct(c.parte)}</span></div><div className="h-1.5 bg-pergaminho mt-0.5"><div className="h-1.5 bg-dourado" style={{ width: `${Math.round(c.parte * 100)}%` }} /></div></li>)}</ul> : <p className="text-sm text-grafite-claro mt-2">Nenhuma despesa paga no ano.</p>}
            {reembolsos.length > 0 && <><h3 className="text-xs uppercase tracking-wider text-grafite-claro mt-4">Reembolsos a cobrar dos clientes</h3><ul className="text-sm mt-1" data-testid="reembolsos">{reembolsos.map(r => <li key={r.cliente}>{r.cliente}: <strong>{brl(r.pendente)}</strong></li>)}</ul></>}
          </section>
        </div>

        {lanc.length > 0 && (
          <section className="bg-white shadow-sm p-5"><h2 className="font-serif text-lg">Lançamentos</h2>
            <div className="overflow-x-auto"><table className="w-full text-sm mt-2 min-w-[640px]" data-testid="lista-lancamentos"><thead><tr className="text-left text-xs uppercase text-grafite-claro"><th>Vencimento</th><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Situação</th><th><span className="sr-only">Ações</span></th></tr></thead>
              <tbody className="divide-y divide-navy/10">{[...lanc].reverse().slice(0, 100).map(l => <tr key={l.id}><td className="py-1">{formatarData(l.vencimento)}</td><td>{l.descricao}{l.cliente ? <span className="block text-xs text-grafite-claro">{l.cliente}</span> : null}</td><td>{l.categoria}</td><td className={l.tipo === 'despesa' ? 'text-critico' : 'text-regular'}>{l.tipo === 'despesa' ? '−' : '+'}{brl(Number(l.valor))}</td>
                <td><button type="button" onClick={() => marcarPago(l)} title={l.pago_em ? 'Desfaz o pagamento e volta o lançamento para "em aberto"' : 'Marca este lançamento como pago ou recebido na data de hoje'} className="underline text-navy text-xs">{l.pago_em ? `${l.tipo === 'despesa' ? 'pago' : 'recebido'} em ${formatarData(l.pago_em)}` : 'em aberto · marcar'}</button></td><td><button type="button" onClick={() => apagar(l)} title="Apaga este lançamento do financeiro de forma definitiva, após confirmação" className="text-xs text-grafite-claro underline">apagar</button></td></tr>)}</tbody></table></div>
          </section>
        )}
      </div>
    </Layout>
  )
}
