// Passo 560 (D15 do Instituto THEYE): documentos que o imóvel precisa ter para a locação ficar regular,
// por função, vindos da ontologia v0.8 do Instituto (cópia fixa no código; sha256 abaixo).
import dados from '@/data/documentos-imovel-v08.json'
import type { TipoContrato, TipoImovel } from './dominio'

export const VERSAO_EXIGENCIAS = '0.8'
export const SHA_EXIGENCIAS = 'd72ec561234394d9de061c7dfdf8fd231353e75ed58de9259af708fc6cdd87a2'
export const NOTA_EXIGENCIAS: string = dados.nota

export type FuncaoImovel = 'residencial' | 'comercial' | 'galpao' | 'rural' | 'temporada'
export interface Exigencia { doc: string; quem: string; quando: string; norma: string; url: string; porque: string }
export interface Funcao { id: FuncaoImovel; nome: string; resumo: string; documentos: Exigencia[] }

export const FUNCOES = dados.funcoes as Funcao[]

/** Função do imóvel para o checklist: o contrato vigente manda; sem ele, o tipo do imóvel. */
export function funcaoDoImovel(tipo: TipoImovel, tipoContrato?: TipoContrato): FuncaoImovel {
  if (tipoContrato === 'locacao_temporada') return 'temporada'
  if (tipoContrato === 'arrendamento') return 'rural'
  if (tipo === 'galpao') return 'galpao'
  if (tipoContrato === 'locacao_residencial') return 'residencial'
  if (tipoContrato === 'locacao_comercial' || tipoContrato === 'built_to_suit') return 'comercial'
  return tipo === 'apartamento' || tipo === 'casa' ? 'residencial' : 'comercial'
}

const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const PARADAS = new Set(['de', 'do', 'da', 'dos', 'das', 'com', 'e', 'ou', 'a', 'o', 'para', 'por', 'em', 'no', 'na', 'atualizada', 'atualizado'])
const chaves = (t: string) => norm(t).split(/[^a-z0-9]+/).filter(p => p.length > 2 && !PARADAS.has(p))

/** Um documento conta como presente quando o nome de algum anexo traz as duas primeiras palavras-chave da exigência. */
export function presente(exigencia: string, anexos: string[]): boolean {
  const k = chaves(exigencia).slice(0, 2)
  if (!k.length) return false
  return anexos.some(a => { const n = norm(a); return k.every(p => n.includes(p)) })
}

export function checklistDaFuncao(funcao: FuncaoImovel, anexos: string[]) {
  const f = FUNCOES.find(x => x.id === funcao)!
  return { funcao: f, itens: f.documentos.map(e => ({ ...e, ok: presente(e.doc, anexos) })) }
}
