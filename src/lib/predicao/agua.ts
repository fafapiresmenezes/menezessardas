/**
 * Passo C3 do plano THEYE: a série de água da ANA, do lado do navegador.
 *
 * A coleta mora na Edge Function `ana-agua` (o navegador não alcança o esquema instituto, e a
 * chave que escreve lá nunca pode sair do servidor). Aqui ficam só o pedido, as contas do gráfico
 * e as frases honestas de cada estado — nada de número inventado quando a série está vazia.
 */
import { supabase } from '../supabase'

export const GRANDEZAS = [
  { subtipo: 'volume_util', nome: 'Volume útil', unidade: '%', oque: 'Quanto do volume que se pode usar ainda está lá, em por cento.' },
  { subtipo: 'cota', nome: 'Cota (nível da água)', unidade: 'm', oque: 'Altura da água no reservatório, em metros acima do nível do mar.' },
  { subtipo: 'afluencia', nome: 'Afluência (água entrando)', unidade: 'm³/s', oque: 'Água que está entrando no reservatório, em metros cúbicos por segundo.' },
  { subtipo: 'defluencia', nome: 'Defluência (água saindo)', unidade: 'm³/s', oque: 'Água que está saindo do reservatório, em metros cúbicos por segundo.' },
] as const

export type Subtipo = typeof GRANDEZAS[number]['subtipo']

export interface Ponto { dia: string; valor: number; unidade: string; observado_em: string; revisoes: number; atraso_horas: number }
export interface Reservatorio { chave_natural: string; nome: string; atributos: { sistema?: string | null; uf?: string | null; latitude?: number | null; longitude?: number | null } }
export interface Resposta { codigo: string; subtipo: string; de: string; ate: string; pontos: number; serie: Ponto[]; unidade: string | null; grandeza: string | null }

/** O que a tela mostra quando não tem o que mostrar. Cada caso tem a sua frase e o seu motivo. */
export type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'sem_coleta'; frase: string }
  | { tipo: 'erro'; frase: string }
  | { tipo: 'pronto'; serie: Ponto[] }

export const SEM_COLETA =
  'A ANA tem o dado, mas ele ainda não foi trazido para cá. A coleta roda no servidor (função ana-agua) e precisa ser disparada uma vez; até lá esta tela fica vazia de propósito, em vez de mostrar número inventado.'

export const lerReservatorios = async (): Promise<Reservatorio[]> => {
  const { data, error } = await supabase.functions.invoke('ana-agua', { body: { modo: 'serie' } })
  if (error) throw new Error('Não consegui falar com o servidor da água agora.')
  return (data?.reservatorios ?? []) as Reservatorio[]
}

export const lerSerie = async (codigo: string, subtipo: Subtipo, de: string, ate: string): Promise<Resposta> => {
  const { data, error } = await supabase.functions.invoke('ana-agua', { body: { modo: 'serie', codigo, subtipo, de, ate } })
  if (error) throw new Error('Não consegui falar com o servidor da água agora.')
  return data as Resposta
}

// --- Contas do gráfico ------------------------------------------------------------------------

/** Mínimo e máximo com uma folga de 5%, para a linha não encostar na borda. Série plana vira faixa. */
export function faixa(serie: Ponto[]): { min: number; max: number } {
  if (!serie.length) return { min: 0, max: 1 }
  const vs = serie.map(p => p.valor)
  const min = Math.min(...vs)
  const max = Math.max(...vs)
  if (min === max) return { min: min - Math.abs(min || 1) * 0.05, max: max + Math.abs(max || 1) * 0.05 }
  const folga = (max - min) * 0.05
  return { min: min - folga, max: max + folga }
}

/** Os pontos da série em coordenadas do SVG. Um ponto só fica no meio, e não na borda esquerda. */
export function coordenadas(serie: Ponto[], largura: number, altura: number): { x: number; y: number; p: Ponto }[] {
  const { min, max } = faixa(serie)
  const amplitude = max - min || 1
  return serie.map((p, i) => ({
    x: serie.length === 1 ? largura / 2 : (i / (serie.length - 1)) * largura,
    y: altura - ((p.valor - min) / amplitude) * altura,
    p,
  }))
}

export const caminho = (serie: Ponto[], largura: number, altura: number): string =>
  coordenadas(serie, largura, altura).map((c, i) => `${i ? 'L' : 'M'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')

/** Média do atraso da informação, em horas. É o que o nowcasting do C7 vai ter de engolir. */
export function atrasoMedio(serie: Ponto[]): number | null {
  if (!serie.length) return null
  return Math.round(serie.reduce((t, p) => t + p.atraso_horas, 0) / serie.length)
}

export const revisadas = (serie: Ponto[]): number => serie.filter(p => p.revisoes > 0).length

/** Variação do primeiro ao último ponto, na unidade da própria série. Nunca em por cento de por cento. */
export function variacao(serie: Ponto[]): { delta: number; unidade: string; sentido: 'subiu' | 'desceu' | 'igual' } | null {
  if (serie.length < 2) return null
  const delta = Math.round((serie[serie.length - 1].valor - serie[0].valor) * 100) / 100
  return { delta, unidade: serie[0].unidade, sentido: delta > 0 ? 'subiu' : delta < 0 ? 'desceu' : 'igual' }
}

export const dataBr = (iso: string): string => {
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

export const numeroBr = (v: number): string => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

/** Quantos dias faltam na série dentro do período pedido. Falha de coleta tem de ficar visível. */
export function diasSemDado(serie: Ponto[], de: string, ate: string): number {
  const inicio = new Date(`${de}T00:00:00-03:00`).getTime()
  const fim = new Date(`${ate}T00:00:00-03:00`).getTime()
  const esperados = Math.floor((fim - inicio) / 86400000) + 1
  return Math.max(0, esperados - serie.length)
}
