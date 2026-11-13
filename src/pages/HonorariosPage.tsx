import { useEffect, useMemo, useState } from 'react'
import { useBaixado } from '@/hooks/useBaixado'
import { mensagemAmigavel } from '@/lib/erros'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { formatarData, diasAte, hojeLocal, isoLocal } from '@/lib/datas'
import { Banknote, Printer, QrCode, TrendingDown, TrendingUp, Receipt, Trash2 } from 'lucide-react'
import CobrancaPix from '@/components/CobrancaPix'
import { planoParcelas, situacaoParcela, resumoParcelas, type Parcela } from '@/lib/parcelas'
import { CalendarClock } from 'lucide-react'
import { lerNumero } from '@/lib/numero'
import { escaparHtml } from '@/lib/abrirAba'
import { meuAlcance, filtrarPorHierarquia, rotuloCargo } from '@/lib/hierarquia'
import Vazio from '@/components/Vazio'

// Honorários e rentabilidade: por caso, o combinado, o recebido, o vencimento e a régua de cobrança;
// a rentabilidade cruza honorários recebidos com as horas lançadas para o mesmo cliente.
type Caso = { id: string; titulo: string; cliente: string | null; area: string | null; situacao: string; honorario_previsto: number; honorario_recebido: number; vencimento_honorario: string | null; responsavel_id?: string | null }
type Hora = { cliente: string; minutos: number; valor_hora: number }
// Passo 29: baixa de pagamento (data, valor, meio); o recebido do caso é a soma das baixas (gatilho no banco).
type Pagamento = { id: number; caso_id: string; data: string; valor: number; meio: string; observacao: string | null }
const MEIOS: Record<string, string> = { pix: 'PIX', transferencia: 'Transferência', boleto: 'Boleto', cartao: 'Cartão', dinheiro: 'Dinheiro', outro: 'Outro' }
const brl = (v: number) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function HonorariosPage() {
  const [todos, setTodos] = useState<Caso[]>([])
  // Hierarquia: sócios e gestor veem todos os casos; os demais, só os seus (itens sem dono aparecem para todos).
  const [alcance, setAlcance] = useState<Awaited<ReturnType<typeof meuAlcance>> | null>(null)
  const casos = useMemo(() => (alcance && !alcance.veTudo ? filtrarPorHierarquia(todos, alcance) : todos), [todos, alcance])
  const [horas, setHoras] = useState<Hora[]>([])
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState<Record<string, Partial<Caso>>>({})
  const [pix, setPix] = useState<{ caso: Caso; valor: number; referencia: string; descricao: string } | null>(null)
  // Passo D13: parcelas por caso (vencimento, situação, PIX por parcela, quitação).
  const [parcelas, setParcelas] = useState<Parcela[]>([])
  const [parcelar, setParcelar] = useState<{ caso: Caso; quantidade: string; primeiro: string; total: string } | null>(null)
  const [msgParcelas, setMsgParcelas] = useState('')
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [baixa, setBaixa] = useState<{ caso: Caso; data: string; valor: string; meio: string; observacao: string } | null>(null)
  const [msgBaixa, setMsgBaixa] = useState('')
  const [tabelaCopiada, setTabelaCopiada] = useState(false) // Passo 215
  const [linkCopiado, setLinkCopiado] = useState(false) // Passo 279
  const [baixado, marcarBaixado] = useBaixado() // Passo 393
  const abrirBaixa = (c: Caso) => setBaixa({ caso: c, data: hojeLocal(), valor: String(Math.max(0, Number(c.honorario_previsto) - Number(c.honorario_recebido))), meio: 'pix', observacao: '' })
  const salvarBaixa = async () => {
    if (!baixa) return
    const valor = lerNumero(baixa.valor)
    if (!valor || valor <= 0) return setMsgBaixa('Informe um valor maior que zero.')
    const { error } = await supabase.from('pagamentos_honorarios').insert({ caso_id: baixa.caso.id, data: baixa.data, valor, meio: baixa.meio, observacao: baixa.observacao.trim() || null })
    if (error) return setMsgBaixa(mensagemAmigavel(error))
    setMsgBaixa(`Pagamento de ${brl(valor)} registrado em ${formatarData(baixa.data)} (${MEIOS[baixa.meio]}).`); setBaixa(null); carregar()
  }
  const apagarPagamento = async (p: Pagamento) => {
    if (!window.confirm(`Apagar o recebimento de ${brl(Number(p.valor))}?`)) return
    const { error } = await supabase.from('pagamentos_honorarios').delete().eq('id', p.id)
    if (error) setErro(mensagemAmigavel(error))
    carregar()
  }

  const carregar = async () => {
    const [c, h, pg, pc] = await Promise.all([
      supabase.from('tarefas').select('id,titulo,cliente,area,situacao,honorario_previsto,honorario_recebido,vencimento_honorario,responsavel_id').eq('nivel', 'projeto').order('criado_em', { ascending: false }),
      supabase.from('lancamentos_horas').select('cliente,minutos,valor_hora'),
      supabase.from('pagamentos_honorarios').select('id,caso_id,data,valor,meio,observacao').order('data', { ascending: false }),
      supabase.from('parcelas_honorarios').select('id,caso_id,numero,vencimento,valor,pago_em,pagamento_id').order('numero'),
    ])
    if (c.error) setErro(mensagemAmigavel(c.error))
    setTodos((c.data ?? []) as Caso[]); setHoras((h.data ?? []) as Hora[]); setPagamentos((pg.data ?? []) as Pagamento[]); setParcelas((pc?.data ?? []) as Parcela[])
  }
  const abrirParcelar = (c: Caso) => { const aberto = Math.max(0, Number(c.honorario_previsto) - Number(c.honorario_recebido)); const d = new Date(); d.setMonth(d.getMonth() + 1); setParcelar({ caso: c, quantidade: '3', primeiro: isoLocal(d), total: aberto.toFixed(2) }); setMsgParcelas('') }
  const salvarParcelas = async () => {
    if (!parcelar) return
    const total = lerNumero(parcelar.total); const n = Number(parcelar.quantidade)
    if (!planoParcelas(total, n, parcelar.primeiro).length) return setMsgParcelas('Informe o total, a quantidade (1 a 120) e o primeiro vencimento.')
    const { error } = await supabase.rpc('gerar_parcelas', { p_caso: parcelar.caso.id, p_quantidade: n, p_primeiro: parcelar.primeiro, p_valor_total: total })
    if (error) return setMsgParcelas(mensagemAmigavel(error))
    setMsgParcelas(`${n} parcela${n > 1 ? 's' : ''} de ${parcelar.caso.titulo} a partir de ${formatarData(parcelar.primeiro)}. As parcelas aparecem na Agenda e no resumo semanal por e-mail.`); setParcelar(null); carregar()
  }
  const quitarParcela = async (p: Parcela) => {
    const { error } = await supabase.rpc('quitar_parcela', { p_parcela: p.id, p_data: hojeLocal(), p_meio: 'pix' })
    if (error) return setMsgParcelas(mensagemAmigavel(error))
    setMsgParcelas(`Parcela ${p.numero} quitada (${brl(Number(p.valor))}).`); carregar()
  }
  const pixParcela = (c: Caso, p: Parcela) => setPix({ caso: c, valor: Number(p.valor), referencia: `${c.titulo.slice(0, 14)}P${p.numero}`, descricao: `Parcela ${p.numero} ${c.titulo}` })
  useEffect(() => {
    carregar()
    meuAlcance().then(setAlcance).catch(() => setAlcance({ id: '', cargo: null, admin: false, veTudo: true }))
  }, [])

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
<p>THEYE Institute</p><p>Rio de Janeiro, ${new Date().toLocaleDateString('pt-BR')}</p>
<p>Prezado(a) ${escaparHtml(c.cliente ?? 'cliente')},</p>
<p>Em relação ao caso <strong>${escaparHtml(c.titulo)}</strong>, informamos que há honorários em aberto no valor de <strong>${brl(r.aberto)}</strong>${c.vencimento_honorario ? `, com vencimento em ${formatarData(c.vencimento_honorario)}` : ''}.</p>
<p>Pedimos a gentileza de regularizar o pagamento ou entrar em contato para combinar a melhor forma. Ficamos à disposição.</p>
<p>Atenciosamente,<br/>THEYE Institute</p></body></html>`)
    w.document.close(); w.print()
  }

  const totais = casos.reduce((s, c) => ({ previsto: s.previsto + Number(c.honorario_previsto), recebido: s.recebido + Number(c.honorario_recebido) }), { previsto: 0, recebido: 0 })
  const custoTotal = Object.values(custoPorCliente).reduce((a, b) => a + b, 0)
  // Passo 114: resumo da cobrança em texto (totais e casos com saldo em aberto), para a reunião de sócios.
  const copiarCobranca = () => {
    const abertos = casos.map(c => ({ c, r: regua(c) })).filter(x => x.r.aberto > 0).sort((a, b) => b.r.aberto - a.r.aberto)
    const linhas = [
      `Honorários · ${new Date().toLocaleDateString('pt-BR')}`,
      `Combinado ${brl(totais.previsto)} · Recebido ${brl(totais.recebido)} · Em aberto ${brl(totais.previsto - totais.recebido)} · Custo das horas ${brl(custoTotal)}`,
      `Casos com saldo em aberto: ${abertos.length}`,
      ...abertos.map(({ c, r }) => `  ${c.titulo}${c.cliente ? ' · ' + c.cliente : ''} · ${brl(r.aberto)} · ${r.rotulo}`),
    ]
    navigator.clipboard?.writeText(linhas.join('\n')).catch(() => undefined)
  }

  return (
    <Layout title="Honorários">
      <div className="space-y-6">
        {alcance && !alcance.veTudo && (
          <p className="bg-white border-l-2 border-dourado p-3 text-sm" data-testid="honorarios-alcance" title="A hierarquia é definida pela administração na tela Equipe.">
            Você está vendo <strong>os honorários dos seus casos</strong> ({rotuloCargo[alcance.cargo ?? 'nenhum']}). Sócios e o gestor veem o escritório inteiro.
          </p>
        )}
        <section className="grid gap-4 sm:grid-cols-4">
          {[['Combinado', brl(totais.previsto)], ['Recebido', brl(totais.recebido)], ['Em aberto', brl(totais.previsto - totais.recebido)], ['Custo das horas', brl(custoTotal)]].map(([k, v]) => (
            <div key={k} className="bg-white shadow-sm border-t-2 border-dourado p-4"><p className="text-xs uppercase tracking-wider text-grafite">{k}</p><p className="text-2xl font-serif text-navy">{v}</p></div>
          ))}
        </section>
        {erro && <p role="alert" className="text-sm text-critico">{erro}</p>}
        <section className="bg-white shadow-sm p-5 min-w-0 max-w-full overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-lg flex items-center gap-2"><Banknote size={18} className="text-dourado" aria-hidden="true" /> Por caso</h2>
            <div className="flex flex-wrap gap-2">
            {casos.length > 0 && <button type="button" onClick={copiarCobranca} title="Copia para a área de transferência um resumo em texto da cobrança: totais e casos com saldo em aberto, para colar em e-mail ou na reunião de sócios" data-testid="copiar-cobranca" className="min-h-[44px] px-4 border border-navy/20 text-navy text-sm">Copiar resumo da cobrança</button>}
            {/* Passo 146: tabela por caso copiável (caso, combinado, recebido, vencimento). */}
            {casos.length > 0 && <button type="button" onClick={() => navigator.clipboard?.writeText([`Honorários por caso — ${casos.length} caso(s)`, ...casos.map(c => `${c.titulo}${c.cliente ? ` (${c.cliente})` : ''}: combinado ${brl(Number(c.honorario_previsto))} · recebido ${brl(Number(c.honorario_recebido))}${c.vencimento_honorario ? ` · vence ${formatarData(c.vencimento_honorario)}` : ''}`), `Total: combinado ${brl(totais.previsto)} · recebido ${brl(totais.recebido)}`].join('\n')).then(() => setTabelaCopiada(true)).catch(() => undefined)} title="Copia a tabela de honorários por caso (combinado, recebido e vencimento) em texto para colar em outro lugar" data-testid="copiar-tabela-honorarios" className="min-h-[44px] px-4 border border-navy/20 text-navy text-sm">{tabelaCopiada ? 'Tabela copiada' : 'Copiar tabela'}</button>}
            {casos.length > 0 && <button type="button" onClick={() => window.print()} title="Abre a janela de impressão do navegador para imprimir esta página de honorários" data-testid="imprimir-honorarios" className="min-h-[44px] px-4 border border-navy/20 text-navy text-sm print:hidden">Imprimir</button>}{/* Passo 180 */}
            {casos.length > 0 && <button type="button" data-testid="copiar-link-honorarios" title="Copia o endereço desta página de honorários para compartilhar com a equipe" onClick={() => navigator.clipboard?.writeText(window.location.href).then(() => setLinkCopiado(true)).catch(() => undefined)} className="min-h-[44px] px-4 border border-navy/20 text-navy text-sm print:hidden">{linkCopiado ? 'Link copiado' : 'Copiar link'}</button>}{/* Passo 249 */}
            {casos.length > 0 && <button type="button" data-testid="baixar-honorarios" title="Baixa a planilha CSV com todos os casos e seus honorários (combinado, recebido e vencimento)" aria-live="polite" onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([['caso;cliente;área;situação;previsto;recebido;vencimento', ...casos.map(c => `${c.titulo.replace(/;/g, ',')};${c.cliente ?? ''};${c.area ?? ''};${c.situacao};${c.honorario_previsto};${c.honorario_recebido};${c.vencimento_honorario ?? ''}`)].join('\n')], { type: 'text/plain;charset=utf-8' })); a.download = 'honorarios.csv'; a.click(); marcarBaixado(); setTimeout(() => URL.revokeObjectURL(a.href), 2000) }} className="ml-2 min-h-[44px] px-4 border border-navy/20 text-navy text-sm print:hidden">{baixado ? 'Baixado' : 'Baixar CSV'}</button>}{/* Passo 310 */}
            </div>
          </div>
          <p className="text-xs text-grafite-claro mb-3">Rentabilidade = honorários recebidos menos o custo das horas lançadas para o mesmo cliente (tela Horas). Edite os valores e toque em Salvar.</p>
          <div className="relative overflow-x-auto max-w-full"><table className="w-full text-sm" data-testid="tabela-honorarios">
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
                    <td className={`${r.cor} whitespace-nowrap`}>{r.rotulo}{r.aberto > 0 && <button onClick={() => carta(c)} title="Abre uma carta de cobrança pronta para imprimir, com o cliente, o caso e o valor em aberto" className="block text-xs underline text-navy mt-1 inline-flex items-center gap-1"><Printer size={12} aria-hidden="true" /> Carta de cobrança</button>}{r.aberto > 0 && <button onClick={() => setPix({ caso: c, valor: r.aberto, referencia: c.titulo.slice(0, 20), descricao: `Honorarios ${c.titulo}` })} className="block text-xs underline text-navy mt-1 inline-flex items-center gap-1" data-testid="cobrar-pix" title="Gera um QR Code PIX com o valor em aberto deste caso para enviar ao cliente"><QrCode size={12} aria-hidden="true" /> Cobrar por PIX</button>}<button onClick={() => abrirBaixa(c)} className="block text-xs underline text-navy mt-1 inline-flex items-center gap-1" data-testid="registrar-pagamento" title="Abre o formulário para registrar um pagamento recebido deste caso (data, valor e meio); o recebido é atualizado na hora"><Receipt size={12} aria-hidden="true" /> Registrar pagamento</button>
                      {r.aberto > 0 && <button onClick={() => abrirParcelar(c)} className="block text-xs underline text-navy mt-1 inline-flex items-center gap-1" data-testid="parcelar" title="Abre o formulário para dividir o saldo em aberto deste caso em parcelas mensais com vencimentos na Agenda"><CalendarClock size={12} aria-hidden="true" /> {parcelas.some(p => p.caso_id === c.id) ? 'Refazer parcelas' : 'Parcelar'}</button>}
                      {parcelas.some(p => p.caso_id === c.id) && (() => { const ps = parcelas.filter(p => p.caso_id === c.id); const res = resumoParcelas(ps); return <div className="mt-1" data-testid="parcelas-caso"><p className="text-[11px] text-grafite">{res.pagas}/{res.total} pagas{res.atrasadas > 0 && <span className="text-critico"> · {res.atrasadas} atrasada{res.atrasadas > 1 ? 's' : ''} ({brl(res.valorAtrasado)})</span>}</p><ol className="text-[11px] text-grafite-claro space-y-0.5">{ps.map(p => { const st = situacaoParcela(p); return <li key={p.id} data-testid="parcela" className={st.codigo === 'atrasada' ? 'text-critico' : st.codigo === 'vence_breve' ? 'text-dourado-escuro' : ''}>{p.numero}ª · {formatarData(p.vencimento)} · {brl(Number(p.valor))} · {st.rotulo}{!p.pago_em && <> <button onClick={() => pixParcela(c, p)} className="underline" aria-label={`PIX da parcela ${p.numero}`} title={`Gera um QR Code PIX com o valor da parcela ${p.numero} para enviar ao cliente`}>PIX</button> <button onClick={() => quitarParcela(p)} className="underline" aria-label={`Marcar parcela ${p.numero} paga`} data-testid="quitar-parcela" title={`Registra o pagamento da parcela ${p.numero} com a data de hoje e atualiza o recebido do caso`}>Marcar paga</button></>}</li> })}</ol></div> })()}
                      {pagamentos.filter(p => p.caso_id === c.id).length > 0 && <ul className="mt-1 text-[11px] text-grafite-claro" data-testid="pagamentos-caso">{pagamentos.filter(p => p.caso_id === c.id).slice(0, 5).map(p => <li key={p.id} data-testid="pagamento">{formatarData(p.data)} · {brl(Number(p.valor))} · {MEIOS[p.meio] ?? p.meio} <button onClick={() => apagarPagamento(p)} aria-label="Apagar pagamento" title="Apaga este recebimento registrado (pede confirmação) e recalcula o recebido do caso" className="align-middle p-2 -m-1 text-grafite-claro hover:text-critico"><Trash2 size={10} aria-hidden="true" /></button></li>)}</ul>}</td>
                    <td className={`whitespace-nowrap ${rent < 0 ? 'text-critico' : 'text-navy'}`}>{rent < 0 ? <TrendingDown size={14} className="inline" aria-hidden="true" /> : <TrendingUp size={14} className="inline" aria-hidden="true" />} {brl(rent)}<span className="block text-xs text-grafite-claro">custo {brl(custo)}</span></td>
                    <td>{editando[c.id] && <button onClick={() => salvar(c)} title="Grava os valores editados de combinado, recebido e vencimento deste caso" className="min-h-[36px] px-3 bg-navy text-white text-xs uppercase">Salvar</button>}</td>
                  </tr>
                )
              })}
              {!casos.length && <tr><td colSpan={7}><Vazio testid="honorarios-vazio" titulo="Nenhum caso ainda" texto="Os honorários são lançados por caso. Crie o primeiro caso e ele aparece nesta tabela." acao={{ rotulo: 'Criar um caso', para: '/projetos', dica: 'Abre Casos e projetos para criar o caso que receberá os honorários' }} /></td></tr>}
            </tbody>
          </table></div>
        </section>
        {msgBaixa && <p role="status" className="text-sm text-navy" data-testid="msg-baixa">{msgBaixa}</p>}
        {baixa && (
          <section className="bg-white shadow-sm border-l-4 border-dourado p-5" aria-label="Registrar pagamento" data-testid="form-baixa">
            <h2 className="text-lg mb-1">Registrar pagamento · {baixa.caso.titulo}</h2>
            <p className="text-xs text-grafite-claro mb-3">Em aberto: {brl(Math.max(0, Number(baixa.caso.honorario_previsto) - Number(baixa.caso.honorario_recebido)))}. O recebido do caso e a régua de cobrança são atualizados na hora.</p>
            <div className="grid gap-3 sm:grid-cols-5">
              <label className="text-xs">Data<input type="date" value={baixa.data} onChange={e => setBaixa({ ...baixa, data: e.target.value })} className="block border px-2 py-2 w-full min-h-[44px]" data-testid="baixa-data" /></label>
              <label className="text-xs">Valor (R$)<input type="number" min="0.01" step="0.01" value={baixa.valor} onChange={e => setBaixa({ ...baixa, valor: e.target.value })} className="block border px-2 py-2 w-full min-h-[44px]" data-testid="baixa-valor" /></label>
              <label className="text-xs">Meio<select value={baixa.meio} onChange={e => setBaixa({ ...baixa, meio: e.target.value })} className="block border px-2 py-2 w-full min-h-[44px]" data-testid="baixa-meio" title="Escolhe o meio pelo qual o pagamento foi recebido (PIX, transferência, boleto, cartão, dinheiro ou outro)">{Object.entries(MEIOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              <label className="text-xs sm:col-span-2">Observação<input value={baixa.observacao} onChange={e => setBaixa({ ...baixa, observacao: e.target.value })} placeholder="Ex.: comprovante PIX 1234" className="block border px-2 py-2 w-full min-h-[44px]" /></label>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={salvarBaixa} className="min-h-[44px] px-4 bg-navy text-white text-sm uppercase tracking-wider" data-testid="baixa-salvar" title="Grava este pagamento no caso e atualiza o valor recebido e a régua de cobrança">Salvar pagamento</button>
              <button onClick={() => setBaixa(null)} title="Fecha o formulário sem registrar o pagamento" className="min-h-[44px] px-4 border text-sm">Cancelar</button>
            </div>
          </section>
        )}
        {msgParcelas && <p role="status" className="text-sm text-navy" data-testid="msg-parcelas">{msgParcelas}</p>}
        {parcelar && (
          <section className="bg-white shadow-sm border-l-4 border-dourado p-5" aria-label="Parcelar honorários" data-testid="form-parcelar">
            <h2 className="text-lg mb-1">Parcelar · {parcelar.caso.titulo}</h2>
            <p className="text-xs text-grafite-claro mb-3">Parcelas mensais com os centavos na última. Cada parcela tem QR PIX com o próprio valor; as parcelas já pagas são preservadas. Vencimentos entram na Agenda e no resumo semanal por e-mail.</p>
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="text-xs">Total (R$)<input type="number" min="0.01" step="0.01" value={parcelar.total} onChange={e => setParcelar({ ...parcelar, total: e.target.value })} className="block border px-2 py-2 w-full min-h-[44px]" data-testid="parcelar-total" /></label>
              <label className="text-xs">Parcelas<input type="number" min="1" max="120" value={parcelar.quantidade} onChange={e => setParcelar({ ...parcelar, quantidade: e.target.value })} className="block border px-2 py-2 w-full min-h-[44px]" data-testid="parcelar-quantidade" /></label>
              <label className="text-xs">1º vencimento<input type="date" value={parcelar.primeiro} onChange={e => setParcelar({ ...parcelar, primeiro: e.target.value })} className="block border px-2 py-2 w-full min-h-[44px]" data-testid="parcelar-primeiro" /></label>
              <div className="text-xs self-end pb-2" data-testid="parcelar-previa">{(() => { const pl = planoParcelas(lerNumero(parcelar.total), Number(parcelar.quantidade), parcelar.primeiro); return pl.length ? `${pl.length}× ${brl(pl[0].valor)}${pl.length > 1 && pl[pl.length - 1].valor !== pl[0].valor ? ` (última ${brl(pl[pl.length - 1].valor)})` : ''} até ${formatarData(pl[pl.length - 1].vencimento)}` : 'Preencha os campos' })()}</div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={salvarParcelas} className="min-h-[44px] px-4 bg-navy text-white text-sm uppercase tracking-wider" data-testid="parcelar-salvar" title="Cria as parcelas mensais do saldo deste caso; os vencimentos entram na Agenda e no resumo semanal por e-mail">Gerar parcelas</button>
              <button onClick={() => setParcelar(null)} title="Fecha o formulário sem gerar as parcelas" className="min-h-[44px] px-4 border text-sm">Cancelar</button>
            </div>
          </section>
        )}
        {pix && <CobrancaPix valor={pix.valor} caso={pix.caso.titulo} cliente={pix.caso.cliente} referencia={pix.referencia} descricao={pix.descricao} fechar={() => setPix(null)} />}
      </div>
    </Layout>
  )
}
