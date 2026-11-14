// Roteiro de audiência preenchido pelo advogado. Registra fatos observáveis com base no CPC
// (o que o juiz pode e deve considerar), nunca conclusões sobre sinceridade a partir do corpo ou do rosto.
import type { Depoimento } from './contradicoes'

export interface ItemRoteiro { id: string; texto: string; base?: string }
export interface GrupoRoteiro { id: string; titulo: string; itens: ItemRoteiro[] }

export const ROTEIRO: GrupoRoteiro[] = [
  { id: 'antes', titulo: 'Antes da audiência', itens: [
    { id: 'rol', texto: 'Rol de testemunhas apresentado no prazo', base: 'CPC, art. 357, §4º' },
    { id: 'intimacao', texto: 'Testemunhas intimadas pelo advogado, com comprovante juntado', base: 'CPC, art. 455, §1º' },
    { id: 'impedimento', texto: 'Conferir impedimento ou suspeição das testemunhas da outra parte', base: 'CPC, art. 447' },
    { id: 'perguntas', texto: 'Perguntas preparadas a partir das divergências e dos pontos não confirmados' },
    { id: 'docs', texto: 'Documentos que confrontam cada versão separados e numerados' },
  ] },
  { id: 'depoimento', titulo: 'Durante o depoimento', itens: [
    { id: 'notas', texto: 'A parte leu escritos preparados em vez de notas breves', base: 'CPC, art. 387' },
    { id: 'ouviu', texto: 'Testemunha ouviu o depoimento de outra antes de depor', base: 'CPC, art. 456' },
    { id: 'evasiva', texto: 'Recusou-se a responder ou respondeu com evasivas (pedir que conste em ata)', base: 'CPC, art. 386' },
    { id: 'versao', texto: 'Mudou a versão em relação à inicial, contestação ou depoimento anterior (anotar o trecho)' },
    { id: 'documento', texto: 'Afirmou algo que contraria documento dos autos (anotar folha)' },
    { id: 'indireto', texto: 'Disse que soube do fato por terceiros (testemunho indireto)' },
    { id: 'indeferida', texto: 'Pergunta indeferida: requerer a transcrição no termo', base: 'CPC, art. 459, §3º' },
  ] },
  { id: 'depois', titulo: 'Medidas cabíveis', itens: [
    { id: 'contradita', texto: 'Contraditar testemunha antes do compromisso', base: 'CPC, art. 457, §1º' },
    { id: 'acareacao', texto: 'Requerer acareação entre depoentes que divergem sobre fato relevante', base: 'CPC, art. 461, II' },
    { id: 'referida', texto: 'Requerer oitiva de testemunha referida', base: 'CPC, art. 461, I' },
    { id: 'confissao', texto: 'Apontar confissão ou pena de confesso nas alegações finais', base: 'CPC, arts. 385, §1º, e 389' },
    { id: 'memoriais', texto: 'Levar as divergências com trechos para os memoriais', base: 'CPC, art. 364, §2º' },
  ] },
]

export type Desfecho = 'procedente' | 'improcedente' | 'parcial' | 'acordo' | 'outro'

export interface LeituraCaso {
  id: string
  titulo: string
  acao: string
  tribunal: string
  orgao: string
  numero: string
  fatos: string
  lado: 'autor' | 'reu'
  valorPedido: number
  chanceManual: number | null
  custos: number
  sucumbenciaPct: number
  meses: number
  jurosMesPct: number
  proposta: number
  depoimentos: Depoimento[]
  roteiro: Record<string, boolean>
  notas: Record<string, string>
  ajustes: Record<string, number>
  chanceOutroLado: number | null
  custosOutro: number
  previsao: { chance: number; em: string } | null
  desfecho: Desfecho | null
  atualizadoEm: string
}

export const CHAVE_LEITURAS = 'lsm-leitura-caso-v1'

export function novaLeitura(): LeituraCaso {
  return {
    id: Math.random().toString(36).slice(2, 10), titulo: 'Novo caso', acao: 'despejo', tribunal: 'tjrj', orgao: '', numero: '', fatos: '',
    lado: 'autor', valorPedido: 0, chanceManual: null, custos: 0, sucumbenciaPct: 10, meses: 24, jurosMesPct: 1, proposta: 0,
    depoimentos: [{ id: 'd1', quem: '', texto: '' }, { id: 'd2', quem: '', texto: '' }], roteiro: {}, notas: {}, ajustes: {}, chanceOutroLado: null, custosOutro: 0, previsao: null, desfecho: null, atualizadoEm: new Date().toISOString(),
  }
}

export function lerLeituras(): LeituraCaso[] {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE_LEITURAS) || '[]')
    return Array.isArray(v) ? v.map(x => ({ ...novaLeitura(), ...x })) : []
  } catch { return [] }
}

export function gravarLeituras(l: LeituraCaso[]) {
  try { localStorage.setItem(CHAVE_LEITURAS, JSON.stringify(l)) } catch { /* sem memória local */ }
}
