import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FunctionRegion } from '@supabase/supabase-js'
import { AlertTriangle, CalendarPlus, CheckCircle2, Download, FileText, Search, Square, EyeOff, Upload, FolderPlus } from 'lucide-react'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { mensagemAmigavel } from '@/lib/erros'
import { hojeLocal } from '@/lib/datas'
import { br, somarDias } from '@/lib/ferramentas/base'
import { blocos, POLO, type Publicacao } from '@/lib/pesquisa/fontesOficiais'
import { lerTodas, csvDosPrazos, linhaDoPrazo, ROTULO_URGENCIA, type PrazoLido, type Urgencia } from '@/lib/escritorio/lerIntimacao'
import { rotuloPrazo, CODIGOS, type Codigo } from '@/lib/prazos/codigos'
import { analisarPlanilha, analisarResultados, importavel, paraCaso, type LinhaImportacao } from '@/lib/escritorio/importarProcessos'
import { xlsxParaTexto } from '@/lib/escritorio/lerXlsx'
import RoboCnj from '@/components/RoboCnj'
import AbasProcessosAntigos from '@/components/AbasProcessosAntigos'

// Inserir processos antigos (inclusive os de quem saiu do escritório), numa tela só:
// 1) a planilha (Excel ou CSV), os números colados ou os já cadastrados; 2) o nome e a OAB do advogado;
// 3) a busca no CNJ, que mostra em ordem o que fazer e até quando (prazo pelo código de cada ramo).
// Embaixo, o robô que repete tudo sozinho a cada 4 horas e escreve as peças 7 dias antes.
const CHAVE = 'lsm-assumir-v1'
// Pedido do M (12/11/2026): o espaço de trabalho desta tela é de cada pessoa, não de todo mundo.
// A chave ganha o id do usuário logado; num computador compartilhado, cada um vê só o seu.
let chaveAtual = CHAVE
type Capa = { numero: string; achou: boolean; ultimo?: string; quando?: string }
type Salvo = { nome: string; oab: string; numeros: string; meses: number; pubs: Publicacao[]; capas: Capa[]; quando: string | null; ocultos: string[]; agendados: string[] }
const VAZIO: Salvo = { nome: '', oab: '', numeros: '', meses: 3, pubs: [], capas: [], quando: null, ocultos: [], agendados: [] }
const ler = (): Salvo => { try { return { ...VAZIO, ...JSON.parse(localStorage.getItem(chaveAtual) || '{}') } } catch { return VAZIO } }
const gravar = (s: Salvo) => {
  try { localStorage.setItem(chaveAtual, JSON.stringify({ ...s, pubs: s.pubs.map(p => ({ ...p, texto: p.texto.slice(0, 4000) })) })) } catch { /* memória do navegador cheia ou bloqueada */ }
}

const mascara = (d: string) => `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16, 20)}`
/** Tira os números de processo (20 dígitos) de qualquer texto colado. */
export function numerosDoTexto(t: string): string[] {
  const achados = t.match(/\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}/g) ?? []
  return [...new Set(achados.map(x => x.replace(/\D/g, '')).filter(x => x.length === 20))].map(mascara)
}

async function chamar(body: object): Promise<any> {
  const { data, error } = await supabase.functions.invoke('fontes-oficiais', { body, region: FunctionRegion.SaEast1 })
  if (error) {
    const corpo = await (error as { context?: Response }).context?.json?.().catch(() => null)
    throw new Error(corpo?.erro ?? mensagemAmigavel(error))
  }
  if (data?.erro) throw new Error(data.erro)
  return data
}

const COR: Record<Urgencia, string> = {
  vencido: 'border-critico bg-criticoFundo', urgente: 'border-atencao bg-atencaoFundo', breve: 'border-dourado bg-white', depois: 'border-navy/20 bg-white', ler: 'border-navy/20 bg-white',
}
const Passo = ({ n, titulo, children, feito }: { n: number; titulo: string; children: React.ReactNode; feito?: boolean }) => (
  <section className="bg-white shadow-sm p-5 md:p-6 flex gap-4" aria-label={`Passo ${n}: ${titulo}`}>
    <span className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold ${feito ? 'bg-dourado text-white' : 'bg-navy text-white'}`} aria-hidden>{feito ? '✓' : n}</span>
    <div className="flex-1 min-w-0"><h2 className="font-serif text-xl mb-2">{titulo}</h2>{children}</div>
  </section>
)

export default function AssumirProcessosPage() {
  const [s, setS] = useState<Salvo>(ler)
  const [ocupado, setOcupado] = useState(false)
  const [progresso, setProgresso] = useState({ feito: 0, total: 0, texto: '' })
  const [erro, setErro] = useState('')
  const [avisos, setAvisos] = useState<string[]>([])
  const [filtro, setFiltro] = useState<Urgencia | 'todos'>('todos')
  // Pedido do M (12/11/2026): nada de lista única misturada — separar por tipo de direito.
  const [ramo, setRamo] = useState<Codigo | 'todos'>('todos')
  const [aviso, setAviso] = useState('')
  const [casosCadastrados, setCasosCadastrados] = useState<string[] | null>(null)
  // Privacidade por advogado: tudo que esta tela cria nasce no nome de quem está assumindo os processos.
  const [eu, setEu] = useState('')
  const [planilha, setPlanilha] = useState<{ nome: string; linhas: LinhaImportacao[] } | null>(null)
  const [cadastro, setCadastro] = useState('')
  const parar = useRef(false)
  const hoje = hojeLocal()
  const mudar = (p: Partial<Salvo>) => setS(atual => { const n = { ...atual, ...p }; gravar(n); return n })

  const carregarCadastrados = async () => {
    const { data } = await supabase.from('tarefas').select('numero_processo').eq('nivel', 'projeto').not('numero_processo', 'is', null)
    const nums = numerosDoTexto(((data ?? []) as { numero_processo: string | null }[]).map(c => c.numero_processo ?? '').join('\n'))
    setCasosCadastrados(nums); return nums
  }
  useEffect(() => { carregarCadastrados().catch(() => setCasosCadastrados([])) }, [])
  // Espaço privado: ao saber quem está logado, passa a ler e gravar na chave dessa pessoa.
  useEffect(() => {
    supabase.auth?.getUser?.().then(({ data }) => {
      const id = data?.user?.id
      if (!id) return
      setEu(id)
      const minha = `${CHAVE}:${id}`
      const migrar = chaveAtual === CHAVE && !localStorage.getItem(minha) && localStorage.getItem(CHAVE)
      chaveAtual = minha
      try {
        if (migrar) localStorage.setItem(minha, localStorage.getItem(CHAVE)!) // traz o rascunho antigo uma única vez
        setS(ler())
      } catch { /* sem armazenamento */ }
    }).catch(() => undefined)
  }, [])

  /** Planilha do Excel (.xlsx) ou CSV: lê no navegador e mostra quantos são novos antes de gravar. */
  const lerPlanilha = async (f: File | undefined) => {
    if (!f) return
    setCadastro(''); setErro('')
    try {
      const texto = /\.xlsx$/i.test(f.name) ? await xlsxParaTexto(await f.arrayBuffer()) : /\.xls$/i.test(f.name) ? (() => { throw new Error('Esse é o formato antigo do Excel (.xls). Abra no Excel e salve como .xlsx, ou copie as células e cole no quadro.') })() : await f.text()
      const r = analisarPlanilha(texto, (casosCadastrados ?? []).map(n => n.replace(/\D/g, '')))
      if (r.erro) throw new Error(r.erro)
      setPlanilha({ nome: f.name, linhas: r.linhas })
      mudar({ numeros: numerosDoTexto(r.linhas.map(l => l.formatado || l.numero).join('\n')).join('\n') })
    } catch (e) { setErro(e instanceof Error ? e.message : String(e)) }
  }
  /** Grava os casos novos (um por processo) e põe no monitoramento diário. */
  const cadastrar = async (linhas: LinhaImportacao[], origem: string) => {
    const novos = linhas.filter(importavel)
    if (!novos.length) return setCadastro('Todos já estão cadastrados.')
    setCadastro(`Cadastrando ${novos.length} processo(s)…`)
    const casos = novos.map(l => paraCaso(l, origem, eu || null))
    let gravados = 0
    const falhas: string[] = []
    for (let i = 0; i < casos.length; i += 50) {
      const { error } = await supabase.from('tarefas').insert(casos.slice(i, i + 50))
      if (error) falhas.push(mensagemAmigavel(error)); else gravados += Math.min(50, casos.length - i)
    }
    const mons = casos.filter(c => c.numero_processo).map(c => ({ tipo: 'processo', valor: c.numero_processo!.replace(/\D/g, ''), rotulo: c.titulo.slice(0, 120) }))
    if (gravados && mons.length) await supabase.from('monitoramentos').upsert(mons, { onConflict: 'tipo,valor', ignoreDuplicates: true })
    await carregarCadastrados()
    setPlanilha(p => (p ? { ...p, linhas: p.linhas.map(l => (importavel(l) && !falhas.length ? { ...l, situacao: 'ja_cadastrado' as const } : l)) } : p))
    setCadastro(falhas.length ? `${gravados} cadastrado(s); falhou: ${falhas[0]}` : `${gravados} processo(s) cadastrado(s). Já aparecem em Casos e na Carteira de processos.`)
  }

  const numeros = useMemo(() => numerosDoTexto(s.numeros), [s.numeros])
  const prazos = useMemo(() => lerTodas(s.pubs, hoje).filter(l => !s.ocultos.includes(l.chave)), [s.pubs, s.ocultos, hoje])
  const conta = useMemo(() => { const c: Record<string, number> = {}; for (const l of prazos) c[l.urgencia] = (c[l.urgencia] ?? 0) + 1; return c }, [prazos])
  const porRamo = useMemo(() => { const c: Partial<Record<Codigo, number>> = {}; for (const l of prazos) c[l.codigo] = (c[l.codigo] ?? 0) + 1; return c }, [prazos])
  const visiveis = prazos.filter(l => (filtro === 'todos' || l.urgencia === filtro) && (ramo === 'todos' || l.codigo === ramo))
  // Agrupa por tipo de direito, mantendo dentro de cada grupo a ordem de urgência da lista.
  const grupos = useMemo(() => {
    const m = new Map<Codigo, PrazoLido[]>()
    for (const l of visiveis) { const g = m.get(l.codigo) ?? []; g.push(l); m.set(l.codigo, g) }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [visiveis])
  const comPublicacao = useMemo(() => new Set(s.pubs.map(p => p.numero.replace(/\D/g, ''))), [s.pubs])
  const semNovidade = s.capas.filter(c => !comPublicacao.has(c.numero.replace(/\D/g, '')))
  const podeBuscar = s.nome.replace(/[^A-Za-zÀ-ÿ]/g, '').length >= 4 || numeros.length > 0 || /\d{1,7}\/[A-Za-z]{2}/.test(s.oab)
  const cadastradosSet = useMemo(() => new Set((casosCadastrados ?? []).map(n => n.replace(/\D/g, ''))), [casosCadastrados])
  const achadosFora = useMemo(() => { const m = new Map<string, Publicacao>(); for (const p of s.pubs) { const d = p.numero.replace(/\D/g, ''); if (d.length === 20 && !cadastradosSet.has(d) && !m.has(d)) m.set(d, p) } return [...m.values()] }, [s.pubs, cadastradosSet])

  const buscar = async () => {
    parar.current = false; setOcupado(true); setErro(''); setAviso('')
    const av: string[] = []
    const janelas = blocos(s.meses, new Date(), 90)
    const desde = janelas[janelas.length - 1].inicio
    const tarefas: { rotulo: string; corpo: object; processo?: string }[] = []
    const nomes = s.nome.split(/[,;\n]+/).map(n => n.trim()).filter(n => n.replace(/[^A-Za-zÀ-ÿ]/g, '').length >= 4)
    const oabsLista = s.oab.split(/[,;\s]+/).map(o => o.replace(/\./g, '')).filter(o => /^\d{1,7}\/[A-Za-z]{2}$/.test(o))
    for (const nome of nomes) for (const j of janelas) tarefas.push({ rotulo: `Intimações em nome de ${nome} (${br(j.inicio)} a ${br(j.fim)})`, corpo: { tipo: 'advogado', termo: nome, ...j } })
    for (const oab of oabsLista) for (const j of janelas) tarefas.push({ rotulo: `Intimações da OAB ${oab} (${br(j.inicio)} a ${br(j.fim)})`, corpo: { tipo: 'oab', termo: oab, ...j } })
    // Por número: com até 3 meses, só a janela; com mais, todas as publicações do processo (filtradas depois pela data).
    for (const n of numeros) tarefas.push({ rotulo: `Processo ${n}`, processo: n, corpo: { tipo: 'processo', termo: n, ...(janelas.length === 1 ? janelas[0] : {}) } })
    const pubs: Publicacao[] = []
    const capas: Capa[] = []
    let feito = 0
    setProgresso({ feito: 0, total: tarefas.length, texto: 'Começando…' })
    const fila = [...tarefas]
    const trabalhar = async () => {
      while (fila.length && !parar.current) {
        const t = fila.shift()!
        setProgresso(p => ({ ...p, texto: t.rotulo }))
        try {
          const r = await chamar(t.corpo)
          const itens: Publicacao[] = r.comunica?.itens ?? []
          pubs.push(...itens.filter(p => p.data >= desde))
          if (r.comunica && !r.comunica.ok) av.push(`${t.rotulo}: ${r.comunica.erro}`)
          if (r.comunica?.incompleto) av.push(`${t.rotulo}: veio só uma parte das publicações (o tribunal limita). Busque um período menor.`)
          if (t.processo) {
            const mov = r.datajud?.movimentos?.[0]
            capas.push({ numero: t.processo, achou: !!r.datajud?.encontrado, ultimo: mov?.nome, quando: mov?.data })
          }
        } catch (e) { av.push(`${t.rotulo}: ${e instanceof Error ? e.message : String(e)}`) }
        feito++
        setProgresso(p => ({ ...p, feito }))
      }
    }
    await Promise.all([trabalhar(), trabalhar(), trabalhar()])
    if (parar.current) av.unshift(`Você parou a busca: ${feito} de ${tarefas.length} consultas feitas. O que já chegou está abaixo.`)
    const servidorAntigo = av.length > 0 && av.every(a => /not found|404|não encontrad|failed to send|Function not found/i.test(a))
    if (servidorAntigo) setErro('A busca no tribunal ainda não está ligada no servidor. Peça ao administrador para implantar a função "fontes-oficiais" (guia em Conectar ao CNJ).')
    setAvisos(av)
    mudar({ pubs, capas, quando: new Date().toISOString() })
    setOcupado(false)
  }

  const agendar = async (ls: PrazoLido[]) => {
    const novos = ls.filter(l => l.vence && !s.agendados.includes(l.chave))
    if (!novos.length) return setAviso('Esses prazos já estão na agenda.')
    setAviso('Pondo na agenda…')
    const { data: casos, error: e1 } = await supabase.from('tarefas').select('id,numero_processo,cliente,area').eq('nivel', 'projeto').not('numero_processo', 'is', null)
    if (e1) return setAviso(`Não consegui abrir os casos: ${mensagemAmigavel(e1)}`)
    type Caso = { id: string; numero_processo: string; cliente: string | null; area: string | null }
    const porNumero = new Map(((casos ?? []) as Caso[]).map(c => [c.numero_processo.replace(/\D/g, ''), c]))
    const feitos: string[] = []
    const falhas: string[] = []
    for (const l of novos) {
      const dig = l.publicacao.numero.replace(/\D/g, '')
      let caso = porNumero.get(dig)
      if (!caso) {
        const titulo = `Processo ${l.publicacao.numero}${l.publicacao.partes[0] ? ` · ${l.publicacao.partes.map(p => p.nome).slice(0, 2).join(' x ')}` : ''}`.slice(0, 200)
        const { data: novo, error } = await supabase.from('tarefas').insert({ titulo, nivel: 'projeto', tipo: 'caso', numero_processo: l.publicacao.numero, situacao: 'fazendo', prioridade: 'media', responsavel_id: eu || null, descricao: `Caso aberto ao assumir processos de ${s.nome || 'outro advogado'} em ${br(hoje)}.` }).select('id,numero_processo,cliente,area').single()
        if (error || !novo) { falhas.push(`${l.publicacao.numero}: ${mensagemAmigavel(error)}`); continue }
        caso = novo as Caso
        porNumero.set(dig, caso)
      }
      // Rascunho pronto uma semana antes (5 dias úteis, em geral), para dar tempo de revisar.
      const sete = somarDias(l.vence!, -7)
      const rascunho = sete > hoje ? sete : hoje
      const { error } = await supabase.from('tarefas').insert({
        titulo: `${l.oQueFazer.split('.')[0]} · ${l.publicacao.numero}`.slice(0, 200), nivel: 'tarefa', pai_id: caso!.id, prazo: l.vence, numero_processo: l.publicacao.numero,
        cliente: caso!.cliente, area: caso!.area, situacao: 'a_fazer', prioridade: l.urgencia === 'vencido' || l.urgencia === 'urgente' ? 'alta' : 'media', responsavel_id: eu || null,
        descricao: `${linhaDoPrazo(l)}\nTer o rascunho pronto até ${br(rascunho)}.\nTrecho da publicação: ${l.trecho}\nLeitura automática: confira o prazo na publicação antes de protocolar.`,
      })
      if (error) falhas.push(`${l.publicacao.numero}: ${mensagemAmigavel(error)}`); else feitos.push(l.chave)
    }
    mudar({ agendados: [...s.agendados, ...feitos] })
    setAviso(falhas.length ? `${feitos.length} na agenda; ${falhas.length} não entraram: ${falhas.slice(0, 3).join('; ')}` : `${feitos.length} prazo(s) na agenda, cada um dentro do seu processo.`)
  }

  const cadastrarAchados = () => cadastrar(analisarResultados(achadosFora.map(p => ({
    numero: p.numero, titulo: p.partes.map(x => x.nome).slice(0, 2).join(' x ') || p.classe || undefined,
    tribunal: p.tribunal ?? undefined, vara: p.orgao ?? undefined, cliente: p.partes.find(x => x.polo === 'A')?.nome,
  })), [...cadastradosSet]), 'publicações do CNJ')
  const baixar = () => {
    const url = URL.createObjectURL(new Blob(['﻿' + csvDosPrazos(prazos)], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = `prazos-${hoje}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const pedidoPeca = (l: PrazoLido) => `/assistente?modo=redigir&pedido=${encodeURIComponent(`${l.ato?.ato ?? l.oQueFazer} no processo ${l.publicacao.numero}`)}&contexto=${encodeURIComponent(`Processo ${l.publicacao.numero} (${l.publicacao.tribunal ?? ''}, ${l.publicacao.orgao ?? ''}). Partes: ${l.publicacao.partes.map(p => `${p.nome}${p.polo ? ` (${POLO[p.polo] ?? p.polo})` : ''}`).join('; ')}. Publicação de ${br(l.publicacao.data)}: ${l.publicacao.texto.slice(0, 2200)}`)}`

  return (
    <Layout title="Inserir processos antigos">
      <div className="space-y-5 max-w-4xl">
        <AbasProcessosAntigos aqui="/processos-antigos" />
        <p className="text-base">Coloque aqui os processos que o escritório já tem (inclusive os de quem saiu). Em 3 passos a plataforma cadastra, procura no CNJ tudo o que saiu para eles e mostra <strong>o que fazer e até quando</strong>, do mais urgente para o menos urgente.</p>
        <p className="text-sm">Vai trazer <strong>tudo</strong> do sistema antigo (clientes, prazos e financeiro também, em vários arquivos)? Use <Link to="/migracao" title="Abre a tela que traz o sistema antigo inteiro de uma vez: processos, clientes, prazos e financeiro" className="underline text-navy">Trazer do sistema antigo</Link>.</p>
        <p className="text-sm border-l-4 border-dourado bg-navy/5 p-3" data-testid="aviso-privacidade">
          <strong>Este espaço é só seu.</strong> O que você preenche e busca aqui fica guardado para o seu usuário, do seu jeito.
          Só o que você decidir <em>cadastrar</em> vai para a carteira do escritório — onde os sócios e o gestor enxergam o conjunto.
        </p>

        <Passo n={1} titulo="Quais processos?" feito={numeros.length > 0}>
          <label className="min-h-[52px] px-5 mb-3 bg-navy text-white text-base inline-flex items-center gap-2 cursor-pointer">
            <Upload className="w-5 h-5" aria-hidden />Enviar a planilha (Excel ou CSV)
            <input type="file" title="Escolhe a planilha com os processos antigos (Excel ou CSV). Nada é gravado antes da conferência." accept=".xlsx,.xls,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" data-testid="arquivo-planilha" onChange={e => { lerPlanilha(e.target.files?.[0]); e.target.value = '' }} />
          </label>
          {planilha && (
            <div className="mb-3 p-3 border-l-4 border-dourado bg-navy/5 text-sm" data-testid="resumo-planilha">
              <p><strong>{planilha.nome}</strong>: {planilha.linhas.length} processo(s). {planilha.linhas.filter(l => l.situacao === 'ok').length} novo(s) com número do CNJ, {planilha.linhas.filter(l => l.situacao === 'sem_numero').length} com número de outro tipo (administrativo etc.), {planilha.linhas.filter(l => l.situacao === 'ja_cadastrado').length} já cadastrado(s).</p>
              {planilha.linhas.some(importavel) && <button type="button" onClick={() => cadastrar(planilha.linhas, 'planilha')} className="mt-2 min-h-[48px] px-5 bg-dourado text-white text-base inline-flex items-center gap-2" title="Cadastra na plataforma os processos novos da planilha; nada é apagado e dá para desfazer." data-testid="cadastrar-planilha"><FolderPlus className="w-5 h-5" aria-hidden />Cadastrar os {planilha.linhas.filter(importavel).length} processo(s) novo(s)</button>}
            </div>
          )}
          {cadastro && <p className="mb-2 text-sm" role="status" data-testid="msg-cadastro">{cadastro}</p>}
          <p className="text-sm text-grafite-claro mb-2">Ou cole os números (de uma planilha, e-mail ou lista). Pode colar tudo de uma vez: a plataforma separa os números sozinha.</p>
          {casosCadastrados && casosCadastrados.length > 0 && (
            <button type="button" onClick={() => mudar({ numeros: casosCadastrados.join('\n') })} title="Preenche a caixa abaixo com os números dos processos que já estão cadastrados na plataforma" className="min-h-[44px] px-4 mb-2 border border-navy text-navy text-sm" data-testid="usar-cadastrados">
              Usar os {casosCadastrados.length} processos já cadastrados
            </button>
          )}
          <textarea value={s.numeros} onChange={e => mudar({ numeros: e.target.value })} rows={4} aria-label="Números dos processos" placeholder="0036229-32.2016.8.19.0021" className="w-full border px-3 py-2 text-sm font-mono" />
          <p className="text-sm mt-1" aria-live="polite" data-testid="contagem-numeros">{numeros.length ? `${numeros.length} número(s) pronto(s).` : 'Nenhum número ainda. Sem números, a busca usa só o nome e a OAB.'}</p>
        </Passo>

        <Passo n={2} titulo="De quem eram os processos?" feito={s.nome.trim().length >= 4}>
          <label htmlFor="nome-adv" className="block text-sm mb-1">Nome do advogado, do jeito que aparece no Diário Oficial (se forem vários, separe por vírgula)</label>
          <input id="nome-adv" value={s.nome} onChange={e => mudar({ nome: e.target.value })} placeholder="Ex.: Caio Barros" className="w-full border px-3 py-2 min-h-[44px] text-base" autoComplete="off" />
          <label htmlFor="oab-adv" className="block text-sm mt-3 mb-1">OAB (se souber; ajuda a não perder nada)</label>
          <input id="oab-adv" value={s.oab} onChange={e => mudar({ oab: e.target.value })} placeholder="Ex.: 123456/RJ" className="w-full sm:w-60 border px-3 py-2 min-h-[44px] text-base" autoComplete="off" />
        </Passo>

        <Passo n={3} titulo="Buscar no tribunal" feito={!!s.quando && !ocupado}>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="meses" className="text-sm">Olhar para trás:</label>
            <select id="meses" value={s.meses} onChange={e => mudar({ meses: Number(e.target.value) })} className="border px-3 min-h-[44px] text-base" disabled={ocupado}>
              <option value={3}>3 meses (recomendado)</option><option value={6}>6 meses</option><option value={12}>1 ano</option>
            </select>
            {!ocupado
              ? <button type="button" onClick={buscar} disabled={!podeBuscar} className="min-h-[48px] px-6 bg-navy text-white text-base inline-flex items-center gap-2 disabled:opacity-40" title="Busca cada processo no CNJ (DataJud) e mostra andamentos, prazos e intimações." data-testid="buscar-tudo"><Search className="w-5 h-5" aria-hidden />Buscar agora</button>
              : <button type="button" onClick={() => { parar.current = true }} title="Interrompe a busca no ponto em que está; o que já foi encontrado é mantido" className="min-h-[48px] px-6 border border-critico text-critico text-base inline-flex items-center gap-2" data-testid="parar"><Square className="w-4 h-4" aria-hidden />Parar</button>}
          </div>
          {!podeBuscar && <p className="text-sm text-grafite-claro mt-2">Preencha o nome (passo 1) ou cole pelo menos um número (passo 2).</p>}
          {ocupado && (
            <div className="mt-3" role="status" aria-live="polite">
              <div className="h-3 bg-navy/10 rounded overflow-hidden"><div className="h-full bg-dourado transition-all" style={{ width: `${progresso.total ? Math.round((progresso.feito / progresso.total) * 100) : 0}%` }} /></div>
              <p className="text-sm mt-1">{progresso.feito} de {progresso.total} consultas · {progresso.texto}</p>
            </div>
          )}
          {s.quando && !ocupado && <p className="text-sm text-grafite-claro mt-2">Última busca: {new Date(s.quando).toLocaleString('pt-BR')}. Busque de novo todo dia até tudo estar em dia.</p>}
          {erro && <p className="mt-3 p-3 border-l-4 border-critico bg-criticoFundo text-sm" role="alert">{erro}</p>}
          {avisos.length > 0 && (
            <details className="mt-3 text-sm"><summary className="cursor-pointer min-h-[44px] flex items-center">{avisos.length} consulta(s) com problema (toque para ver)</summary>
              <ul className="list-disc pl-5 space-y-1 text-grafite-claro">{avisos.slice(0, 50).map((a, i) => <li key={i}>{a}</li>)}</ul>
            </details>
          )}
        </Passo>

        {s.quando && (
          <section className="bg-white shadow-sm p-5 md:p-6" aria-label="O que fazer">
            <h2 className="font-serif text-2xl">O que fazer, em ordem</h2>
            {prazos.length === 0
              ? <p className="mt-2 text-base flex items-center gap-2" data-testid="nada"><CheckCircle2 className="w-5 h-5 text-dourado" aria-hidden />Nenhuma publicação no período. Veja abaixo os processos sem novidade.</p>
              : <>
                <div role="tablist" aria-label="Filtrar por urgência" className="flex flex-wrap gap-2 mt-3">
                  {(['todos', 'vencido', 'urgente', 'breve', 'depois', 'ler'] as const).map(u => {
                    const n = u === 'todos' ? prazos.length : conta[u] ?? 0
                    if (u !== 'todos' && !n) return null
                    return <button key={u} role="tab" aria-selected={filtro === u} onClick={() => setFiltro(u)} data-testid={`filtro-${u}`} title="Filtra a lista de prazos por urgência"
                      className={`min-h-[44px] px-4 text-sm border ${filtro === u ? 'bg-navy text-white border-navy' : u === 'vencido' ? 'border-critico text-critico' : u === 'urgente' ? 'border-atencao text-navy' : 'border-navy/20 text-navy'}`}>
                      {u === 'todos' ? 'Todos' : ROTULO_URGENCIA[u]} ({n})</button>
                  })}
                </div>
                {Object.keys(porRamo).length > 1 && (
                  <div role="tablist" aria-label="Filtrar por tipo de direito" className="flex flex-wrap gap-2 mt-2" data-testid="filtro-ramos">
                    {(['todos', ...Object.keys(porRamo)] as const).map(c => (
                      <button key={c} role="tab" aria-selected={ramo === c} onClick={() => setRamo(c as Codigo | 'todos')} data-testid={`ramo-filtro-${c}`} title="Mostra só os prazos deste tipo de direito"
                        className={`min-h-[44px] px-4 text-sm border ${ramo === c ? 'bg-dourado text-white border-dourado' : 'border-navy/20 text-navy'}`}>
                        {c === 'todos' ? 'Todos os ramos' : CODIGOS[c as Codigo].nome} {c !== 'todos' && `(${porRamo[c as Codigo]})`}</button>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  <button type="button" onClick={() => agendar(prazos)} className="min-h-[44px] px-4 bg-dourado text-white text-sm inline-flex items-center gap-2" title="Cria um compromisso na agenda para cada prazo encontrado." data-testid="agendar-todos"><CalendarPlus className="w-4 h-4" aria-hidden />Pôr todos os prazos na agenda</button>
                  <button type="button" onClick={baixar} title="Baixa os prazos encontrados como planilha (abre no Excel)." className="min-h-[44px] px-4 border border-navy text-navy text-sm inline-flex items-center gap-2"><Download className="w-4 h-4" aria-hidden />Baixar planilha</button>
                </div>
                {aviso && <p className="mt-2 text-sm" role="status" data-testid="aviso-agenda">{aviso}</p>}
                <div className="mt-4 space-y-5" data-testid="lista-prazos">
                  {grupos.map(([cod, itens]) => (
                  <section key={cod} data-testid={`ramo-${cod}`}>
                  <p className="text-xs uppercase tracking-wider text-dourado-escuro border-b border-navy/10 pb-1">{CODIGOS[cod].nome} ({itens.length})</p>
                  <ol className="mt-2 space-y-3">
                  {itens.map(l => (
                    <li key={l.chave} className={`border-l-4 p-4 ${COR[l.urgencia]}`} data-testid="prazo">
                      <p className="text-lg font-semibold">
                        {l.vence ? (l.urgencia === 'vencido' ? <span className="text-critico inline-flex items-center gap-1"><AlertTriangle className="w-5 h-5" aria-hidden />Venceu em {br(l.vence)} ({l.diaSemana})</span> : `Vence ${l.diaSemana}, ${br(l.vence)}`) : 'Ler e decidir'}
                      </p>
                      <p className="text-base mt-1"><strong>O que fazer:</strong> {l.oQueFazer}.</p>
                      <p className="text-sm mt-1">Processo <span className="font-mono">{l.publicacao.numero}</span>{l.publicacao.tribunal ? ` · ${l.publicacao.tribunal}` : ''}{l.publicacao.orgao ? ` · ${l.publicacao.orgao}` : ''}</p>
                      {l.publicacao.partes.length > 0 && <p className="text-sm text-grafite-claro">{l.publicacao.partes.slice(0, 4).map(p => `${p.nome}${p.polo ? ` (${POLO[p.polo] ?? p.polo})` : ''}`).join(' · ')}</p>}
                      {l.ato && <p className="text-sm text-grafite-claro">Prazo de {rotuloPrazo(l.ato)} ({l.ato.base}), contado da publicação em {br(l.publicadaEm)}.</p>}
                      {l.outra && <p className="text-sm mt-1">{l.outra}</p>}
                      {l.avisos.map((a, i) => <p key={i} className="text-sm mt-1 text-navy"><AlertTriangle className="w-4 h-4 inline mr-1 text-atencao" aria-hidden />{a}</p>)}
                      <p className="text-sm mt-2 italic text-grafite-claro">“{l.trecho}”</p>
                      {l.confianca !== 'alta' && <p className="text-xs mt-1 text-grafite-claro">Leitura automática: confira na publicação.</p>}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {l.vence && (s.agendados.includes(l.chave)
                          ? <span className="min-h-[44px] px-3 inline-flex items-center gap-1 text-sm text-dourado"><CheckCircle2 className="w-4 h-4" aria-hidden />Na agenda</span>
                          : <button type="button" onClick={() => agendar([l])} className="min-h-[44px] px-4 bg-navy text-white text-sm inline-flex items-center gap-2" title="Cria um compromisso na agenda para este prazo." data-testid="agendar"><CalendarPlus className="w-4 h-4" aria-hidden />Pôr na agenda</button>)}
                        {l.ato && <Link to={pedidoPeca(l)} className="min-h-[44px] px-4 border border-navy text-navy text-sm inline-flex items-center gap-2" title="Abre o assistente já com o pedido da peça deste ato preenchido." data-testid="escrever-peca"><FileText className="w-4 h-4" aria-hidden />Escrever a peça</Link>}
                        <button type="button" onClick={() => mudar({ ocultos: [...s.ocultos, l.chave] })} className="min-h-[44px] px-4 text-sm text-grafite-claro inline-flex items-center gap-2" title="Esconde esta linha: use quando o prazo já foi tratado fora daqui." data-testid="ocultar"><EyeOff className="w-4 h-4" aria-hidden />Já resolvido</button>
                      </div>
                      <details className="mt-2 text-sm"><summary className="cursor-pointer min-h-[44px] flex items-center text-navy underline">Ver a publicação inteira</summary>
                        <p className="whitespace-pre-wrap mt-1">{l.publicacao.texto}</p>
                        {l.publicacao.link && <a href={l.publicacao.link} target="_blank" rel="noopener noreferrer" title="Abre a publicação no diário oficial, em outra aba. É site de fora da plataforma." className="underline text-navy">Abrir no tribunal<span className="sr-only"> (nova aba)</span></a>}
                      </details>
                    </li>
                  ))}
                  </ol>
                  </section>
                  ))}
                </div>
                {s.ocultos.length > 0 && <button type="button" onClick={() => mudar({ ocultos: [] })} title="Traz de volta para a lista os prazos que foram marcados como resolvidos" className="mt-3 min-h-[44px] text-sm underline text-navy">Mostrar de novo os {s.ocultos.length} marcados como resolvidos</button>}
              </>}
            <p className="text-xs text-grafite-claro mt-4">A leitura do prazo é automática e serve para organizar o trabalho. Antes de protocolar, confira a data na publicação e no processo. Processos em segredo de justiça não aparecem no Diário.</p>
          </section>
        )}

        {s.quando && achadosFora.length > 0 && (
          <section className="bg-white shadow-sm p-5 md:p-6" aria-label="Processos achados fora da carteira">
            <h2 className="font-serif text-xl">Processos achados que ainda não estão cadastrados ({achadosFora.length})</h2>
            <p className="text-sm text-grafite-claro mt-1">Apareceram nas publicações pelo nome ou pela OAB. Cadastre para a plataforma acompanhar todo dia.</p>
            <ul className="mt-2 text-sm list-disc pl-5" data-testid="achados-fora">{achadosFora.slice(0, 30).map(p => <li key={p.numero}><span className="font-mono">{p.numero}</span> · {p.tribunal ?? ''} {p.orgao ? `· ${p.orgao}` : ''}{p.partes.length ? ` · ${p.partes.map(x => x.nome).slice(0, 2).join(' x ')}` : ''}</li>)}</ul>
            <button type="button" onClick={cadastrarAchados} title="Cadastra estes processos na plataforma para o acompanhamento diário de prazos e intimações" className="mt-3 min-h-[48px] px-5 bg-dourado text-white text-base inline-flex items-center gap-2" data-testid="cadastrar-achados"><FolderPlus className="w-5 h-5" aria-hidden />Cadastrar os {achadosFora.length}</button>
          </section>
        )}

        {s.quando && semNovidade.length > 0 && (
          <section className="bg-white shadow-sm p-5 md:p-6" aria-label="Processos sem novidade">
            <h2 className="font-serif text-xl">Processos sem publicação no período ({semNovidade.length})</h2>
            <p className="text-sm text-grafite-claro mt-1">Não chegou intimação para eles. Vale abrir o andamento e ver se estão parados há muito tempo.</p>
            <ul className="mt-2 divide-y divide-navy/10" data-testid="sem-novidade">
              {semNovidade.map(c => (
                <li key={c.numero} className="py-2 text-sm flex flex-wrap items-center justify-between gap-2">
                  <span><span className="font-mono">{c.numero}</span> · {c.achou ? `último andamento: ${c.ultimo ?? '—'}${c.quando ? ` em ${new Date(c.quando).toLocaleDateString('pt-BR')}` : ''}` : 'não achado no CNJ (confira o número ou o tribunal)'}</span>
                  <Link to={`/monitoramento?lt=${c.numero.replace(/\D/g, '')}`} title="Mostra todos os andamentos deste processo no DataJud (CNJ)" className="min-h-[44px] inline-flex items-center underline text-navy">Ver andamentos</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <RoboCnj nomes={s.nome} oabs={s.oab} aoCarregar={a => setS(atual => (atual.nome || atual.oab ? atual : { ...atual, nome: a.advogados, oab: a.oabs }))} />
      </div>
    </Layout>
  )
}
