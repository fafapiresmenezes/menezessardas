/**
 * Hierarquia do escritório (pedido do M, 12/11/2026): sócio, gestor, advogado pleno e júnior.
 * Cada pessoa é dona dos seus próprios processos; sócios e o gestor veem o conjunto.
 * Os cargos ficam nas configurações do escritório (chave "cargos", JSON { usuario_id: cargo });
 * cada escritório tem o seu mapa e toda a equipe consegue lê-lo. A `funcao` (admin/operador/leitor)
 * continua mandando no que cada um pode FAZER; o cargo manda no que cada um pode VER.
 */
import { supabase, supabaseConfigurado } from './supabase'
import { lerConfig, gravarConfig } from './config'

export type Cargo = 'socio' | 'gestor' | 'pleno' | 'junior'

export const CARGOS: Cargo[] = ['socio', 'gestor', 'pleno', 'junior']

export const rotuloCargo: Record<Cargo | 'nenhum', string> = {
  socio: 'Sócio(a)',
  gestor: 'Gestor(a)',
  pleno: 'Advogado(a) pleno',
  junior: 'Advogado(a) júnior',
  nenhum: 'Sem cargo definido',
}

export const descricaoCargo: Record<Cargo | 'nenhum', string> = {
  socio: 'Vê todos os processos e números do escritório.',
  gestor: 'Vê todos os processos e distribui o trabalho.',
  pleno: 'Vê e cuida dos próprios processos.',
  junior: 'Vê e cuida dos próprios processos, com supervisão.',
  nenhum: 'Enquanto não tiver cargo, vê só o que é seu.',
}

export type MapaCargos = Record<string, Cargo>

/** Quem está olhando: identidade, cargo e se enxerga o escritório inteiro. */
export type Alcance = { id: string; cargo: Cargo | null; admin: boolean; veTudo: boolean; /** Vê o dinheiro do escritório: sócio, administração ou quem o chefe liberou. */ financeiro?: boolean; /** Telas que o nível de cima escondeu de quem olha (cascata dos três níveis). */ ocultas?: string[] }

/**
 * Alcance mais estreito que existe: ninguém conhecido, nenhum cargo, nada além do que não tem dono.
 * É o valor com que as telas começam e o que usam quando não conseguem saber quem está logado:
 * errar para o lado de esconder é só um incômodo; errar para o lado de mostrar vaza o caso do colega.
 */
export const ALCANCE_FECHADO: Alcance = { id: '', cargo: null, admin: false, veTudo: false, financeiro: false }

/** Sócio e gestor enxergam o escritório inteiro; os demais, só o que é deles. */
export function veTudo(cargo: Cargo | null | undefined): boolean {
  return cargo === 'socio' || cargo === 'gestor'
}

/** Decide se quem olha (viewer) pode ver um item cujo dono é `responsavelId`.
 *  Item sem dono aparece para todos: alguém precisa assumi-lo. */
export function podeVer(viewer: { id: string; cargo: Cargo | null; admin?: boolean }, responsavelId: string | null | undefined): boolean {
  if (viewer.admin || veTudo(viewer.cargo)) return true
  if (!responsavelId) return true
  return responsavelId === viewer.id
}

export function filtrarPorHierarquia<T extends { responsavel_id?: string | null }>(
  itens: T[],
  viewer: { id: string; cargo: Cargo | null; admin?: boolean },
): T[] {
  return itens.filter(i => podeVer(viewer, i.responsavel_id ?? null))
}

/** Variante para tabelas que marcam o dono em usuario_id (checagens KYC, perfis de cliente, biblioteca pessoal). */
export function filtrarPorUsuario<T extends { usuario_id?: string | null }>(
  itens: T[],
  viewer: { id: string; cargo: Cargo | null; admin?: boolean },
): T[] {
  return itens.filter(i => podeVer(viewer, i.usuario_id ?? null))
}

/** Variante para tabelas que marcam o dono em criado_por (biblioteca de pesquisa). */
export function filtrarPorCriador<T extends { criado_por?: string | null }>(
  itens: T[],
  viewer: { id: string; cargo: Cargo | null; admin?: boolean },
): T[] {
  return itens.filter(i => podeVer(viewer, i.criado_por ?? null))
}

function limpar(mapa: unknown): MapaCargos {
  if (!mapa || typeof mapa !== 'object') return {}
  const saida: MapaCargos = {}
  for (const [id, cargo] of Object.entries(mapa as Record<string, unknown>)) {
    if (typeof cargo === 'string' && (CARGOS as string[]).includes(cargo)) saida[id] = cargo as Cargo
  }
  return saida
}

/** Lê o mapa { usuario_id: cargo } guardado em configuracoes.cargos. */
export async function lerCargos(): Promise<MapaCargos> {
  if (!supabaseConfigurado) return {}
  try {
    const { cargos } = await lerConfig(['cargos'])
    return limpar(cargos ? JSON.parse(cargos) : {})
  } catch { return {} }
}

/**
 * Lê o mapa de cargos SEM engolir erro. `lerCargos` devolve {} quando a leitura falha, o que serve para
 * mostrar a tela, mas não para gravar: gravar por cima de um {} que veio de uma falha apagaria o cargo
 * de todas as outras pessoas do escritório.
 */
export async function lerCargosEstrito(): Promise<MapaCargos> {
  if (!supabaseConfigurado) return {}
  const { cargos } = await lerConfig(['cargos'])
  if (!cargos) return {}
  let bruto: unknown
  try { bruto = JSON.parse(cargos) } catch { throw new Error('Não foi possível ler a hierarquia gravada. Nada foi alterado; tente de novo.') }
  return limpar(bruto)
}

/** Grava o cargo de uma pessoa (null tira o cargo). Só a administração chama isto. */
export async function definirCargo(usuarioId: string, cargo: Cargo | null): Promise<MapaCargos> {
  const atual = await lerCargosEstrito()
  if (cargo) atual[usuarioId] = cargo
  else delete atual[usuarioId]
  await gravarConfig({ cargos: JSON.stringify(atual) })
  return atual
}

/**
 * Financeiro (pedido de M, 19/11/2026): só o chefe vê o dinheiro do escritório, e só vê também quem o chefe liberar.
 * "Chefe" aqui é o sócio ou a administração do escritório. A lista de liberados fica nas configurações do
 * escritório (chave "financeiro_liberados", JSON com os ids). Se a lista não puder ser lida, ninguém a mais é liberado.
 */
export function podeVerFinanceiro(viewer: { id: string; cargo: Cargo | null; admin?: boolean }, liberados: string[]): boolean {
  return !!viewer.admin || viewer.cargo === 'socio' || (!!viewer.id && liberados.includes(viewer.id))
}

const limparLista = (bruto: unknown): string[] => (Array.isArray(bruto) ? bruto.filter((x): x is string => typeof x === 'string' && x !== '') : [])

/** Quem o chefe liberou para ver o financeiro. Falha de leitura devolve lista vazia (esconder incomoda, mostrar vaza). */
export async function lerLiberadosFinanceiro(): Promise<string[]> {
  if (!supabaseConfigurado) return []
  try {
    const { financeiro_liberados } = await lerConfig(['financeiro_liberados'])
    return limparLista(financeiro_liberados ? JSON.parse(financeiro_liberados) : [])
  } catch { return [] }
}

/** Libera (ou tira) uma pessoa do financeiro. Leitura estrita antes de gravar, para não apagar a lista por causa de uma falha. */
export async function definirLiberadoFinanceiro(usuarioId: string, liberar: boolean): Promise<string[]> {
  const { financeiro_liberados } = await lerConfig(['financeiro_liberados'])
  let atual: string[] = []
  if (financeiro_liberados) {
    try { atual = limparLista(JSON.parse(financeiro_liberados)) } catch { throw new Error('Não foi possível ler a lista do financeiro. Nada foi alterado; tente de novo.') }
  }
  const nova = liberar ? Array.from(new Set([...atual, usuarioId])) : atual.filter(id => id !== usuarioId)
  await gravarConfig({ financeiro_liberados: JSON.stringify(nova) })
  return nova
}

/**
 * Três níveis em cascata (pedido de M, 19/11/2026): chefe, gestor e advogado.
 * O chefe (sócio ou administração) define o que o gestor vê; o gestor define o que o advogado vê.
 * O advogado nunca vê o que foi escondido do gestor: o que o de cima não tem, não pode repassar.
 * Fica nas configurações do escritório (chave "visao_niveis", JSON { gestor: [telas], advogado: [telas] }),
 * guardando as telas ESCONDIDAS: uma tela nova nasce visível, como já era, até alguém a esconder.
 */
export type NivelHierarquia = 'chefe' | 'gestor' | 'advogado'
export type NivelAbaixo = 'gestor' | 'advogado'
export type MapaOcultas = Record<NivelAbaixo, string[]>
export const rotuloNivelHierarquia: Record<NivelHierarquia, string> = { chefe: 'Chefe (sócios e administração)', gestor: 'Gestor(a)', advogado: 'Advogado(a)' }
export const OCULTAS_VAZIAS: MapaOcultas = { gestor: [], advogado: [] }

export function nivelDe(viewer: { cargo: Cargo | null; admin?: boolean }): NivelHierarquia {
  if (viewer.admin || viewer.cargo === 'socio') return 'chefe'
  return viewer.cargo === 'gestor' ? 'gestor' : 'advogado'
}

/** O que está escondido de um nível: o do gestor vale também para o advogado. */
export function ocultasDoNivel(nivel: NivelHierarquia, mapa: MapaOcultas): string[] {
  if (nivel === 'chefe') return []
  if (nivel === 'gestor') return mapa.gestor
  return Array.from(new Set([...mapa.gestor, ...mapa.advogado]))
}

const limparOcultas = (bruto: unknown): MapaOcultas => {
  const o = (bruto && typeof bruto === 'object' ? bruto : {}) as Record<string, unknown>
  const telas = (x: unknown) => limparLista(x).filter(t => /^\/[a-z0-9/_-]{1,60}$/.test(t))
  return { gestor: telas(o.gestor), advogado: telas(o.advogado) }
}

/** Lê o que cada nível não vê. Se não der para ler, nada a mais é escondido: as regras de cargo e do banco continuam valendo. */
export async function lerOcultas(): Promise<MapaOcultas> {
  if (!supabaseConfigurado) return OCULTAS_VAZIAS
  try {
    const { visao_niveis } = await lerConfig(['visao_niveis'])
    return limparOcultas(visao_niveis ? JSON.parse(visao_niveis) : {})
  } catch { return OCULTAS_VAZIAS }
}

/** Grava as telas escondidas de UM nível. O banco confere quem pede: chefe grava os dois, gestor só o do advogado. */
export async function gravarOcultas(nivel: NivelAbaixo, telas: string[]): Promise<void> {
  const { error } = await supabase.rpc('visao_niveis_gravar', { p_nivel: nivel, p_ocultas: telas })
  if (error) throw new Error(/could not find the function|does not exist|PGRST202/i.test(`${error.code ?? ''} ${error.message ?? ''}`)
    ? 'O banco de dados ainda não recebeu a atualização dos três níveis (arquivo 144). Peça à administração para aplicar.'
    : error.message)
}

/** Cargo e visão de quem está logado, numa chamada só. */
export async function meuAlcance(): Promise<Alcance> {
  if (!supabaseConfigurado) return { id: 'demo', cargo: 'socio', admin: true, veTudo: true, financeiro: true }
  const [u, cargos, perfil, liberados, ocultas] = await Promise.all([
    Promise.resolve(supabase.auth?.getUser?.()).then(r => r?.data?.user?.id ?? '', () => ''),
    lerCargos(),
    Promise.resolve(supabase.rpc?.('perfil_atual')).then(r => (r?.data as string | null) ?? null, () => null),
    lerLiberadosFinanceiro(),
    lerOcultas(),
  ])
  const id = u
  const cargo = cargos[id] ?? null
  const admin = perfil === 'admin'
  // Sem cargo definido (ou sem saber quem está logado) vale o alcance mais estreito, nunca o mais largo:
  // a hierarquia do escritório ainda vai ser nomeada, e até lá cada pessoa vê o que é seu.
  return { id, cargo, admin, veTudo: admin || veTudo(cargo), financeiro: podeVerFinanceiro({ id, cargo, admin }, liberados), ocultas: ocultasDoNivel(nivelDe({ cargo, admin }), ocultas) }
}
