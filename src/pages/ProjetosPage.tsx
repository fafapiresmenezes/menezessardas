import { useEffect, useMemo, useState } from 'react'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { repositorio, type Imovel } from '@/lib/repositorio'
import { listarPessoas, type Pessoa } from '@/lib/equipe'
import { formatarData, diasAte } from '@/lib/datas'
import { FolderKanban, Plus, ChevronRight } from 'lucide-react'
import AssinaturasCaso from '@/components/AssinaturasCaso'
import { caminhoCritico } from '@/lib/caminhoCritico'

// Gestão de projetos do escritório em hierarquia (Projeto → Tarefa → Subtarefa), no estilo Monday:
// vale para qualquer caso (processo, contrato, consultoria, cliente externo ou projeto interno), com
// quadro por situação, dono, prazo, prioridade, horas e ligação opcional com imóvel.
type Situacao = 'a_fazer' | 'fazendo' | 'revisao' | 'feito'
interface Tarefa {
  id: string; pai_id: string | null; nivel: 'projeto' | 'tarefa' | 'subtarefa'; titulo: string
  situacao: Situacao; prioridade: 'alta' | 'media' | 'baixa'; responsavel_id: string | null
  imovel_id: string | null; prazo: string | null; horas: number
  cliente: string | null; area: string | null; numero_processo: string | null; tipo: string | null; portal_token?: string | null
  depende_de: string | null; criado_em?: string
}
const TIPOS: Record<string, string> = { caso: 'Processo judicial', contrato: 'Contrato ou consultoria', interno: 'Projeto interno do escritório', externo: 'Gestão para outro escritório ou empresa' }
const AREAS = ['Imobiliário', 'Cível', 'Trabalhista', 'Família e sucessões', 'Tributário', 'Empresarial', 'Consumidor', 'Previdenciário', 'Penal', 'Compliance', 'Gestão interna']
// Modelos de caso: etapas típicas e em quantos dias, a partir de hoje, cada uma deve estar pronta.
const MODELOS: Record<string, { nome: string; etapas: [string, number][] }> = {
  contencioso: { nome: 'Ação judicial (contencioso)', etapas: [['Reunião com o cliente e documentos', 3], ['Análise de viabilidade e honorários', 7], ['Petição inicial ou contestação', 15], ['Acompanhar citação e intimações', 30], ['Audiência de conciliação', 60], ['Provas e réplica', 90], ['Sentença e análise de recurso', 180]] },
  contrato: { nome: 'Elaboração ou revisão de contrato', etapas: [['Entender o negócio e as partes', 2], ['Checagem de contraparte (KYC)', 4], ['Minuta', 7], ['Revisão interna', 9], ['Negociação com a outra parte', 15], ['Assinatura e arquivo', 20]] },
  trabalhista: { nome: 'Reclamação trabalhista', etapas: [['Documentos do contrato de trabalho', 3], ['Cálculo das verbas', 7], ['Petição inicial ou defesa', 15], ['Audiência', 45], ['Perícia, se houver', 90], ['Sentença e recurso', 150]] },
  familia: { nome: 'Divórcio, alimentos ou inventário', etapas: [['Acolhimento e documentos', 3], ['Levantamento de bens', 10], ['Proposta de acordo', 20], ['Petição ou escritura', 30], ['Acompanhamento até a homologação', 90]] },
  consultoria: { nome: 'Parecer ou consultoria', etapas: [['Delimitar a pergunta do cliente', 1], ['Pesquisa de lei e jurisprudência', 5], ['Rascunho do parecer', 8], ['Revisão pela sócia', 10], ['Entrega e reunião', 12]] },
  interno: { nome: 'Projeto interno do escritório', etapas: [['Objetivo e meta (OKR)', 3], ['Plano e responsáveis', 7], ['Execução', 30], ['Revisão de resultados', 45], ['Lições aprendidas', 50]] },
}
const COLUNAS: { valor: Situacao; rotulo: string }[] = [
  { valor: 'a_fazer', rotulo: 'A fazer' }, { valor: 'fazendo', rotulo: 'Fazendo' },
  { valor: 'revisao', rotulo: 'Em revisão' }, { valor: 'feito', rotulo: 'Feito' },
]
const COR_PRIORIDADE = { alta: 'border-critico', media: 'border-dourado', baixa: 'border-grafite-claro' }

export default function ProjetosPage() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [imoveis, setImoveis] = useState<Imovel[]>([])
  const [projeto, setProjeto] = useState<string>('')
  const [novo, setNovo] = useState({ titulo: '', nivel: 'tarefa', responsavel_id: '', prazo: '', prioridade: 'media', imovel_id: '' })
  const [erro, setErro] = useState('')
  const [caso, setCaso] = useState({ modelo: 'contencioso', titulo: '', cliente: '', area: 'Cível', numero: '', tipo: 'caso', responsavel_id: '' })
  const [filtroArea, setFiltroArea] = useState('')
  const [linkPortal, setLinkPortal] = useState('')

  const carregar = async () => {
    const { data, error } = await supabase.from('tarefas').select('id,pai_id,nivel,titulo,situacao,prioridade,responsavel_id,imovel_id,prazo,horas,cliente,area,numero_processo,tipo,portal_token,depende_de,criado_em').order('criado_em')
    if (error) return setErro(error.message)
    setTarefas((data ?? []) as Tarefa[])
  }
  useEffect(() => {
    carregar()
    listarPessoas().then(setPessoas).catch(() => {})
    repositorio.listarImoveis().then(setImoveis).catch(() => {})
  }, [])

  const projetos = tarefas.filter(t => t.nivel === 'projeto' && (!filtroArea || t.area === filtroArea))
  // Tarefas do projeto escolhido, incluindo subtarefas (descendentes em qualquer nível).
  const visiveis = useMemo(() => {
    if (!projeto) return tarefas.filter(t => t.nivel !== 'projeto')
    const ids = new Set([projeto])
    let mudou = true
    while (mudou) { mudou = false; for (const t of tarefas) if (t.pai_id && ids.has(t.pai_id) && !ids.has(t.id)) { ids.add(t.id); mudou = true } }
    return tarefas.filter(t => t.id !== projeto && ids.has(t.id))
  }, [tarefas, projeto])
  const nome = (id: string | null) => pessoas.find(p => p.id === id)?.nome ?? '—'
  const titulo = (id: string | null) => tarefas.find(t => t.id === id)?.titulo

  const criar = async () => {
    setErro('')
    if (!novo.titulo.trim()) return setErro('Escreva o título.')
    const pai = novo.nivel === 'projeto' ? null : projeto || null
    const { error } = await supabase.from('tarefas').insert({
      titulo: novo.titulo.trim(), nivel: novo.nivel, pai_id: pai, prioridade: novo.prioridade,
      responsavel_id: novo.responsavel_id || null, prazo: novo.prazo || null, imovel_id: novo.imovel_id || null,
    })
    if (error) return setErro(error.message)
    setNovo({ ...novo, titulo: '', prazo: '' }); carregar()
  }
  // Cria o caso inteiro de uma vez: o projeto e as etapas do modelo, com prazos já calculados.
  const criarCaso = async () => {
    setErro('')
    const m = MODELOS[caso.modelo]
    const tituloCaso = caso.titulo.trim() || `${m.nome}${caso.cliente ? ` · ${caso.cliente}` : ''}`
    const { data, error } = await supabase.from('tarefas').insert({
      titulo: tituloCaso, nivel: 'projeto', prioridade: 'media', cliente: caso.cliente.trim() || null, area: caso.area,
      numero_processo: caso.numero.trim() || null, tipo: caso.tipo, responsavel_id: caso.responsavel_id || null,
    }).select('id').single()
    if (error || !data) return setErro(error?.message ?? 'Falha ao criar o caso.')
    const dia = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)
    // Etapas do modelo em sequência: cada uma depende da anterior (Passo 30).
    let anterior: string | null = null
    for (const [t, d] of m.etapas) {
      const res: { data: { id: string } | null; error: { message: string } | null } = await supabase.from('tarefas').insert({
        titulo: t, nivel: 'tarefa', pai_id: data.id, prioridade: 'media', prazo: dia(d), area: caso.area, cliente: caso.cliente.trim() || null,
        responsavel_id: caso.responsavel_id || null, depende_de: anterior,
      }).select('id').single()
      if (res.error || !res.data) return setErro(res.error?.message ?? 'Falha ao criar etapa.')
      anterior = res.data.id
    }
    setCaso({ ...caso, titulo: '', cliente: '', numero: '' }); setProjeto(data.id); carregar()
  }
  // Portal do cliente: gera (ou reaproveita) um código secreto e copia o link público do caso.
  const linkCliente = async () => {
    const c = tarefas.find(t => t.id === projeto); if (!c) return
    let token = c.portal_token
    if (!token) {
      token = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('')
      const { error } = await supabase.from('tarefas').update({ portal_token: token }).eq('id', c.id)
      if (error) return setErro(error.message)
      carregar()
    }
    const url = `${location.origin}${location.pathname}#/portal/${token}`
    await navigator.clipboard.writeText(url).catch(() => {})
    setLinkPortal(url)
  }
  const mover = async (t: Tarefa, situacao: Situacao) => {
    setTarefas(ts => ts.map(x => (x.id === t.id ? { ...x, situacao } : x)))
    const { error } = await supabase.from('tarefas').update({ situacao, atualizado_em: new Date().toISOString() }).eq('id', t.id)
    if (error) { setErro(error.message); carregar() }
  }
  const somarHoras = async (t: Tarefa) => {
    const h = Number(prompt('Quantas horas trabalhou nesta tarefa agora?', '1')?.replace(',', '.'))
    if (!h || h <= 0) return
    await supabase.from('tarefas').update({ horas: Number(t.horas) + h }).eq('id', t.id); carregar()
  }

  const dependerDe = async (t: Tarefa, dep: string) => {
    if (dep === t.id) return
    setTarefas(ts => ts.map(x => (x.id === t.id ? { ...x, depende_de: dep || null } : x)))
    const { error } = await supabase.from('tarefas').update({ depende_de: dep || null }).eq('id', t.id)
    if (error) { setErro(error.message); carregar() }
  }
  // Caminho crítico e previsão de conclusão do projeto escolhido (Passo 30).
  const cronograma = useMemo(() => {
    if (!projeto) return null
    const p = tarefas.find(t => t.id === projeto)
    const inicio = (p?.criado_em ?? new Date().toISOString()).slice(0, 10)
    return caminhoCritico(visiveis.map(t => ({ id: t.id, titulo: t.titulo, prazo: t.prazo, situacao: t.situacao, depende_de: t.depende_de })), inicio)
  }, [projeto, tarefas, visiveis])
  const critico = new Set(cronograma?.caminho ?? [])
  const feitas = visiveis.filter(t => t.situacao === 'feito').length
  const atrasadas = visiveis.filter(t => t.situacao !== 'feito' && t.prazo && (diasAte(t.prazo) ?? 0) < 0).length
  const horas = visiveis.reduce((s, t) => s + Number(t.horas), 0)

  return (
    <Layout title="Projetos">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-5">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="filtro-area" className="block text-xs uppercase tracking-wider text-grafite mb-1">Área</label>
              <select id="filtro-area" value={filtroArea} onChange={e => { setFiltroArea(e.target.value); setProjeto('') }} className="border px-3 py-2">
                <option value="">Todas</option>{AREAS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="projeto" className="block text-xs uppercase tracking-wider text-grafite mb-1">Projeto</label>
              <select id="projeto" value={projeto} onChange={e => setProjeto(e.target.value)} className="border px-3 py-2 min-w-[220px]">
                <option value="">Todas as tarefas</option>
                {projetos.map(p => <option key={p.id} value={p.id}>{p.titulo}{p.numero_processo ? ` · ${p.numero_processo}` : ''}</option>)}
              </select>
            </div>
            {projeto && <button data-testid="link-cliente" onClick={linkCliente} className="min-h-[44px] px-4 border border-dourado text-navy text-sm uppercase tracking-wider">Link para o cliente</button>}
            <dl className="flex gap-6 text-sm">
              <div><dt className="text-grafite-claro">Concluído</dt><dd className="text-2xl font-serif text-navy" data-testid="progresso">{visiveis.length ? Math.round((feitas / visiveis.length) * 100) : 0}%</dd></div>
              <div><dt className="text-grafite-claro">Atrasadas</dt><dd className={`text-2xl font-serif ${atrasadas ? 'text-critico' : 'text-navy'}`}>{atrasadas}</dd></div>
              <div><dt className="text-grafite-claro">Horas</dt><dd className="text-2xl font-serif text-navy">{horas.toLocaleString('pt-BR')}</dd></div>
              {cronograma?.fimPrevisto && <div><dt className="text-grafite-claro">Conclusão prevista</dt><dd className={`text-2xl font-serif ${cronograma.atraso ? 'text-critico' : 'text-navy'}`} data-testid="fim-previsto">{formatarData(cronograma.fimPrevisto)}</dd></div>}
            </dl>
          </div>
          {cronograma && cronograma.caminho.length > 0 && (
            <p className="text-xs text-grafite mt-3" data-testid="caminho-critico">Caminho crítico ({cronograma.caminho.length} etapas{cronograma.atraso ? `, ${cronograma.atraso} dia(s) além do último prazo` : ', no prazo'}): {cronograma.caminho.map(id => titulo(id)).join(' → ')}. Etapas marcadas com ★ não podem atrasar sem atrasar o caso.</p>
          )}
          {linkPortal && <p className="text-xs text-grafite mt-3" data-testid="link-portal">Link copiado. O cliente vê só as etapas e os honorários, sem login: <a className="underline text-navy break-all" href={linkPortal} target="_blank" rel="noreferrer">{linkPortal}</a></p>}
        </section>

        {projeto && <AssinaturasCaso key={projeto} tarefaId={projeto} cliente={tarefas.find(t => t.id === projeto)?.cliente ?? null} />}

        <section aria-labelledby="t-caso" className="bg-white shadow-sm p-5">
          <h2 id="t-caso" className="text-lg mb-1 flex items-center gap-2"><FolderKanban size={18} className="text-dourado" aria-hidden="true" /> Novo caso pronto (com etapas e prazos)</h2>
          <p className="text-xs text-grafite-claro mb-3">Para cada processo, contrato, consultoria ou cliente que o escritório ganhar. Escolha o modelo e a plataforma cria o projeto com todas as etapas.</p>
          <div className="grid gap-3 sm:grid-cols-6">
            <select aria-label="Modelo" value={caso.modelo} onChange={e => setCaso({ ...caso, modelo: e.target.value })} className="border px-3 py-2 sm:col-span-2">
              {Object.entries(MODELOS).map(([k, m]) => <option key={k} value={k}>{m.nome}</option>)}
            </select>
            <select aria-label="Tipo" value={caso.tipo} onChange={e => setCaso({ ...caso, tipo: e.target.value })} className="border px-3 py-2 sm:col-span-2">
              {Object.entries(TIPOS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </select>
            <select aria-label="Área do caso" value={caso.area} onChange={e => setCaso({ ...caso, area: e.target.value })} className="border px-3 py-2 sm:col-span-2">
              {AREAS.map(a => <option key={a}>{a}</option>)}
            </select>
            <input aria-label="Cliente" placeholder="Cliente" value={caso.cliente} onChange={e => setCaso({ ...caso, cliente: e.target.value })} className="border px-3 py-2 sm:col-span-2" />
            <input aria-label="Número do processo" placeholder="Nº do processo (se houver)" value={caso.numero} onChange={e => setCaso({ ...caso, numero: e.target.value })} className="border px-3 py-2 sm:col-span-2" />
            <select aria-label="Responsável pelo caso" value={caso.responsavel_id} onChange={e => setCaso({ ...caso, responsavel_id: e.target.value })} className="border px-3 py-2 sm:col-span-2">
              <option value="">Responsável</option>{pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <input aria-label="Nome do caso" placeholder="Nome do caso (opcional)" value={caso.titulo} onChange={e => setCaso({ ...caso, titulo: e.target.value })} className="border px-3 py-2 sm:col-span-4" />
            <button data-testid="criar-caso" onClick={criarCaso} className="min-h-[44px] bg-dourado text-navy px-5 text-sm uppercase tracking-wider sm:col-span-2">Criar caso</button>
          </div>
        </section>

        <section aria-labelledby="t-novo" className="bg-white shadow-sm p-5">
          <h2 id="t-novo" className="text-lg mb-3 flex items-center gap-2"><Plus size={18} className="text-dourado" aria-hidden="true" /> Novo item avulso</h2>
          <div className="grid gap-3 sm:grid-cols-6">
            <input aria-label="Título" placeholder="Ex.: Renovatória da loja 3" value={novo.titulo} onChange={e => setNovo({ ...novo, titulo: e.target.value })} className="border px-3 py-2 sm:col-span-2" />
            <select aria-label="Nível" value={novo.nivel} onChange={e => setNovo({ ...novo, nivel: e.target.value })} className="border px-3 py-2">
              <option value="projeto">Projeto</option><option value="tarefa">Tarefa</option><option value="subtarefa">Subtarefa</option>
            </select>
            <select aria-label="Responsável" value={novo.responsavel_id} onChange={e => setNovo({ ...novo, responsavel_id: e.target.value })} className="border px-3 py-2">
              <option value="">Responsável</option>{pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <input aria-label="Prazo" type="date" value={novo.prazo} onChange={e => setNovo({ ...novo, prazo: e.target.value })} className="border px-3 py-2" />
            <select aria-label="Prioridade" value={novo.prioridade} onChange={e => setNovo({ ...novo, prioridade: e.target.value })} className="border px-3 py-2">
              <option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option>
            </select>
            <select aria-label="Imóvel" value={novo.imovel_id} onChange={e => setNovo({ ...novo, imovel_id: e.target.value })} className="border px-3 py-2 sm:col-span-2">
              <option value="">Sem imóvel ligado</option>{imoveis.map(i => <option key={i.id} value={i.id}>{i.endereco}</option>)}
            </select>
            <button onClick={criar} className="min-h-[44px] bg-navy text-white px-5 text-sm uppercase tracking-wider sm:col-span-1">Criar</button>
          </div>
          {novo.nivel !== 'projeto' && <p className="text-xs text-grafite-claro mt-2">{projeto ? <>Entra dentro de <strong>{titulo(projeto)}</strong>.</> : 'Escolha um projeto acima para colocar a tarefa dentro dele.'}</p>}
          {erro && <p role="alert" className="text-sm text-critico mt-2">{erro}</p>}
        </section>

        <div className="grid gap-4 md:grid-cols-4" aria-label="Quadro">
          {COLUNAS.map(c => (
            <section key={c.valor} aria-label={c.rotulo} className="bg-pergaminho p-3 min-h-[200px]"
              onDragOver={e => e.preventDefault()}
              onDrop={e => { const t = tarefas.find(x => x.id === e.dataTransfer.getData('text/plain')); if (t) mover(t, c.valor) }}>
              <h2 className="text-sm uppercase tracking-wider text-grafite mb-3">{c.rotulo} ({visiveis.filter(t => t.situacao === c.valor).length})</h2>
              <ul className="space-y-2">
                {visiveis.filter(t => t.situacao === c.valor).map(t => {
                  const dias = t.prazo ? diasAte(t.prazo) : null
                  return (
                    <li key={t.id} draggable onDragStart={e => e.dataTransfer.setData('text/plain', t.id)} className={`bg-white p-3 shadow-sm border-l-4 ${COR_PRIORIDADE[t.prioridade]} cursor-grab`}>
                      {t.pai_id && <p className="text-[11px] text-grafite-claro flex items-center gap-1">{titulo(t.pai_id)} <ChevronRight size={10} aria-hidden="true" /></p>}
                      <p className="text-sm text-navy font-medium">{critico.has(t.id) && <span title="Caminho crítico" className="text-dourado" data-testid="estrela-critico">★ </span>}{t.nivel === 'subtarefa' ? '↳ ' : ''}{t.titulo}</p>
                      {t.depende_de && <p className="text-[11px] text-grafite-claro">depende de: {titulo(t.depende_de)}{cronograma?.fins[t.id] && t.situacao !== 'feito' && cronograma.fins[t.id] !== t.prazo ? ` · previsto ${formatarData(cronograma.fins[t.id])}` : ''}</p>}
                      <p className="text-xs text-grafite-claro mt-1">{nome(t.responsavel_id)}{t.prazo && <> · <span className={dias !== null && dias < 0 && t.situacao !== 'feito' ? 'text-critico' : ''}>{formatarData(t.prazo)}</span></>}{Number(t.horas) > 0 && ` · ${t.horas} h`}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <select aria-label={`Mover ${t.titulo}`} value={t.situacao} onChange={e => mover(t, e.target.value as Situacao)} className="text-xs border px-1 py-0.5">
                          {COLUNAS.map(x => <option key={x.valor} value={x.valor}>{x.rotulo}</option>)}
                        </select>
                        <button onClick={() => somarHoras(t)} className="text-xs underline text-navy">+ horas</button>
                        {projeto && <select aria-label={`Depende de (${t.titulo})`} value={t.depende_de ?? ''} onChange={e => dependerDe(t, e.target.value)} className="text-xs border px-1 py-0.5 max-w-[150px]" data-testid="depende-de">
                          <option value="">Não depende</option>{visiveis.filter(x => x.id !== t.id).map(x => <option key={x.id} value={x.id}>{x.titulo}</option>)}
                        </select>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
        {!tarefas.length && <p className="text-sm text-grafite-claro flex items-center gap-2"><FolderKanban size={16} aria-hidden="true" /> Comece criando um projeto, por exemplo "Carteira Lagoa 2026", e depois as tarefas dentro dele.</p>}
      </div>
    </Layout>
  )
}
