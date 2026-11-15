import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import { FunctionRegion } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { lerConfig } from '@/lib/config'
import { mensagemAmigavel } from '@/lib/erros'
import { listarPessoas, type Pessoa } from '@/lib/equipe'
import { analisarPlanilha, analisarLista, analisarResultados, paraCaso, importavel, areaProvavel, ROTULO_SITUACAO, MODELO_PLANILHA, type LinhaImportacao } from '@/lib/escritorio/importarProcessos'
import ConexaoCnj from '@/components/ConexaoCnj'
import PassosImportacao from '@/components/PassosImportacao'
import { janelas, lerOabs } from '@/lib/escritorio/historicoOab'
import { Download, Upload, CheckCircle2, FileSpreadsheet, ListOrdered, Inbox, Search } from 'lucide-react'
import { meuAlcance, ALCANCE_FECHADO } from '@/lib/hierarquia'
import AbasProcessosAntigos from '@/components/AbasProcessosAntigos'

// Importar processos anteriores: o escritório traz a carteira que já tem e não começa do zero.
// Quatro caminhos: planilha (Excel/CSV de outro sistema), lista de números, intimações das OABs do escritório
// (DJEN, já captadas pela plataforma) e busca no Escavador por nome, CPF/CNPJ ou número.
type Fonte = 'planilha' | 'lista' | 'intimacoes' | 'escavador'
const FONTES: { valor: Fonte; rotulo: string; icone: JSX.Element }[] = [
  { valor: 'planilha', rotulo: 'Planilha', icone: <FileSpreadsheet size={16} aria-hidden /> },
  { valor: 'lista', rotulo: 'Lista de números', icone: <ListOrdered size={16} aria-hidden /> },
  { valor: 'intimacoes', rotulo: 'Das intimações das OABs', icone: <Inbox size={16} aria-hidden /> },
  { valor: 'escavador', rotulo: 'Busca no Escavador', icone: <Search size={16} aria-hidden /> },
]
const COR: Record<string, string> = { ok: 'text-regular', sem_numero: 'text-navy', ja_cadastrado: 'text-grafite-claro', duplicado_arquivo: 'text-grafite-claro', invalido: 'text-critico' }

export default function ImportarProcessosPage() {
  const [fonte, setFonte] = useState<Fonte>('planilha')
  const [texto, setTexto] = useState('')
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [linhas, setLinhas] = useState<LinhaImportacao[]>([])
  const [erro, setErro] = useState('')
  const [existentes, setExistentes] = useState<string[]>([])
  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [responsavel, setResponsavel] = useState('')
  const [eu, setEu] = useState('')
  const [monitorar, setMonitorar] = useState(true)
  const [marcadas, setMarcadas] = useState<Set<number>>(new Set())
  const [termo, setTermo] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [relatorio, setRelatorio] = useState<{ casos: number; monitorados: number; falhas: string[] } | null>(null)
  // Importar tudo pelas OABs: busca o histórico do Diário (DJEN) em blocos de 30 dias e lista os processos achados.
  const [oabsTexto, setOabsTexto] = useState('')
  const [meses, setMeses] = useState(24)
  const [conexaoOk, setConexaoOk] = useState(false)
  const [avisoHistorico, setAvisoHistorico] = useState('')
  const [progresso, setProgresso] = useState<{ feitos: number; total: number; novas: number } | null>(null)
  const parar = useRef(false)
  // Privacidade por advogado: o caso importado nasce com dono (quem importa), senão o escritório inteiro o vê.
  useEffect(() => {
    Promise.resolve(supabase.auth?.getUser?.()).then(r => {
      const id = r?.data?.user?.id
      if (!id) return
      setEu(id); setResponsavel(atual => atual || id)
    }, () => undefined)
  }, [])
  useEffect(() => {
    ;(async () => {
      try {
        const { oabs_monitoradas } = await lerConfig(['oabs_monitoradas'])
        if (oabs_monitoradas) setOabsTexto(oabs_monitoradas)
      } catch { /* sem permissão para ler: a pessoa digita */ }
    })()
  }, [])

  const carregarExistentes = async () => {
    const { data } = await supabase.from('tarefas').select('numero_processo').eq('nivel', 'projeto').not('numero_processo', 'is', null)
    const nums = ((data ?? []) as { numero_processo: string | null }[]).map(d => String(d.numero_processo ?? '').replace(/\D/g, '')).filter(n => n.length === 20)
    setExistentes(nums); return nums
  }
  useEffect(() => { carregarExistentes(); listarPessoas().then(setPessoas).catch(() => {}) }, [])

  const mostrar = (ls: LinhaImportacao[]) => { setLinhas(ls); setMarcadas(new Set(ls.filter(importavel).map(l => l.linha))); setRelatorio(null) }
  const analisar = (t: string, f: Fonte = fonte) => {
    setTexto(t); setErro('')
    if (!t.trim()) return mostrar([])
    if (f === 'lista') { const ls = analisarLista(t, existentes); if (!ls.length) setErro('Nenhum número de processo encontrado no texto.'); return mostrar(ls) }
    const r = analisarPlanilha(t, existentes)
    if (r.erro) setErro(r.erro)
    mostrar(r.linhas)
  }
  const lerArquivo = (f: File | undefined) => {
    if (!f) return
    if (/\.xlsx?$/i.test(f.name)) { setErro('No Excel, use Arquivo → Salvar como → CSV (separado por vírgulas ou ponto e vírgula) e envie o .csv. Ou copie as células e cole no quadro abaixo.'); return }
    setNomeArquivo(f.name)
    const leitor = new FileReader(); leitor.onload = () => analisar(String(leitor.result ?? ''), 'planilha'); leitor.readAsText(f, 'utf-8')
  }
  const baixarModelo = () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + MODELO_PLANILHA], { type: 'text/csv;charset=utf-8' })); a.download = 'modelo-processos.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
  const trocarFonte = (f: Fonte) => { setFonte(f); setTexto(''); setNomeArquivo(''); setErro(''); mostrar([]) }

  const buscarIntimacoes = async () => {
    setBuscando(true); setErro('')
    const ex = await carregarExistentes()
    // Privacidade por advogado: intimação de processo que já é caso de um colega não entra na sugestão.
    // Processo que ainda não é caso de ninguém aparece para todos — é justamente o que há para importar.
    const [{ data, error }, casos, alc] = await Promise.all([
      supabase.from('intimacoes').select('numero_processo,tribunal,orgao,classe,data_disponibilizacao').order('data_disponibilizacao', { ascending: false }),
      Promise.resolve(supabase.from('tarefas').select('numero_processo,responsavel_id').eq('nivel', 'projeto')).then(r => (r.data ?? []) as { numero_processo: string | null; responsavel_id: string | null }[], () => []),
      meuAlcance().catch(() => ALCANCE_FECHADO),
    ])
    const dig = (n: string | null | undefined) => String(n ?? '').replace(/\D/g, '')
    const deOutro = new Set(casos.filter(t => t.responsavel_id && t.responsavel_id !== alc.id).map(t => dig(t.numero_processo)))
    setBuscando(false)
    if (error) return setErro(mensagemAmigavel(error))
    const vistos = new Set<string>()
    const itens = ((data ?? []) as { numero_processo: string | null; tribunal: string | null; orgao: string | null; classe: string | null }[])
      .filter(i => { const n = dig(i.numero_processo); if (n.length !== 20 || vistos.has(n) || (!alc.veTudo && deOutro.has(n))) return false; vistos.add(n); return true })
      .map(i => ({ numero: String(i.numero_processo), titulo: i.classe ?? undefined, vara: i.orgao ?? undefined, tribunal: i.tribunal ?? undefined }))
    if (!itens.length) setErro('Nenhuma intimação com número de processo. Confira as OABs em Intimações e clique em "Buscar agora" lá.')
    mostrar(analisarResultados(itens, ex))
  }
  const buscarHistorico = async () => {
    const { oabs, invalidas } = lerOabs(oabsTexto)
    if (invalidas.length) return setErro(`Não entendi: ${invalidas.join(', ')}. Escreva assim: 123456/RJ (número da OAB, barra e o estado).`)
    if (!oabs.length) return setErro('Escreva ao menos uma OAB, por exemplo 123456/RJ. Coloque a de cada advogado do escritório, inclusive a de quem já saiu.')
    setBuscando(true); setErro(''); setAvisoHistorico(''); parar.current = false
    const salvar = await supabase.rpc('definir_configuracao', { p_chave: 'oabs_monitoradas', p_valor: oabs.join(', ') })
    if (salvar.error) { setBuscando(false); return setErro(`Não consegui guardar as OABs: ${mensagemAmigavel(salvar.error)} Só administradores podem fazer isso.`) }
    const lista = janelas(meses)
    let novas = 0
    for (let i = 0; i < lista.length; i++) {
      if (parar.current) break
      setProgresso({ feitos: i, total: lista.length, novas })
      const { data, error } = await supabase.functions.invoke('intimacoes', { body: { inicio: lista[i].inicio, fim: lista[i].fim, historico: true }, region: FunctionRegion.SaEast1 })
      const d = error ? await (error as { context?: Response }).context?.json?.().catch(() => null) : data
      if (!d || d.erro) { setAvisoHistorico(d?.erro ?? 'O CNJ não respondeu agora. O que já foi buscado ficou guardado; clique de novo para continuar.'); break }
      if (d.periodo?.inicio !== lista[i].inicio) { setAvisoHistorico('O servidor ainda está na versão antiga e só traz os últimos dias. Peça a quem publica a plataforma para atualizar a função "intimacoes".'); break }
      novas += Number(d.novas ?? 0)
      if (d.falhas?.length) setAvisoHistorico(`Algumas buscas falharam (${d.falhas.join('; ')}). Confira o número e o estado das OABs.`)
      await new Promise(r => setTimeout(r, 400))
    }
    setProgresso(p => (p ? { ...p, novas } : p))
    await buscarIntimacoes()
  }
  const buscarEscavador = async () => {
    if (termo.trim().length < 3) return setErro('Escreva o nome, o CPF/CNPJ ou o número do processo.')
    setBuscando(true); setErro('')
    const { data, error } = await supabase.functions.invoke('escavador', { body: { termo: termo.trim() } })
    setBuscando(false)
    if (error || data?.erro) return setErro(data?.erro ?? 'O Escavador não respondeu. Tente de novo.')
    const procs = (data?.processos ?? []) as { numero: string; titulo: string; tribunal: string | null; classe: string | null }[]
    if (!procs.length) setErro('O Escavador não encontrou processos para esse termo.')
    mostrar(analisarResultados(procs.map(p => ({ numero: p.numero, titulo: p.titulo || p.classe || undefined, tribunal: p.tribunal ?? undefined })), existentes))
  }

  const prontas = useMemo(() => linhas.filter(l => importavel(l) && marcadas.has(l.linha)), [linhas, marcadas])
  const contagem = useMemo(() => { const m: Record<string, number> = {}; for (const l of linhas) m[l.situacao] = (m[l.situacao] ?? 0) + 1; return m }, [linhas])
  const alternar = (n: number) => setMarcadas(s => { const x = new Set(s); if (x.has(n)) x.delete(n); else x.add(n); return x })

  const importar = async () => {
    if (!prontas.length) return
    setImportando(true); setErro('')
    const origem = FONTES.find(f => f.valor === fonte)!.rotulo.toLowerCase()
    const casos = prontas.map(l => paraCaso(l, origem, responsavel || null))
    const falhas: string[] = []; let gravados = 0, monitorados = 0
    const salvos: typeof casos = []
    for (let i = 0; i < casos.length; i += 50) {
      const lote = casos.slice(i, i + 50)
      const { error } = await supabase.from('tarefas').insert(lote)
      if (error) falhas.push(`Linhas ${i + 1} a ${i + lote.length}: ${mensagemAmigavel(error)}`); else { gravados += lote.length; salvos.push(...lote) }
    }
    if (monitorar && gravados) {
      // Só monitora os casos que de fato entraram (um lote recusado não deve virar monitoramento solto).
      const mons = salvos.filter(c => c.numero_processo && c.situacao !== 'feito').map(c => ({ tipo: 'processo', valor: c.numero_processo!.replace(/\D/g, ''), rotulo: c.titulo.slice(0, 120) }))
      if (mons.length) {
        const { error } = await supabase.from('monitoramentos').upsert(mons, { onConflict: 'tipo,valor', ignoreDuplicates: true })
        if (error) falhas.push(`Monitoramento: ${mensagemAmigavel(error)}`); else monitorados = mons.length
      }
    }
    setImportando(false); setRelatorio({ casos: gravados, monitorados, falhas })
    const ex = await carregarExistentes()
    setLinhas(ls => ls.map(l => (l.numero && ex.includes(l.numero) && l.situacao === 'ok' ? { ...l, situacao: 'ja_cadastrado', motivo: 'Importado agora.' } : l)))
    setMarcadas(new Set())
  }

  const oabsValidas = lerOabs(oabsTexto).oabs.length > 0 && lerOabs(oabsTexto).invalidas.length === 0
  const passos = [
    { titulo: 'Confira se a ligação com o CNJ está ativa', ajuda: 'Na faixa abaixo, clique em "Testar conexão agora". Se aparecer "o CNJ respondeu agora", pode seguir.', feito: !!conexaoOk },
    { titulo: 'Digite a OAB de cada advogado do escritório', ajuda: 'Número, barra e estado, assim: 123456/RJ. Se tiver mais de um, separe por vírgula. Coloque também a de quem já saiu do escritório.', feito: oabsValidas },
    { titulo: 'Clique em "Buscar todos os processos" e espere', ajuda: 'Pode levar alguns minutos. A barra de andamento mostra onde está. Não feche a página.', feito: !!progresso && !buscando },
    { titulo: 'Confira a lista que aparece', ajuda: 'Cada linha é um processo achado. Os já cadastrados e os com número errado ficam de fora sozinhos. Desmarque os que não quer.', feito: linhas.length > 0 && !!progresso && !buscando },
    { titulo: 'Clique em "Importar" e pronto', ajuda: 'Cada processo vira um caso em Projetos e entra no monitoramento. A plataforma passa a avisar de cada andamento e intimação nova.', feito: !!relatorio },
  ]
  return (
    <Layout title="Importar processos anteriores">
      <div className="space-y-6">
        <AbasProcessosAntigos aqui="/processos/importar" />
        <section className="bg-white shadow-sm border-t-2 border-dourado p-5">
          <p className="text-sm">Traga a carteira que o escritório já tem. Cada processo vira um caso em Projetos, com cliente, área, parte contrária, vara e honorários, e (se quiser) entra no monitoramento diário do DataJud. Nada é gravado antes da conferência: número CNJ com dígito errado, repetido ou já cadastrado fica de fora.</p>
          <div role="tablist" aria-label="De onde vêm os processos" className="flex flex-wrap gap-2 mt-4">
            {FONTES.map(f => <button key={f.valor} role="tab" type="button" aria-selected={fonte === f.valor} onClick={() => trocarFonte(f.valor)} title={f.valor === 'planilha' ? 'Mostra a importação por planilha CSV exportada de outro sistema ou do Excel' : f.valor === 'lista' ? 'Mostra a importação colando uma lista de números de processo' : f.valor === 'intimacoes' ? 'Mostra a importação a partir das intimações já captadas pelas OABs do escritório' : 'Mostra a busca de processos no Escavador por nome, CPF/CNPJ ou número'} data-testid={`fonte-${f.valor}`} className={`min-h-[44px] px-4 text-sm border inline-flex items-center gap-2 ${fonte === f.valor ? 'bg-navy text-white' : 'text-navy'}`}>{f.icone}{f.rotulo}</button>)}
          </div>

          {fonte === 'planilha' && <div className="mt-4 space-y-3">
            <p className="text-xs text-grafite-claro">Serve a planilha exportada de outro sistema (Astrea, Projuris, ADVBOX, Legal One, Excel próprio). Reconheço colunas como "Número do processo", "Cliente", "Parte contrária", "Área", "Vara", "Valor da causa", "Fase", "Honorários" e "Observações", em qualquer ordem.</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={baixarModelo} title="Baixa o arquivo modelo-processos.csv com as colunas esperadas para preencher e enviar de volta" data-testid="baixar-modelo-processos" className="min-h-[44px] px-4 border border-navy text-navy text-sm inline-flex items-center gap-2"><Download size={16} aria-hidden /> Baixar modelo</button>
              <label title="Escolhe o arquivo CSV com os processos no seu computador; as linhas são conferidas antes de gravar" className="min-h-[44px] px-4 bg-navy text-white text-sm inline-flex items-center gap-2 cursor-pointer"><Upload size={16} aria-hidden /> Enviar CSV<input type="file" title="Escolhe a planilha exportada do outro sistema (Excel ou CSV). Nada é gravado antes da conferência." accept=".csv,.txt,.xlsx,.xls,text/csv" className="sr-only" data-testid="arquivo-processos" onChange={e => lerArquivo(e.target.files?.[0])} /></label>
              {nomeArquivo && <span className="text-sm self-center">{nomeArquivo}</span>}
            </div>
            <label className="block text-sm">Ou cole aqui as células copiadas do Excel (com a linha de cabeçalho)
              <textarea title="Cole aqui o conteúdo da planilha, com a primeira linha de títulos. A plataforma descobre as colunas sozinha." value={texto} onChange={e => analisar(e.target.value)} rows={5} className="w-full border px-3 py-2 mt-1 font-mono text-xs" data-testid="planilha-texto" /></label>
          </div>}

          {fonte === 'lista' && <label className="block text-sm mt-4">Cole os números dos processos (um por linha, ou no meio de qualquer texto: e-mail, relatório, PDF copiado)
            <textarea title="Cole os números dos processos, um por linha. Número com dígito errado, repetido ou já cadastrado fica de fora." value={texto} onChange={e => analisar(e.target.value, 'lista')} rows={6} placeholder="0001234-56.2023.8.19.0001" className="w-full border px-3 py-2 mt-1 font-mono text-xs" data-testid="lista-texto" /></label>}

          {fonte === 'intimacoes' && <div className="mt-4">
            <p className="text-sm font-medium mb-2">Como importar tudo, em 5 passos</p>
            <div className="mb-4"><PassosImportacao passos={passos} /></div>
            <div className="mb-4"><ConexaoCnj aoTestar={ok => setConexaoOk(ok)} /></div>
            <p className="text-xs text-grafite-claro mb-2">A plataforma já capta, todo dia, as intimações do Diário de Justiça Eletrônico Nacional pelas OABs do escritório. Aqui aparecem os processos dessas intimações que ainda não são casos.</p>
            <div className="border border-dourado/50 bg-pergaminho p-3 mb-3" data-testid="importar-tudo-oab">
              <p className="text-sm font-medium">Importar tudo pelas OABs do escritório</p>
              <p className="text-xs text-grafite-claro mt-1">Escreva a OAB de cada advogado (inclusive a de quem já saiu). A plataforma busca no Diário de Justiça Eletrônico Nacional todos os processos em que cada um recebeu intimação e mostra a lista aqui para você conferir. Ela também passa a avisar das próximas intimações dessas OABs, todo dia.</p>
              <div className="flex flex-wrap items-end gap-3 mt-2">
                <label className="text-sm">OABs (separe por vírgula)
                  <input title="As OABs do escritório, no formato número/UF, separadas por vírgula. É por elas que a plataforma acha as intimações." value={oabsTexto} onChange={e => setOabsTexto(e.target.value)} placeholder="123456/RJ, 98765/RJ" data-testid="oabs-texto" className="block border px-3 py-2 min-h-[44px] mt-1 w-72" /></label>
                <label className="text-sm">Voltar quanto tempo
                  <select value={meses} onChange={e => setMeses(Number(e.target.value))} title="Escolhe quanto tempo para trás buscar as intimações no Diário de Justiça (quanto maior, mais demorada a busca)" data-testid="oabs-meses" className="block border px-2 py-2 min-h-[44px] mt-1"><option value={12}>12 meses</option><option value={24}>24 meses</option><option value={36}>3 anos</option><option value={60}>5 anos</option></select></label>
                <button type="button" onClick={buscarHistorico} disabled={buscando} title="Busca no Diário de Justiça Eletrônico Nacional todos os processos em que as OABs informadas receberam intimação no período escolhido" data-testid="buscar-historico" className="min-h-[44px] px-4 bg-dourado text-navy uppercase tracking-wider text-sm disabled:opacity-50">{buscando ? 'Buscando…' : 'Buscar todos os processos'}</button>
                {buscando && <button type="button" onClick={() => { parar.current = true }} title="Interrompe a busca no Diário; o que já foi buscado fica guardado" className="min-h-[44px] px-3 underline text-sm">Parar</button>}
              </div>
              {avisoHistorico && <p role="alert" className="text-sm text-critico mt-2" data-testid="oabs-aviso">{avisoHistorico}</p>}
              {progresso && <p role="status" className="text-xs mt-2" data-testid="oabs-progresso">{buscando ? `Buscando bloco ${Math.min(progresso.feitos + 1, progresso.total)} de ${progresso.total}…` : `Busca concluída em ${progresso.feitos >= progresso.total ? progresso.total : progresso.feitos} de ${progresso.total} blocos.`} {progresso.novas} intimação(ões) nova(s) guardada(s).</p>}
              <p className="text-xs text-grafite-claro mt-2">O que a busca não alcança: processos em que a OAB não recebeu nenhuma intimação nesse período, e os que correm em segredo de justiça. Para esses, use a planilha.</p>
            </div>
            <button type="button" onClick={buscarIntimacoes} disabled={buscando} title="Lista os processos das intimações já captadas pela plataforma que ainda não são casos, sem buscar nada novo" data-testid="buscar-intimacoes" className="min-h-[44px] px-4 border border-navy text-navy text-sm disabled:opacity-50">{buscando ? 'Procurando…' : 'Só listar o que já foi captado: procurar processos nas intimações'}</button>
          </div>}

          {fonte === 'escavador' && <div className="mt-4">
            <p className="text-xs text-grafite-claro mb-2">Usa o token do Escavador do escritório (cada busca gasta crédito). Busque pelo nome do advogado ou do escritório para trazer toda a carteira, ou pelo nome/CPF/CNPJ de um cliente.</p>
            <div className="flex flex-wrap gap-2">
              <input value={termo} onChange={e => setTermo(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') buscarEscavador() }} placeholder="Nome, CPF/CNPJ ou número do processo" aria-label="Termo para buscar no Escavador" data-testid="escavador-termo" className="border px-3 py-2 min-h-[44px] flex-1 min-w-[240px]" />
              <button type="button" onClick={buscarEscavador} disabled={buscando} title="Busca processos no Escavador pelo termo digitado (cada busca gasta crédito do token do escritório)" data-testid="buscar-escavador" className="min-h-[44px] px-4 bg-navy text-white text-sm disabled:opacity-50">{buscando ? 'Buscando…' : 'Buscar'}</button>
            </div>
          </div>}
          {erro && <p role="alert" className="text-sm text-critico mt-3" data-testid="importar-erro">{erro}</p>}
        </section>

        {linhas.length > 0 && (
          <section className="bg-white shadow-sm p-5" aria-live="polite">
            <p className="text-sm" data-testid="importar-resumo"><strong>{linhas.length}</strong> encontrado(s): {Object.entries(contagem).map(([s, n]) => <span key={s} className={`${COR[s]} mr-2`}>{n} {ROTULO_SITUACAO[s as keyof typeof ROTULO_SITUACAO].toLowerCase()}</span>)}</p>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm min-w-[720px]">
                <thead><tr className="text-left text-xs uppercase tracking-wider text-grafite-claro"><th className="py-1 w-8"><span className="sr-only">Importar</span></th><th>Processo</th><th>Cliente / título</th><th>Área</th><th>Tribunal</th><th>Situação</th></tr></thead>
                <tbody className="divide-y divide-navy/10">
                  {linhas.map(l => (
                    <tr key={`${l.linha}-${l.numero}`} data-testid="linha-processo" className={l.situacao === 'invalido' ? 'bg-criticoFundo' : ''}>
                      <td className="py-1">{importavel(l) && <input type="checkbox" checked={marcadas.has(l.linha)} onChange={() => alternar(l.linha)} aria-label={`Importar ${l.formatado || `linha ${l.linha}`}`} />}</td>
                      <td className="font-mono text-xs">{l.formatado || '—'}</td>
                      <td>{l.dados.cliente ?? l.dados.titulo ?? '—'}{l.dados.parte_contraria ? ` x ${l.dados.parte_contraria}` : ''}</td>
                      <td>{areaProvavel(l)}</td>
                      <td>{l.tribunal || '—'}</td>
                      <td className={COR[l.situacao]}>{ROTULO_SITUACAO[l.situacao]}{l.motivo && l.situacao !== 'ok' ? <span className="block text-xs">{l.motivo}</span> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
              <label className="inline-flex items-center gap-2"><input type="checkbox" title="Marcado, cada processo trazido entra no acompanhamento do CNJ e o robô avisa quando andar." checked={monitorar} onChange={e => setMonitorar(e.target.checked)} data-testid="importar-monitorar" /> Monitorar no DataJud (andamentos novos todo dia)</label>
              <label className="inline-flex items-center gap-2">Responsável
                <select value={responsavel} onChange={e => setResponsavel(e.target.value)} className="border px-2 py-1" title="Escolhe quem fica responsável pelos casos importados. Só o responsável, os sócios e o gestor veem o caso; sem responsável, o escritório inteiro vê." aria-label="Responsável pelos casos importados"><option value="">Ninguém (o escritório inteiro vê)</option>{eu && !pessoas.some(p => p.id === eu) && <option value={eu}>Eu</option>}{pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}{p.id === eu ? ' (eu)' : ''}</option>)}</select></label>
              <button type="button" onClick={importar} disabled={importando || !prontas.length} title="Grava os processos marcados como casos em Projetos e, se marcado, coloca cada um no monitoramento diário do DataJud" data-testid="importar-processos" className="min-h-[44px] px-5 bg-dourado text-navy uppercase tracking-wider text-sm disabled:opacity-50">{importando ? 'Importando…' : `Importar ${prontas.length} processo(s)`}</button>
            </div>
          </section>
        )}

        {relatorio && (
          <section role="status" className="bg-white shadow-sm border-l-4 border-regular p-5" data-testid="importar-relatorio">
            <p className="text-sm flex items-center gap-2"><CheckCircle2 size={16} className="text-regular" aria-hidden /><span><strong>{relatorio.casos}</strong> caso(s) criado(s){relatorio.monitorados ? <>, <strong>{relatorio.monitorados}</strong> no monitoramento</> : null}.</span></p>
            {relatorio.falhas.length > 0 && <ul className="text-xs text-critico mt-2 list-disc pl-5">{relatorio.falhas.map(f => <li key={f}>{f}</li>)}</ul>}
            <p className="text-sm mt-2"><Link to="/processos" title="Abre a tela de processos para conferir os que foram importados" className="underline text-navy">Ver a carteira de processos</Link> · <Link to="/projetos" title="Abre a tela de casos e projetos onde os processos importados viraram casos" className="underline text-navy">Abrir em Projetos</Link></p>
          </section>
        )}
      </div>
    </Layout>
  )
}
