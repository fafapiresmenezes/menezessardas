import { useEffect, useMemo, useState } from 'react'
import { useBaixado } from '@/hooks/useBaixado'
import Layout from '@/components/Layout'
import { projetarMes, sugerirTeto } from '@/lib/projecaoConsumo'
import { supabase } from '@/lib/supabase'
import { perfilAtual, ehSede, type Funcao } from '@/lib/equipe'
import { Printer, Wallet, AlertTriangle, Paperclip, Download } from 'lucide-react'
import { lerNumero } from '@/lib/numero'
import { abrirEmNovaAba } from '@/lib/abrirAba'
import { mensagemAmigavel } from '@/lib/erros'
import Vazio from '@/components/Vazio'

// Transparência de custos: cada uso de IA e cada e-mail é registrado no servidor com quem usou,
// a função e os tokens; o custo vem da tabela pública de preços e da cotação PTAX do Banco Central.

interface Linha {
  mes: string
  funcao: string
  modelo: string | null
  usuario: string
  usos: number
  tokens_entrada: number
  tokens_saida: number
  custo_usd: number
}
interface Preco { modelo: string; usd_entrada_mtok: number; usd_saida_mtok: number; usd_por_unidade: number; fonte: string | null }
interface Cotacao { valor: number; data: string; teto_brl: number | null; mes_usd: number }

const NOME_FUNCAO: Record<string, string> = {
  'assistente-juridico': 'Assistente jurídico',
  'analisar-contrato': 'Análise de contrato (PDF)',
  'perfil-julgador': 'Perfil do julgador',
  'avisos por e-mail': 'Avisos por e-mail',
  'e-mail de teste': 'E-mail de teste',
}
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: v < 1 ? 4 : 2 })
const mesAtual = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 7)
const nomeMes = (m: string) => new Date(m + '-15T12:00:00Z').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

export default function ConsumoPage() {
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [precos, setPrecos] = useState<Preco[]>([])
  const [cot, setCot] = useState<Cotacao | null>(null)
  // Passo 166: o mês escolhido é lembrado neste navegador.
  const [mes, setMes] = useState(() => { try { return localStorage.getItem('lsm-consumo-mes') || mesAtual() } catch { return mesAtual() } })
  useEffect(() => { try { localStorage.setItem('lsm-consumo-mes', mes) } catch { /* sem armazenamento */ } }, [mes])
  const [perfil, setPerfil] = useState<Funcao | null>(null)
  // Escritórios parceiros veem só o próprio consumo e o próprio teto; as faturas dos fornecedores e o e-mail de aviso são da sede.
  const [sede, setSede] = useState(true)
  useEffect(() => { ehSede().then(setSede).catch(() => setSede(true)) }, [])
  const [teto, setTeto] = useState('')
  const [faturas, setFaturas] = useState<{ name: string }[]>([])
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  // Passo 97: resumo do mês em texto para a sócia.
  const [copiadoResumo, setCopiadoResumo] = useState(false)
  const [linkCopiado, setLinkCopiado] = useState(false) // Passo 259
  // Passo 127: tabelas "por função" e "por usuário" copiáveis para a reunião de custos.
  const [tabelaCopiada, setTabelaCopiada] = useState<'funcao' | 'usuario' | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [testandoAviso, setTestandoAviso] = useState(false)
  const [baixado, marcarBaixado] = useBaixado() // Passo 388
  // Passo 06: avisos automáticos de 80% e 100% do teto (de hora em hora) e teste pelo administrador.
  async function testarAviso() {
    setTestandoAviso(true)
    const { data, error } = await supabase.functions.invoke('aviso-teto-ia', { body: { teste: true } })
    setTestandoAviso(false)
    if (error || !data?.enviado) setMsg({ ok: false, texto: 'Não deu para enviar o e-mail de teste: ' + (data?.motivo ?? data?.detalhe ?? error?.message ?? 'erro') })
    else setMsg({ ok: true, texto: `E-mail de teste do aviso de teto enviado para você (${data.destinatarios} destinatário).` })
  }

  async function carregar() {
    const [l, p, c, eu] = await Promise.all([
      supabase.from('consumo_mensal').select('*'),
      supabase.from('precos_api').select('*').order('modelo'),
      supabase.rpc('ler_cotacao'),
      perfilAtual(),
    ])
    setLinhas((l.data ?? []) as Linha[])
    setPrecos((p.data ?? []) as Preco[])
    setCot(c.data as Cotacao)
    setTeto(c.data?.teto_brl ? String(c.data.teto_brl) : '')
    setPerfil(eu)
    setCarregando(false)
  }
  async function carregarFaturas(m: string) {
    const { data } = await supabase.storage.from('documentos').list(`faturas/${m}`)
    setFaturas((data ?? []).filter(f => f.name !== '.emptyFolderPlaceholder'))
  }
  useEffect(() => { carregar() }, [])
  useEffect(() => { carregarFaturas(mes) }, [mes])

  const taxa = cot?.valor ?? 0
  const meses = useMemo(() => [...new Set([mesAtual(), ...linhas.map(l => l.mes.slice(0, 7))])].sort().reverse(), [linhas])
  const doMes = linhas.filter(l => l.mes.slice(0, 7) === mes)
  const totalBrl = doMes.reduce((s, l) => s + Number(l.custo_usd) * taxa, 0)
  const somar = (chave: 'funcao' | 'usuario') => Object.entries(doMes.reduce<Record<string, { usos: number; brl: number }>>((acc, l) => {
    const k = chave === 'funcao' ? NOME_FUNCAO[l.funcao] ?? l.funcao : l.usuario
    acc[k] ??= { usos: 0, brl: 0 }
    acc[k].usos += Number(l.usos); acc[k].brl += Number(l.custo_usd) * taxa
    return acc
  }, {})).sort((a, b) => b[1].brl - a[1].brl)

  const gastoAtual = (cot?.mes_usd ?? 0) * taxa
  const pctTeto = cot?.teto_brl ? Math.min(100, (gastoAtual / cot.teto_brl) * 100) : null

  async function salvarTeto() {
    const v = teto.trim() ? lerNumero(teto) : null
    if (v !== null && (!isFinite(v) || v < 0)) return setMsg({ ok: false, texto: 'Informe um valor em reais, por exemplo 300.' })
    const { error } = await supabase.rpc('definir_teto_mensal', { valor_brl: v })
    setMsg(error ? { ok: false, texto: mensagemAmigavel(error) } : { ok: true, texto: v === null ? 'Teto removido.' : `Teto mensal definido em ${brl(v)}.` })
    carregar()
  }
  async function anexarFatura(arq: File) {
    const nome = `${Date.now()}-${arq.name.replace(/[^\w.-]+/g, '_')}`
    const { error } = await supabase.storage.from('documentos').upload(`faturas/${mes}/${nome}`, arq)
    setMsg(error ? { ok: false, texto: mensagemAmigavel(error) } : { ok: true, texto: 'Fatura anexada ao extrato do mês.' })
    carregarFaturas(mes)
  }
  async function abrirFatura(nome: string) {
    try {
      await abrirEmNovaAba(async () => (await supabase.storage.from('documentos').createSignedUrl(`faturas/${mes}/${nome}`, 300)).data?.signedUrl)
    } catch (e) { setMsg({ ok: false, texto: e instanceof Error ? e.message : 'Não foi possível abrir a fatura.' }) }
  }

  return (
    <Layout title="Consumo">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg flex items-center gap-2"><Wallet size={18} aria-hidden="true" /> Quanto o escritório gastou</h2>
              <p className="text-sm text-grafite-claro mt-1 max-w-2xl">
                Cada uso da inteligência artificial e cada e-mail de aviso fica registrado com quem usou e quanto custou.
                O valor vem da tabela pública de preços de cada serviço, convertido pela cotação do dólar do Banco Central.
              </p>
            </div>
            <label className="text-sm print:hidden">
              <span className="block text-grafite-claro mb-1">Mês</span>
              <select value={mes} onChange={e => setMes(e.target.value)} title="Escolhe o mês cujo consumo de IA e e-mails será mostrado" className="border border-navy/20 px-3 min-h-[44px] bg-white capitalize">
                {meses.map(m => <option key={m} value={m}>{nomeMes(m)}</option>)}
              </select>
            </label>
          </div>
          <p className="text-4xl font-serif text-navy mt-4" data-testid="total-mes">{carregando ? '…' : brl(totalBrl)}</p>
          {!carregando && <button type="button" onClick={async () => { const t = [`Consumo de IA e e-mails — ${nomeMes(mes)}`, `Total: ${brl(totalBrl)} em ${doMes.reduce((s, l) => s + Number(l.usos), 0)} uso(s)`, ...(mes === mesAtual() ? [`Projeção para o fim do mês: ${brl(projetarMes(totalBrl, new Date()).projecao)}`] : []), cot ? `Cotação: US$ 1 = ${brl(taxa)} (${cot.data})` : '', 'THEYE Institute'].filter(Boolean).join('\n'); try { await navigator.clipboard.writeText(t); setCopiadoResumo(true); setTimeout(() => setCopiadoResumo(false), 2500) } catch { /* sem área de transferência */ } }} data-testid="copiar-consumo" title="Copia o resumo do mês (total, usos, projeção e cotação) em texto para enviar à sócia" className="mt-2 min-h-[44px] px-4 border border-navy text-navy text-sm print:hidden">{copiadoResumo ? 'Resumo copiado' : 'Copiar resumo do mês'}</button>}
          {!carregando && <button type="button" onClick={() => window.print()} data-testid="imprimir-consumo" title="Abre a tela de impressão do navegador com o extrato de consumo do mês" className="ml-2 underline text-navy text-sm print:hidden">imprimir</button>}{/* Passo 199 */}
          {!carregando && <button type="button" data-testid="copiar-link-consumo" title="Copia o endereço desta página de consumo para compartilhar" onClick={() => navigator.clipboard?.writeText(window.location.href).then(() => setLinkCopiado(true)).catch(() => undefined)} className="ml-2 underline text-navy text-sm print:hidden">{linkCopiado ? 'link copiado' : 'copiar link'}</button>}{/* Passo 225 */}
          {!carregando && doMes.length > 0 && <button type="button" data-testid="baixar-consumo" title="Baixa o detalhamento do consumo do mês em arquivo CSV para abrir em planilha" aria-live="polite" onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([['mês;função;modelo;usuário;usos;tokens de entrada', ...doMes.map(l => `${l.mes};${l.funcao};${l.modelo ?? ''};${l.usuario};${l.usos};${l.tokens_entrada}`)].join('\n')], { type: 'text/plain;charset=utf-8' })); a.download = 'consumo-ia.csv'; a.click(); marcarBaixado(); setTimeout(() => URL.revokeObjectURL(a.href), 2000) }} className="ml-2 underline text-navy text-sm print:hidden">{baixado ? 'baixado' : 'baixar CSV'}</button>}{/* Passo 295 */}
          <p className="text-sm text-grafite-claro capitalize">{nomeMes(mes)} · {doMes.reduce((s, l) => s + Number(l.usos), 0)} uso(s)</p>
          {cot && <p className="text-xs text-grafite-claro mt-2">Cotação usada: US$ 1 = {brl(taxa)} ({cot.data}).</p>}
          {mes === mesAtual() && !carregando && (() => {
            // Passo 49: projeção do mês e sugestão de teto a partir do que já foi gasto.
            const pj = projetarMes(totalBrl, new Date())
            const anteriores = Object.entries(linhas.filter(l => l.mes.slice(0, 7) < mes).reduce<Record<string, number>>((acc, l) => { const k = l.mes.slice(0, 7); acc[k] = (acc[k] ?? 0) + Number(l.custo_usd) * taxa; return acc }, {})).map(([m, v]) => ({ mes: m, brl: v }))
            const sg = sugerirTeto(pj.projecao, anteriores)
            return (
              <div className="mt-4 border-t border-navy/10 pt-3 text-sm" data-testid="projecao-mes">
                <p>Projeção para o fim do mês: <strong data-testid="projecao-valor">{brl(pj.projecao)}</strong> <span className="text-grafite-claro">({pj.diasDecorridos} de {pj.diasMes} dias decorridos, ritmo linear{anteriores.length ? `; média dos últimos ${Math.min(3, anteriores.length)} mês(es): ${brl(sg.media)}` : ''})</span>.</p>
                {pj.diasDecorridos < pj.diasMes && totalBrl > 0 && (() => { const resto = (totalBrl / pj.diasDecorridos) * (pj.diasMes - pj.diasDecorridos); return <p className="text-grafite-claro mt-1" data-testid="faixa-projecao">Faixa de cenários: de {brl(totalBrl + resto * 0.5)} (se o uso cair pela metade) a {brl(totalBrl + resto * 1.5)} (se subir 50%). São cenários, não intervalo estatístico.</p> })()}
                {cot?.teto_brl ? <p className="text-grafite-claro mt-1">{pj.projecao > cot.teto_brl ? `Nesse ritmo o teto de ${brl(cot.teto_brl)} será ultrapassado.` : `Nesse ritmo o teto de ${brl(cot.teto_brl)} é suficiente.`}</p> : <p className="text-grafite-claro mt-1">Ainda não há teto mensal definido.</p>}
                {perfil === 'admin' && <button type="button" onClick={() => { setTeto(String(sg.teto)); setMsg({ ok: true, texto: `Teto sugerido: ${brl(sg.teto)} (${sg.base} com folga de 20%). Confira o valor e clique em Salvar teto.` }); document.getElementById('teto')?.focus() }} data-testid="sugerir-teto" title="Preenche o campo de teto com o valor sugerido (projeção ou média com folga de 20%) para você conferir e salvar" className="mt-2 min-h-[44px] border border-navy text-navy px-4 text-sm uppercase tracking-wider">Sugerir teto ({brl(sg.teto)})</button>}
              </div>
            )
          })()}
        </section>

        {pctTeto !== null && (
          <section
            role={pctTeto >= 80 ? 'alert' : undefined}
            className={`p-4 border-l-2 text-sm ${pctTeto >= 100 ? 'bg-criticoFundo border-critico text-critico' : pctTeto >= 80 ? 'bg-atencaoFundo border-atencao text-atencao' : 'bg-regularFundo border-regular text-regular'}`}
          >
            <p className="flex items-center gap-2 font-medium">
              {pctTeto >= 80 && <AlertTriangle size={16} aria-hidden="true" />}
              {pctTeto >= 100
                ? 'Teto do mês atingido: a inteligência artificial está pausada até o mês que vem ou até um administrador aumentar o teto.'
                : pctTeto >= 80
                  ? `Atenção: ${pctTeto.toFixed(0)}% do teto mensal já foi usado.`
                  : `${pctTeto.toFixed(0)}% do teto mensal usado.`}
            </p>
            <div className="h-2 bg-white/70 mt-2" aria-hidden="true"><div className="h-2 bg-current" style={{ width: `${pctTeto}%` }} /></div>
            <p className="mt-1">{brl(gastoAtual)} de {brl(cot!.teto_brl!)} neste mês.</p>
          </section>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {(['funcao', 'usuario'] as const).map(chave => (
            <section key={chave} className="bg-white shadow-sm p-6">
              <div className="flex items-center justify-between gap-2 mb-3"><h3 className="text-base">{chave === 'funcao' ? 'Por função' : 'Por usuário'}</h3>
                {somar(chave).length > 0 && <button type="button" onClick={async () => { const t = [`Consumo ${chave === 'funcao' ? 'por função' : 'por usuário'} — ${nomeMes(mes)}`, ...somar(chave).map(([k, v]) => `${k}: ${v.usos} uso(s) · ${brl(v.brl)}`)].join('\n'); try { await navigator.clipboard.writeText(t); setTabelaCopiada(chave); setTimeout(() => setTabelaCopiada(null), 2500) } catch { /* sem área de transferência */ } }} data-testid={`copiar-${chave}`} title={`Copia a tabela de consumo ${chave === 'funcao' ? 'por função' : 'por usuário'} em texto para a reunião de custos`} className="underline text-navy text-sm print:hidden">{tabelaCopiada === chave ? 'copiado' : 'copiar'}</button>}
              </div>
              {somar(chave).length === 0 ? (
                <Vazio testid="consumo-vazio" titulo="Nenhum uso registrado neste mês" texto="O consumo aparece aqui depois do primeiro pedido de IA do escritório no mês." acao={{ rotulo: 'Abrir o Assistente jurídico', para: '/assistente', dica: 'Abre o Assistente jurídico: o primeiro pedido do mês já aparece neste quadro' }} />
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-grafite-claro"><th className="font-normal py-1">{chave === 'funcao' ? 'Função' : 'Usuário'}</th><th className="font-normal text-right">Usos</th><th className="font-normal text-right">Custo</th></tr></thead>
                  <tbody>
                    {somar(chave).map(([k, v]) => (
                      <tr key={k} className="border-t border-navy/5"><td className="py-2 break-all pr-2">{k}</td><td className="text-right">{v.usos}</td><td className="text-right whitespace-nowrap">{brl(v.brl)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          ))}
        </div>

        {sede && <section className="bg-white shadow-sm p-6">
          <h3 className="text-base mb-1">Faturas originais do mês</h3>
          <p className="text-sm text-grafite-claro mb-3">As faturas dos fornecedores (Anthropic, Brevo e hospedagem) ficam anexadas aqui e saem junto no extrato.</p>
          {faturas.length === 0 ? <p className="text-sm text-grafite-claro">Nenhuma fatura anexada a este mês.</p> : (
            <ul className="text-sm space-y-1">
              {faturas.map(f => (
                <li key={f.name}><button onClick={() => abrirFatura(f.name)} title="Abre esta fatura do fornecedor em uma nova aba" className="inline-flex items-center gap-1 text-navy underline min-h-[32px]"><Download size={14} aria-hidden="true" />{f.name.replace(/^\d+-/, '')}</button></li>
              ))}
            </ul>
          )}
          {perfil === 'admin' && (
            <label title="Anexa a fatura do fornecedor (PDF ou imagem) ao extrato deste mês" className="inline-flex items-center gap-2 mt-3 px-4 min-h-[44px] border border-navy text-navy text-sm cursor-pointer print:hidden">
              <Paperclip size={16} aria-hidden="true" /> Anexar fatura
              <input type="file" accept="application/pdf,image/*" className="sr-only" onChange={e => e.target.files?.[0] && anexarFatura(e.target.files[0])} />
            </label>
          )}
        </section>}

        <section className="bg-white shadow-sm p-6">
          <h3 className="text-base mb-1">Tabela de preços usada no cálculo</h3>
          <table className="w-full text-sm mt-2">
            <thead><tr className="text-left text-grafite-claro"><th className="font-normal py-1">Serviço</th><th className="font-normal text-right">Entrada (US$/milhão de tokens)</th><th className="font-normal text-right">Saída (US$/milhão de tokens)</th><th className="font-normal text-right">Por unidade</th></tr></thead>
            <tbody>
              {precos.map(p => (
                <tr key={p.modelo} className="border-t border-navy/5">
                  <td className="py-2">{p.modelo}<span className="block text-xs text-grafite-claro">{p.fonte}</span></td>
                  <td className="text-right">{Number(p.usd_entrada_mtok).toFixed(2)}</td>
                  <td className="text-right">{Number(p.usd_saida_mtok).toFixed(2)}</td>
                  <td className="text-right">{Number(p.usd_por_unidade) ? `US$ ${p.usd_por_unidade}` : 'grátis'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {perfil === 'admin' && (
          <section className="bg-white shadow-sm p-6 print:hidden">
            <h3 className="text-base mb-1">Teto mensal de gasto</h3>
            <p className="text-sm text-grafite-claro mb-3">{sede ? (<>Ao chegar a 80% aparece um aviso em Alertas e os administradores recebem e-mail; ao chegar a 100% a inteligência artificial pausa até o mês seguinte e sai novo e-mail. A verificação roda de hora em hora. Deixe em branco para não ter teto.</>) : 'Defina quanto o escritório aceita gastar por mês com a inteligência artificial. Ao chegar a 80% a barra acima fica amarela; ao chegar a 100% a inteligência artificial do escritório pausa até o mês seguinte ou até um administrador aumentar o teto.'}</p>
            <div className="flex flex-wrap gap-3 items-end">
              <label className="text-sm">
                <span className="block mb-1">Valor em reais</span>
                <input id="teto" title="Quanto o escritório aceita gastar com IA por mês. Chegando perto, a plataforma avisa; em branco, não há teto." inputMode="decimal" value={teto} onChange={e => setTeto(e.target.value)} placeholder="ex.: 300" className="border border-navy/20 px-3 min-h-[44px] w-40" />
              </label>
              <button onClick={salvarTeto} title="Grava o teto mensal de gasto com IA; em branco, remove o teto" className="min-h-[44px] px-5 bg-navy text-white text-sm">Salvar teto</button>
              {sede && <button type="button" onClick={testarAviso} disabled={testandoAviso} data-testid="testar-aviso-teto" title="Envia agora um e-mail de teste do aviso de teto para conferir se o alerta automático funciona" className="min-h-[44px] px-5 border border-navy text-navy text-sm disabled:opacity-50">{testandoAviso ? 'Enviando…' : 'Testar e-mail de aviso'}</button>}
            </div>
          </section>
        )}

        {msg && (
          <p role={msg.ok ? 'status' : 'alert'} className={`px-4 py-3 text-sm border-l-2 ${msg.ok ? 'bg-regularFundo border-regular text-regular' : 'bg-criticoFundo border-critico text-critico'}`}>{msg.texto}</p>
        )}

        <div className="flex justify-end print:hidden">
          <button onClick={() => window.print()} title="Abre a tela de impressão do navegador para salvar o extrato do mês em PDF" className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] bg-navy text-white text-sm rounded hover:bg-navy/90">
            <Printer size={16} /> Baixar extrato do mês em PDF
          </button>
        </div>
      </div>
    </Layout>
  )
}
