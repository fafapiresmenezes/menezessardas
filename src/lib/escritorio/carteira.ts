// Carteira de processos (como o painel do Escavador/Jusbrasil): todos os processos do escritório numa tabela,
// com tribunal, última movimentação, tempo parado, intimações não lidas e filtros. E as funções do monitoramento
// que reduzem ruído: variações de grafia do nome, filtros "contém / não contém" e aviso de processo novo.
import { validarCnj } from '@/lib/ferramentas/documentos'
import { extrairNumeros, lerDescricao } from './importarProcessos'

export type CasoCarteira = { id: string; titulo: string; cliente: string | null; area: string | null; numero_processo: string | null; situacao: string; responsavel_id: string | null; descricao?: string | null; criado_em?: string; honorario_previsto?: number }
export type MonCarteira = { valor: string; tipo: string; ultimo_estado: { classe?: string | null; orgao?: string | null; encontrado?: boolean; chaves?: string[] } | null; novidades: { data: string; texto: string }[]; verificado_em: string | null }
export type IntimacaoCarteira = { numero_processo: string | null; lida: boolean; data_disponibilizacao: string; prazo_final?: string | null }

const so = (n: string | null | undefined) => (n ?? '').replace(/\D/g, '')
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()

export function tribunalDoNumero(n: string | null | undefined): string {
  const d = so(n)
  if (d.length !== 20) return 'Sem número'
  const v = validarCnj(d)
  const t = 'tribunal' in v ? String(v.tribunal ?? '') : ''
  return t || 'Outro'
}

/** Data (AAAA-MM-DD) do andamento mais recente que o robô já viu no DataJud. */
export function ultimaMovimentacao(m: MonCarteira | undefined): string | null {
  if (!m) return null
  const datas = [...(m.ultimo_estado?.chaves ?? []).map(c => c.split('|')[0]), ...(m.novidades ?? []).map(n => n.data)].map(d => String(d).slice(0, 10)).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
  return datas.length ? datas.sort()[datas.length - 1] : null
}

export function diasDesde(d: string | null, hoje: string): number | null {
  if (!d) return null
  return Math.round((Date.parse(`${hoje}T12:00:00Z`) - Date.parse(`${d}T12:00:00Z`)) / 86400000)
}

export type LinhaCarteira = CasoCarteira & { numero: string; tribunal: string; ultima: string | null; parado: number | null; monitorado: boolean; naoEncontrado: boolean; classe: string | null; orgao: string | null; intimacoesNaoLidas: number; proximoPrazo: string | null; parteContraria: string | null; fase: string | null; valorCausa: string | null }

export function montarCarteira(casos: CasoCarteira[], mons: MonCarteira[], ints: IntimacaoCarteira[], hoje: string): LinhaCarteira[] {
  const porNumero = new Map(mons.filter(m => m.tipo === 'processo').map(m => [so(m.valor), m]))
  return casos.map(c => {
    const numero = so(c.numero_processo)
    const m = numero ? porNumero.get(numero) : undefined
    const ultima = ultimaMovimentacao(m)
    const minhas = numero ? ints.filter(i => so(i.numero_processo) === numero) : []
    const prazos = minhas.map(i => i.prazo_final).filter((p): p is string => !!p && p >= hoje).sort()
    const extra = lerDescricao(c.descricao)
    return {
      ...c, numero, tribunal: tribunalDoNumero(numero), ultima, parado: diasDesde(ultima, hoje), monitorado: !!m,
      naoEncontrado: m?.ultimo_estado?.encontrado === false, classe: m?.ultimo_estado?.classe ?? null, orgao: m?.ultimo_estado?.orgao ?? extra['vara orgao'] ?? null,
      intimacoesNaoLidas: minhas.filter(i => !i.lida).length, proximoPrazo: prazos[0] ?? null,
      parteContraria: extra['parte contraria'] ?? null, fase: extra['fase'] ?? null, valorCausa: extra['valor da causa'] ?? null,
    }
  })
}

export type FiltroCarteira = { texto?: string; area?: string; tribunal?: string; situacao?: 'ativos' | 'encerrados' | 'todos'; responsavel?: string; alerta?: '' | 'parado90' | 'parado180' | 'intimacao' | 'sem_monitor' | 'nao_encontrado' }
export function filtrarCarteira(linhas: LinhaCarteira[], f: FiltroCarteira): LinhaCarteira[] {
  const t = norm(f.texto ?? '')
  const td = so(f.texto)
  return linhas.filter(l =>
    (!t || norm(`${l.titulo} ${l.cliente ?? ''} ${l.parteContraria ?? ''} ${l.classe ?? ''} ${l.orgao ?? ''}`).includes(t) || (td.length >= 4 && l.numero.includes(td))) &&
    (!f.area || l.area === f.area) && (!f.tribunal || l.tribunal === f.tribunal) && (!f.responsavel || l.responsavel_id === f.responsavel) &&
    (f.situacao === 'todos' || (f.situacao === 'encerrados' ? l.situacao === 'feito' : l.situacao !== 'feito')) &&
    (!f.alerta || (f.alerta === 'parado90' && (l.parado ?? 0) > 90) || (f.alerta === 'parado180' && (l.parado ?? 0) > 180) || (f.alerta === 'intimacao' && l.intimacoesNaoLidas > 0) ||
      (f.alerta === 'sem_monitor' && !!l.numero && !l.monitorado) || (f.alerta === 'nao_encontrado' && l.naoEncontrado)))
}

export function resumoCarteira(linhas: LinhaCarteira[]) {
  const ativos = linhas.filter(l => l.situacao !== 'feito')
  const contar = (chave: (l: LinhaCarteira) => string) => { const m = new Map<string, number>(); for (const l of ativos) m.set(chave(l), (m.get(chave(l)) ?? 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]) }
  return {
    total: linhas.length, ativos: ativos.length, encerrados: linhas.length - ativos.length,
    parados90: ativos.filter(l => (l.parado ?? 0) > 90).length, parados180: ativos.filter(l => (l.parado ?? 0) > 180).length,
    comIntimacao: ativos.filter(l => l.intimacoesNaoLidas > 0).length, semMonitor: ativos.filter(l => l.numero && !l.monitorado).length,
    naoEncontrados: ativos.filter(l => l.naoEncontrado).length, porTribunal: contar(l => l.tribunal), porArea: contar(l => l.area || 'Sem área'),
  }
}

// ---------- Monitoramento com menos ruído ----------
const PARTICULAS = new Set(['DA', 'DE', 'DO', 'DAS', 'DOS', 'E', "D'"])
const SOCIETARIOS: [RegExp, string[]][] = [[/\bLTDA\.?$/, ['LTDA', 'LIMITADA']], [/\bS\.?\/?A\.?$/, ['S/A', 'SA', 'S.A.']], [/\bEIRELI$/, ['EIRELI']], [/\bME$/, ['ME']]]

/** Variações de grafia de um nome, como o Escavador faz: sem acento, sem partículas, primeiro e último nome, abreviações. */
export function variacoesNome(nome: string): string[] {
  const base = norm(nome).replace(/[^\p{L}\s'./&-]/gu, '').trim()
  if (base.length < 4) return []
  const out = new Set<string>([nome.toUpperCase().replace(/\s+/g, ' ').trim(), base])
  for (const [re, formas] of SOCIETARIOS) if (re.test(base)) { const raiz = base.replace(re, '').trim(); for (const f of formas) out.add(`${raiz} ${f}`); out.add(raiz) }
  const partes = base.split(' ')
  const semParticulas = partes.filter(p => !PARTICULAS.has(p))
  if (semParticulas.length >= 2) {
    out.add(semParticulas.join(' '))
    out.add(`${semParticulas[0]} ${semParticulas[semParticulas.length - 1]}`)
    if (semParticulas.length >= 3) out.add([semParticulas[0], ...semParticulas.slice(1, -1).map(p => `${p[0]}.`), semParticulas[semParticulas.length - 1]].join(' '))
  }
  return [...out].filter(v => v.length >= 4 && v.length <= 200)
}

/** Filtra novidades com termos obrigatórios (todos precisam aparecer) e proibidos (nenhum pode aparecer). */
export function filtrarNovidades<T extends { texto: string }>(itens: T[], contem: string, naoContem: string): T[] {
  const lista = (s: string) => s.split(/[,;\n]/).map(x => norm(x)).filter(Boolean)
  const sim = lista(contem), nao = lista(naoContem)
  return itens.filter(i => { const t = norm(i.texto); return sim.every(x => t.includes(x)) && !nao.some(x => t.includes(x)) })
}

/** Processos que aparecem numa novidade e ainda não estão na carteira (nova ação distribuída em nome monitorado). */
export function processosNovos(texto: string, carteira: Set<string>): string[] {
  return [...new Set(extrairNumeros(texto))].filter(n => !carteira.has(n))
}
