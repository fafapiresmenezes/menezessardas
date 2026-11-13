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
export type Alcance = { id: string; cargo: Cargo | null; admin: boolean; veTudo: boolean }

/**
 * Alcance mais estreito que existe: ninguém conhecido, nenhum cargo, nada além do que não tem dono.
 * É o valor com que as telas começam e o que usam quando não conseguem saber quem está logado:
 * errar para o lado de esconder é só um incômodo; errar para o lado de mostrar vaza o caso do colega.
 */
export const ALCANCE_FECHADO: Alcance = { id: '', cargo: null, admin: false, veTudo: false }

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

/** Grava o cargo de uma pessoa (null tira o cargo). Só a administração chama isto. */
export async function definirCargo(usuarioId: string, cargo: Cargo | null): Promise<MapaCargos> {
  const atual = await lerCargos()
  if (cargo) atual[usuarioId] = cargo
  else delete atual[usuarioId]
  await gravarConfig({ cargos: JSON.stringify(atual) })
  return atual
}

/** Cargo e visão de quem está logado, numa chamada só. */
export async function meuAlcance(): Promise<Alcance> {
  if (!supabaseConfigurado) return { id: 'demo', cargo: 'socio', admin: true, veTudo: true }
  const [u, cargos, perfil] = await Promise.all([
    Promise.resolve(supabase.auth?.getUser?.()).then(r => r?.data?.user?.id ?? '', () => ''),
    lerCargos(),
    Promise.resolve(supabase.rpc?.('perfil_atual')).then(r => (r?.data as string | null) ?? null, () => null),
  ])
  const id = u
  const cargo = cargos[id] ?? null
  const admin = perfil === 'admin'
  // Sem cargo definido (ou sem saber quem está logado) vale o alcance mais estreito, nunca o mais largo:
  // a hierarquia do escritório ainda vai ser nomeada, e até lá cada pessoa vê o que é seu.
  return { id, cargo, admin, veTudo: admin || veTudo(cargo) }
}
