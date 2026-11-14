import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useBaixado } from '@/hooks/useBaixado'
import Vazio from '@/components/Vazio'
import { FunctionRegion } from '@supabase/supabase-js'
import { mensagemAmigavel } from '@/lib/erros'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { Radar, Trash2, RefreshCw, History } from 'lucide-react'
import { variacoesNome, filtrarNovidades, processosNovos } from '@/lib/escritorio/carteira'
import { formatarCnj } from '@/lib/escritorio/importarProcessos'
import { hojeLocal, isoLocal } from '@/lib/datas'
import { irParaCampo } from '@/lib/foco'
import { meuAlcance, podeVer, ALCANCE_FECHADO, rotuloCargo, type Alcance } from '@/lib/hierarquia'

// Passo 22: linha do tempo dos andamentos (DataJud) por processo, com filtro por período.
type Mov = { data: string; nome: string }
type Linha = { numero: string; tribunal: string | null; encontrado: boolean; classe?: string; orgao?: string; movs: Mov[] }

// Monitoramento de processos e de nomes (como o do Escavador), com fontes públicas do CNJ.
// O robô verifica todo dia às 7h30 (Brasília); o botão verifica na hora.
type Mon = { id: string; tipo: 'processo' | 'nome'; valor: string; rotulo: string | null; ultimo_estado: { classe?: string; orgao?: string; encontrado?: boolean } | null
  novidades: { data: string; texto: string; vista_em: string }[]; verificado_em: string | null; novidade_em: string | null; criado_por?: string | null }
const dt = (d?: string | null) => (d ? new Date(d.length === 10 ? `${d}T12:00` : d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: d.length === 10 ? undefined : 'short' }) : 'ainda não')

export default function MonitoramentoPage() {
  const [tudo, setTudo] = useState<Mon[]>([])
  // Privacidade por advogado: o processo monitorado segue o dono do caso; o nome monitorado, quem o cadastrou.
  // Enquanto não se sabe quem olha, vale o alcance mais estreito: esconder incomoda, mostrar vaza o caso do colega.
  const [alcance, setAlcance] = useState<Alcance | null>(null)
  const alc = alcance ?? ALCANCE_FECHADO
  useEffect(() => { meuAlcance().then(setAlcance).catch(() => setAlcance(ALCANCE_FECHADO)) }, [])
  const [donoPorProcesso, setDonoPorProcesso] = useState<Map<string, string | null>>(new Map())
  const [tipo, setTipo] = useState<'processo' | 'nome'>('processo')
  const [valor, setValor] = useState(() => { try { return localStorage.getItem('lsm-mon-valor') ?? '' } catch { return '' } }) // Passo 188
  const [rotulo, setRotulo] = useState('')
  const [msg, setMsg] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [numeroLinha, setNumeroLinha] = useState('')
  const [linha, setLinha] = useState<Linha | null>(null)
  const [msgLinha, setMsgLinha] = useState('')
  const [de, setDe] = useState(() => isoLocal(new Date(Date.now() - 365 * 86400000)))
  const [ate, setAte] = useState(() => hojeLocal())
  const linhaDoTempo = async (numero: string) => {
    const n = numero.replace(/\D/g, '')
    if (n.length !== 20) return setMsgLinha('O número do processo precisa ter 20 dígitos (padrão CNJ).')
    setMsgLinha('Consultando o DataJud…'); setLinha(null); setNumeroLinha(numero)
    const { data, error } = await supabase.functions.invoke('monitorar', { body: { linha_do_tempo: n }, region: FunctionRegion.SaEast1 })
    if (error || data?.erro) return setMsgLinha(`Não foi possível consultar: ${data?.erro ?? error?.message}`)
    setLinha(data as Linha); setMsgLinha(data.encontrado ? '' : 'Processo não encontrado no DataJud (pode ser sigiloso ou de tribunal fora da base).')
  }
  // A Carteira abre /monitoramento?lt=<número> e a linha do tempo já é consultada.
  const [params] = useSearchParams()
  const ltParam = params.get('lt') ?? ''
  useEffect(() => {
    if (ltParam.replace(/\D/g, '').length === 20) linhaDoTempo(ltParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ltParam])
  // Passo 92: busca por texto nos andamentos e cópia da linha do tempo filtrada.
  const [textoMov, setTextoMov] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [linkCopiado, setLinkCopiado] = useState(false) // Passo 272
  const [baixado, marcarBaixado] = useBaixado() // Passo 402
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const movsFiltrados = (linha?.movs ?? []).filter(m => { const d = m.data.slice(0, 10); return (!de || d >= de) && (!ate || d <= ate) && (!textoMov || norm(m.nome).includes(norm(textoMov))) })
  const copiarLinha = async () => {
    if (!linha) return
    const texto = [`Processo ${linha.numero}${linha.classe ? ` — ${linha.classe}` : ''}${linha.orgao ? ` — ${linha.orgao}` : ''}`, `${movsFiltrados.length} andamento(s) de ${dt(de)} a ${dt(ate)}${textoMov ? ` com "${textoMov}"` : ''}`, '',
      ...movsFiltrados.map(m => `${dt(m.data)} — ${m.nome}`), '', 'Fonte: DataJud (CNJ)'].join('\n')
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 2500) } catch { setMsgLinha('Não foi possível copiar; selecione o texto e copie à mão.') }
  }
  // Como no Escavador: variações de grafia do nome, filtros "contém / não contém" e aviso de processo novo fora da carteira.
  const [comVariacoes, setComVariacoes] = useState(true)
  const lerFiltro = (k: string) => { try { return localStorage.getItem(k) ?? '' } catch { return '' } }
  const [contem, setContem] = useState(() => lerFiltro('lsm-mon-contem'))
  const [naoContem, setNaoContem] = useState(() => lerFiltro('lsm-mon-nao-contem'))
  const guardarFiltro = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* sem memória local */ } }
  const [carteira, setCarteira] = useState<Set<string>>(new Set())
  const carregarCarteira = async () => {
    try {
      const { data } = await supabase.from('tarefas').select('numero_processo,responsavel_id').order('criado_em')
      const casos = (data ?? []) as { numero_processo: string | null; responsavel_id: string | null }[]
      setDonoPorProcesso(new Map(casos.map(t => [String(t.numero_processo ?? '').replace(/\D/g, ''), t.responsavel_id])))
      setCarteira(new Set(casos.filter(t => podeVer(alc, t.responsavel_id)).map(t => String(t.numero_processo ?? '').replace(/\D/g, '')).filter(n => n.length === 20)))
    } catch { /* sem carteira: não marca processos novos */ }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregarCarteira() }, [alc.id, alc.veTudo])
  const criarCaso = async (numero: string, m: Mon) => {
    const { error } = await supabase.from('tarefas').insert({ titulo: `Processo novo · ${m.rotulo || m.valor}`.slice(0, 200), nivel: 'projeto', tipo: 'caso', numero_processo: formatarCnj(numero), cliente: m.rotulo || null, situacao: 'a_fazer', prioridade: 'alta', descricao: `Achado pelo monitoramento do nome ${m.valor} em ${new Date().toLocaleDateString('pt-BR')}.` }).select('id').single()
    if (error) return setMsg(mensagemAmigavel(error))
    setMsg(`Processo ${formatarCnj(numero)} incluído na carteira.`); carregarCarteira()
  }
  const carregar = async () => {
    const { data } = await supabase.from('monitoramentos').select('id,tipo,valor,rotulo,ultimo_estado,novidades,verificado_em,novidade_em,criado_por').order('novidade_em', { ascending: false, nullsFirst: false })
    setTudo((data ?? []) as Mon[])
  }
  useEffect(() => { carregar() }, [])
  // Processo monitorado: vale o dono do caso daquele número (processo que ainda não é caso de ninguém aparece
  // para todos). Nome monitorado: vale quem o cadastrou (monitoramento sem autor aparece para todos).
  const lista = alc.veTudo ? tudo : tudo.filter(m => {
    if (m.tipo !== 'processo') return podeVer(alc, m.criado_por ?? null)
    const dono = donoPorProcesso.get(String(m.valor ?? '').replace(/\D/g, ''))
    return (!dono || dono === alc.id) && podeVer(alc, m.criado_por ?? null)
  })
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
    let extras = 0
    if (tipo === 'nome' && comVariacoes) {
      for (const variacao of variacoesNome(v).filter(x => x !== v.toUpperCase())) {
        const r = await supabase.from('monitoramentos').insert({ tipo: 'nome', valor: variacao, rotulo: `${rotulo.trim() || v.toUpperCase()} (variação)`.slice(0, 120) }).select('id').single()
        if (!r.error) extras++
      }
    }
    setValor(''); setRotulo('')
    await verificar(data!.id)
    if (extras) setMsg(m => `${m} Também monitorando ${extras} variação(ões) de grafia do nome.`)
  }
  const remover = async (id: string) => {
    if (!window.confirm('Parar de monitorar este item? O histórico de novidades dele some.')) return
    const r = await supabase.from('monitoramentos').delete().eq('id', id)
    if (r?.error) setMsg(mensagemAmigavel(r.error))
    carregar()
  }
  // Passo D15: novidades vistas saem da lista e de Meu dia; casos com número CNJ entram sozinhos.
  const marcarVistas = async (id: string) => {
    const r = await supabase.from('monitoramentos').update({ novidades: [], novidade_em: null }).eq('id', id)
    if (r?.error) setMsg(mensagemAmigavel(r.error))
    carregar()
  }
  const trazerCasos = async () => {
    setOcupado(true)
    const { data, error } = await supabase.functions.invoke('monitorar', { body: { sincronizar: true }, region: FunctionRegion.SaEast1 })
    setOcupado(false)
    if (error) return setMsg(mensagemAmigavel(error))
    const n = Number((data as { sincronizados?: number })?.sincronizados ?? 0)
    setMsg(n ? `${n} processo(s) dos casos entraram no monitoramento.` : 'Todos os processos dos casos já estão monitorados.'); carregar()
  }
  return (
    <Layout title="Monitoramento de processos">
      <div className="space-y-5">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-5">
          <p className="text-sm mb-3">Acompanhe processos pelo número e nomes de clientes ou contrapartes. Todo dia às 7h30 o robô verifica o CNJ e mostra o que mudou. Grátis, sem Escavador.</p>
          <div role="radiogroup" className="flex gap-2 mb-3">
            {(['processo', 'nome'] as const).map(t => <button key={t} type="button" role="radio" aria-checked={tipo === t} onClick={() => setTipo(t)} title={t === 'processo' ? 'Escolhe monitorar um processo pelo número CNJ' : 'Escolhe monitorar um nome de cliente ou contraparte no Diário de Justiça'} className={`min-h-[44px] px-4 text-sm border ${tipo === t ? 'bg-navy text-white' : ''}`}>{t === 'processo' ? 'Processo (número)' : 'Nome de parte'}</button>)}
          </div>
          <div className="grid gap-2 md:grid-cols-6">
            <input value={valor} onChange={e => { setValor(e.target.value); try { localStorage.setItem('lsm-mon-valor', e.target.value) } catch { /* sem memória local */ } }} placeholder={tipo === 'processo' ? '0000000-00.0000.8.19.0000' : 'Nome completo ou razão social'} className="border px-3 py-2 md:col-span-2" aria-label="Valor a monitorar" data-testid="mon-valor" />
            <input value={rotulo} onChange={e => setRotulo(e.target.value)} placeholder="Apelido (opcional)" className="border px-3 py-2 md:col-span-2" aria-label="Apelido" />
            <button type="button" onClick={trazerCasos} disabled={ocupado} title="Coloca no monitoramento, de uma vez, todos os processos dos casos que ainda não estão monitorados" data-testid="mon-trazer-casos" className="min-h-[44px] border border-navy/20 text-navy text-sm px-3 disabled:opacity-50">Trazer processos dos casos</button>
            <button type="button" onClick={adicionar} disabled={ocupado} title="Adiciona o processo ou nome ao monitoramento diário e já faz a primeira verificação" data-testid="mon-adicionar" className="min-h-[44px] bg-navy text-white text-sm uppercase tracking-wider disabled:opacity-50">Monitorar</button>
          </div>
          {tipo === 'nome' && <label className="mt-2 text-sm inline-flex items-center gap-2"><input type="checkbox" title="O CNJ grava o nome de jeitos diferentes. Marcado, a plataforma procura também sem acento, sem da/de/dos e abreviado, para não perder andamento." checked={comVariacoes} onChange={e => setComVariacoes(e.target.checked)} data-testid="mon-variacoes" /> Monitorar também as variações de grafia{valor.trim().length >= 4 && variacoesNome(valor).length > 1 ? `: ${variacoesNome(valor).filter(x => x !== valor.trim().toUpperCase()).join(' · ')}` : ' (sem acento, sem "da/de/dos", abreviado)'}</label>}
          <div className="grid gap-2 md:grid-cols-2 mt-3 text-sm">
            <label>Mostrar só novidades que contêm<input title="Deixa passar só as novidades cujo texto tenha alguma destas palavras. Separe por vírgula. Vazio, mostra todas." value={contem} onChange={e => { setContem(e.target.value); guardarFiltro('lsm-mon-contem', e.target.value) }} placeholder="ex.: TJRJ, citação" className="border px-3 py-2 w-full min-h-[44px]" data-testid="mon-contem" /></label>
            <label>Esconder novidades que contêm<input title="Tira da lista as novidades cujo texto tenha alguma destas palavras, para o ruído não encobrir o que importa. Separe por vírgula." value={naoContem} onChange={e => { setNaoContem(e.target.value); guardarFiltro('lsm-mon-nao-contem', e.target.value) }} placeholder="ex.: edital, leilão" className="border px-3 py-2 w-full min-h-[44px]" data-testid="mon-nao-contem" /></label>
          </div>
          <button type="button" onClick={() => verificar()} title="Verifica agora todos os itens monitorados nas fontes do CNJ, sem esperar a verificação diária" disabled={ocupado || !lista.length} className="mt-3 min-h-[44px] px-4 border text-sm inline-flex items-center gap-2 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${ocupado ? 'animate-spin' : ''}`} aria-hidden />Verificar tudo agora</button>
          {msg && <p role="status" className="mt-3 text-sm" data-testid="mon-msg">{msg}</p>}
          {!alc.veTudo && (
            <p className="mt-3 bg-white border-l-2 border-dourado p-3 text-sm" data-testid="monitoramento-alcance" title="A hierarquia é definida pela administração na tela Equipe.">
              Você está vendo <strong>o monitoramento dos seus casos</strong> ({rotuloCargo[alc.cargo ?? 'nenhum']}). Processo que ainda não é caso de ninguém aparece para todos; sócios e o gestor veem o escritório inteiro.
            </p>
          )}
          {/* Passo 122: lista do que está monitorado em texto (tipo, valor, rótulo, classe e órgão), para conferência. */}
          {/* Passo 154: imprimir a lista de monitoramentos e a linha do tempo. */}
          {lista.length > 0 && <button type="button" title="Abre a janela de impressão do navegador para imprimir a lista de monitoramentos" data-testid="mon-imprimir" onClick={() => window.print()} className="mt-3 mr-3 underline text-navy text-sm print:hidden">imprimir</button>}
          {lista.length > 0 && <button type="button" title="Copia o endereço desta página de monitoramento para compartilhar com a equipe" data-testid="copiar-link-monitoramento" onClick={() => navigator.clipboard?.writeText(window.location.href).then(() => setLinkCopiado(true)).catch(() => undefined)} className="mt-3 mr-3 underline text-navy text-sm print:hidden">{linkCopiado ? 'link copiado' : 'copiar link'}</button>}{/* Passo 234 */}
          {lista.length > 0 && <button type="button" title="Baixa a planilha CSV com tudo o que está monitorado (tipo, valor, rótulo e datas de verificação)" data-testid="baixar-monitoramento" aria-live="polite" onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([['tipo;valor;rótulo;verificado em;última novidade;novidades', ...lista.map(m => `${m.tipo};${m.valor};${m.rotulo ?? ''};${m.verificado_em ?? ''};${m.novidade_em ?? ''};${m.novidades.length}`)].join('\n')], { type: 'text/plain;charset=utf-8' })); a.download = 'monitoramento.csv'; a.click(); marcarBaixado(); setTimeout(() => URL.revokeObjectURL(a.href), 2000) }} className="ml-2 underline text-navy text-sm print:hidden">{baixado ? 'baixado' : 'baixar CSV'}</button>}{/* Passo 303 */}
          {lista.length > 0 && <button type="button" title="Copia a lista do que está monitorado em texto (tipo, valor, rótulo, classe e órgão) para conferência" data-testid="mon-copiar" onClick={() => navigator.clipboard?.writeText(`Monitoramentos · ${new Date().toLocaleDateString('pt-BR')} · ${lista.length}\n` + lista.map(m => `${m.tipo === 'processo' ? 'Processo' : 'Nome'} · ${m.valor}${m.rotulo ? ' · ' + m.rotulo : ''}${m.ultimo_estado?.classe ? ' · ' + m.ultimo_estado.classe : ''}${m.ultimo_estado?.orgao ? ' · ' + m.ultimo_estado.orgao : ''}`).join('\n')).catch(() => undefined)} className="mt-3 min-h-[44px] px-4 border border-navy/20 text-navy text-sm">Copiar monitorados</button>}
        </section>
        <section className="bg-white shadow-sm p-5" data-testid="linha-do-tempo">
          <h2 className="font-serif text-lg flex items-center gap-2"><History className="w-5 h-5" aria-hidden />Linha do tempo do processo (DataJud)</h2>
          <div className="flex flex-wrap items-end gap-3 mt-2 text-sm">
            <label className="flex-1 min-w-[240px]">Número CNJ<input title="O número do processo no padrão do CNJ, com pontos e traço. É por ele que o DataJud encontra os andamentos." value={numeroLinha} onChange={e => setNumeroLinha(e.target.value)} placeholder="0000000-00.0000.0.00.0000" className="border px-3 py-2 w-full min-h-[44px]" data-testid="lt-numero" /></label>
            <label>De<input type="date" title="Começo do período da linha do tempo. Vazio, mostra desde o primeiro andamento." value={de} onChange={e => setDe(e.target.value)} className="border px-3 py-2 block min-h-[44px]" data-testid="lt-de" /></label>
            <label>Até<input type="date" title="Fim do período da linha do tempo. Vazio, mostra até o andamento mais recente." value={ate} onChange={e => setAte(e.target.value)} className="border px-3 py-2 block min-h-[44px]" data-testid="lt-ate" /></label>
            <button type="button" onClick={() => linhaDoTempo(numeroLinha)} title="Consulta no DataJud (CNJ) todos os andamentos deste processo e mostra a linha do tempo no período escolhido" className="min-h-[44px] px-4 bg-navy text-white text-sm" data-testid="lt-consultar">Ver linha do tempo</button>
          </div>
          {msgLinha && <p role="status" className="mt-2 text-sm" data-testid="lt-msg">{msgLinha}</p>}
          {linha?.encontrado && (
            <div className="mt-3">
              <p className="text-sm text-grafite-claro">{[linha.classe, linha.orgao].filter(Boolean).join(' · ')} · {linha.movs.length} andamentos no total, <strong data-testid="lt-total">{movsFiltrados.length}</strong> no período.</p>
              <div className="flex flex-wrap gap-2 mt-2 print:hidden">
                <input value={textoMov} onChange={e => setTextoMov(e.target.value)} placeholder="Procurar nos andamentos (ex.: sentença, citação)" aria-label="Procurar nos andamentos" data-testid="lt-busca" className="border px-3 py-2 min-h-[44px] flex-1 min-w-[220px]" />
                <button type="button" onClick={copiarLinha} title="Copia a linha do tempo filtrada em texto (data e andamento) para colar em relatório ou e-mail" data-testid="lt-copiar" className="min-h-[44px] px-4 border border-navy text-navy text-sm">{copiado ? 'Linha do tempo copiada' : 'Copiar linha do tempo'}</button>
              </div>
              <ol className="mt-2 border-l-2 border-dourado/60 pl-4 space-y-2 text-sm" data-testid="lt-lista">
                {movsFiltrados.slice(0, 200).map((m, i) => (
                  <li key={i} className="relative" data-testid="lt-mov"><span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-dourado" aria-hidden /><span className="text-grafite-claro w-28 inline-block">{dt(m.data)}</span>{m.nome}</li>
                ))}
                {!movsFiltrados.length && <li><Vazio titulo="Nenhum andamento no período" texto="Nada saiu no tribunal entre as datas escolhidas. Amplie o período para ver mais andamentos." acao={{ rotulo: 'Mudar o período', onClick: () => irParaCampo('[data-testid="lt-de"]'), dica: 'Leva o cursor à data inicial do período da linha do tempo' }} /></li>}
              </ol>
              <p className="text-xs text-grafite-claro mt-2">Fonte: API pública do DataJud (CNJ). Os andamentos seguem a Tabela Processual Unificada e podem chegar com atraso em relação ao sistema do tribunal.</p>
            </div>
          )}
        </section>
        {lista.map(m => (
          <section key={m.id} className="bg-white shadow-sm p-5" data-testid="mon-item">
            <div className="flex items-start gap-3">
              <Radar className="w-5 h-5 text-dourado mt-1" aria-hidden />
              <div className="flex-1">
                <p className="font-medium">{m.rotulo ? `${m.rotulo} · ` : ''}<span className="font-mono">{m.valor}</span></p>
                <p className="text-xs text-grafite-claro">{m.tipo === 'processo' ? (m.ultimo_estado?.encontrado === false ? 'Não encontrado no DataJud' : [m.ultimo_estado?.classe, m.ultimo_estado?.orgao].filter(Boolean).join(' · ')) : 'Nome monitorado no Diário de Justiça Eletrônico Nacional'} · verificado {dt(m.verificado_em)}</p>
                {m.novidades.length > 0 && <button type="button" onClick={() => marcarVistas(m.id)} title="Marca as novidades deste item como vistas; elas saem desta lista e de Meu dia" className="mt-2 text-xs underline text-navy" data-testid="mon-vistas">Marcar como vistas</button>}
                {(() => {
                  const visiveis = filtrarNovidades(m.novidades, contem, naoContem)
                  if (!m.novidades.length) return <p className="text-sm text-grafite-claro mt-2">Sem novidades desde que começou o monitoramento.</p>
                  if (!visiveis.length) return <p className="text-sm text-grafite-claro mt-2" data-testid="mon-filtradas">{m.novidades.length} novidade(s) escondida(s) pelos filtros.</p>
                  return <ul className="mt-2 text-sm space-y-1">{visiveis.slice(0, 8).map((n, i) => {
                    const novos = m.tipo === 'nome' ? processosNovos(n.texto, carteira) : []
                    return <li key={i}><span className="text-xs bg-dourado/20 px-1">novo</span> {dt(n.data)} · {n.texto}
                      {novos.map(p => <span key={p} className="block text-xs mt-0.5" data-testid="mon-processo-novo"><strong className="text-critico">Processo fora da carteira</strong> {formatarCnj(p)} · <button type="button" onClick={() => criarCaso(p, m)} title="Cria um caso na carteira com este processo encontrado pelo monitoramento do nome" className="underline text-navy">incluir como caso</button></span>)}</li>
                  })}{visiveis.length < m.novidades.length && <li className="text-xs text-grafite-claro">{m.novidades.length - visiveis.length} escondida(s) pelos filtros</li>}</ul>
                })()}
              </div>
              {m.tipo === 'processo' && <button type="button" onClick={() => { linhaDoTempo(m.valor); window.scrollTo({ top: 0, behavior: 'smooth' }) }} aria-label="Ver linha do tempo" title="Consulta a linha do tempo deste processo no DataJud e rola a página até ela" className="p-2" data-testid="lt-abrir"><History className="w-4 h-4" aria-hidden /></button>}
              <button type="button" onClick={() => verificar(m.id)} disabled={ocupado} aria-label="Verificar este agora" title="Verifica só este item agora nas fontes do CNJ" className="p-2"><RefreshCw className="w-4 h-4" aria-hidden /></button>
              <button type="button" onClick={() => remover(m.id)} aria-label="Parar de monitorar" title="Para de monitorar este item e apaga o histórico de novidades dele (pede confirmação)" className="p-2"><Trash2 className="w-4 h-4" aria-hidden /></button>
            </div>
          </section>
        ))}
      </div>
    </Layout>
  )
}
