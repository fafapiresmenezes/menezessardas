/**
 * Fornecedores dos imóveis (limpeza, segurança, manutenção, hotelaria…):
 * cadastro, KYC (CNPJ na Receita via BrasilAPI, sanções CEIS/CNEP, certidões)
 * e SLA (metas, medição mensal, descumprimento) — S7.
 *
 * No modo demonstração fica no navegador; com Supabase, cada fornecedor é uma
 * linha da tabela `fornecedores` (dados em JSONB, ver migração 008).
 */
import { supabase, supabaseConfigurado } from './supabase'
import { diasAte, emDias } from './datas'
import { registrarEvento } from './trilha'

export type CategoriaFornecedor = 'limpeza' | 'seguranca' | 'manutencao' | 'hotelaria' | 'elevadores' | 'outro'

export const CATEGORIAS: { valor: CategoriaFornecedor; rotulo: string }[] = [
  { valor: 'limpeza', rotulo: 'Limpeza e conservação' },
  { valor: 'seguranca', rotulo: 'Segurança e portaria' },
  { valor: 'manutencao', rotulo: 'Manutenção predial' },
  { valor: 'hotelaria', rotulo: 'Hotelaria e enxoval' },
  { valor: 'elevadores', rotulo: 'Elevadores e equipamentos' },
  { valor: 'outro', rotulo: 'Outro serviço' },
]

export type ResultadoLista = 'nao_verificado' | 'limpo' | 'sancionado'

export interface Kyc {
  consultadoEm?: string
  razaoSocial?: string
  /** Situação cadastral na Receita, ex.: "ATIVA". */
  situacao?: string
  ceis: ResultadoLista
  cnep: ResultadoLista
  listasVerificadasEm?: string
}

export interface Certidao {
  id: string
  nome: string
  validade: string
}

export interface Medicao {
  /** aaaa-mm */
  mes: string
  valor: number
}

export interface SLA {
  id: string
  descricao: string
  unidade: string
  meta: number
  /** "minimo": o resultado deve ser ≥ meta; "maximo": deve ser ≤ meta. */
  sentido: 'minimo' | 'maximo'
  medicoes: Medicao[]
}

export interface Fornecedor {
  id: string
  nome: string
  cnpj: string
  categoria: CategoriaFornecedor
  imovelIds: string[]
  kyc: Kyc
  certidoes: Certidao[]
  slas: SLA[]
  notas: string
}

export const CERTIDOES_PADRAO = [
  'CND Federal (Receita e PGFN)',
  'CRF — FGTS',
  'CNDT — Trabalhista',
  'Certidão Estadual',
  'Certidão Municipal',
]

/* -------------------------------- CNPJ -------------------------------- */

export const soDigitos = (v: string) => v.replace(/\D/g, '')

export function formatarCnpj(v: string): string {
  const d = soDigitos(v).padStart(14, '0').slice(-14)
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

/** Valida os dois dígitos verificadores do CNPJ. */
export function cnpjValido(v: string): boolean {
  const d = soDigitos(v)
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false
  const dv = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const soma = base.split('').reduce((s, c, i) => s + Number(c) * pesos[i], 0)
    const r = soma % 11
    return r < 2 ? 0 : 11 - r
  }
  const d1 = dv(d.slice(0, 12))
  const d2 = dv(d.slice(0, 12) + d1)
  return d1 === Number(d[12]) && d2 === Number(d[13])
}

/** Consulta pública na Receita via BrasilAPI. Lança erro se estiver fora do ar ou bloqueada. */
export async function consultarCnpj(cnpj: string): Promise<{ razaoSocial: string; situacao: string }> {
  const d = soDigitos(cnpj)
  const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${d}`)
  if (resp.status === 404) throw new Error('CNPJ não encontrado na Receita Federal.')
  if (!resp.ok) throw new Error('A consulta à Receita não respondeu agora. Tente de novo em instantes.')
  const dados = await resp.json()
  return {
    razaoSocial: String(dados.razao_social ?? ''),
    situacao: String(dados.descricao_situacao_cadastral ?? '').toUpperCase(),
  }
}

/* --------------------------- Situação derivada --------------------------- */

export type NivelKyc = 'regular' | 'atencao' | 'critico'

export interface ResumoKyc {
  nivel: NivelKyc
  pendencias: string[]
}

/** KYC nunca é um campo gravado: sai das informações e das datas de hoje. */
export function resumoKyc(f: Fornecedor): ResumoKyc {
  const graves: string[] = []
  const leves: string[] = []

  if (!f.kyc.consultadoEm) leves.push('CNPJ ainda não consultado na Receita')
  else if (f.kyc.situacao && f.kyc.situacao !== 'ATIVA') graves.push(`CNPJ com situação ${f.kyc.situacao}`)

  for (const [lista, valor] of [['CEIS', f.kyc.ceis], ['CNEP', f.kyc.cnep]] as const) {
    if (valor === 'sancionado') graves.push(`Consta no ${lista} (sanção)`)
    else if (valor === 'nao_verificado') leves.push(`${lista} ainda não verificado`)
  }

  if (f.certidoes.length === 0) leves.push('Nenhuma certidão cadastrada')
  for (const c of f.certidoes) {
    const dias = diasAte(c.validade)
    if (dias !== null && dias < 0) graves.push(`${c.nome} vencida`)
    else if (dias !== null && dias <= 30) leves.push(`${c.nome} vence em ${dias} dia(s)`)
  }

  return {
    nivel: graves.length ? 'critico' : leves.length ? 'atencao' : 'regular',
    pendencias: [...graves, ...leves],
  }
}

export type StatusSla = 'cumprido' | 'descumprido' | 'sem_medicao'

export const mesAtual = () => emDias(0).slice(0, 7)

export function cumpreMeta(sla: SLA, valor: number): boolean {
  return sla.sentido === 'minimo' ? valor >= sla.meta : valor <= sla.meta
}

/** Status pela medição mais recente. */
export function statusSla(sla: SLA): { status: StatusSla; ultima?: Medicao } {
  const ordenadas = [...sla.medicoes].sort((a, b) => b.mes.localeCompare(a.mes))
  const ultima = ordenadas[0]
  if (!ultima) return { status: 'sem_medicao' }
  return { status: cumpreMeta(sla, ultima.valor) ? 'cumprido' : 'descumprido', ultima }
}

export interface AlertaFornecedor {
  fornecedorId: string
  fornecedor: string
  tipo: 'sla' | 'kyc'
  gravidade: 'critico' | 'atencao'
  texto: string
}

/** Alertas de descumprimento de SLA, medição do mês em falta e pendências graves de KYC. */
export function alertasFornecedores(lista: Fornecedor[]): AlertaFornecedor[] {
  const alertas: AlertaFornecedor[] = []
  const mes = mesAtual()
  for (const f of lista) {
    for (const s of f.slas) {
      const { status, ultima } = statusSla(s)
      if (status === 'descumprido' && ultima) {
        alertas.push({
          fornecedorId: f.id, fornecedor: f.nome, tipo: 'sla', gravidade: 'critico',
          texto: `SLA descumprido: ${s.descricao} (${ultima.valor}${s.unidade} em ${ultima.mes}, meta ${s.sentido === 'minimo' ? '≥' : '≤'} ${s.meta}${s.unidade})`,
        })
      } else if (!s.medicoes.some(m => m.mes === mes)) {
        alertas.push({
          fornecedorId: f.id, fornecedor: f.nome, tipo: 'sla', gravidade: 'atencao',
          texto: `Falta a medição de ${mes} do SLA: ${s.descricao}`,
        })
      }
    }
    const kyc = resumoKyc(f)
    if (kyc.nivel === 'critico') {
      for (const p of kyc.pendencias.slice(0, 2)) {
        alertas.push({ fornecedorId: f.id, fornecedor: f.nome, tipo: 'kyc', gravidade: 'critico', texto: p })
      }
    }
  }
  return alertas.sort((a, b) => (a.gravidade === b.gravidade ? 0 : a.gravidade === 'critico' ? -1 : 1))
}

/* ------------------------------- Armazenamento ------------------------------- */

const CHAVE = 'lsm-fornecedores-v1'
const novoId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
export const novoIdLocal = novoId

function semente(): Fornecedor[] {
  const m = (delta: number) => {
    const d = new Date()
    d.setMonth(d.getMonth() + delta)
    return d.toISOString().slice(0, 7)
  }
  return [
    {
      id: 'f1', nome: 'Brilho Limpeza e Conservação Ltda', cnpj: '11222333000181', categoria: 'limpeza',
      imovelIds: ['1', '3'], notas: 'Contrato de limpeza diária das áreas comuns.',
      kyc: { consultadoEm: emDias(-20), razaoSocial: 'BRILHO LIMPEZA E CONSERVACAO LTDA', situacao: 'ATIVA', ceis: 'limpo', cnep: 'limpo', listasVerificadasEm: emDias(-20) },
      certidoes: [
        { id: 'c1', nome: 'CND Federal (Receita e PGFN)', validade: emDias(120) },
        { id: 'c2', nome: 'CRF — FGTS', validade: emDias(18) },
        { id: 'c3', nome: 'CNDT — Trabalhista', validade: emDias(90) },
      ],
      slas: [
        { id: 's1', descricao: 'Limpeza das áreas comuns realizada no prazo', unidade: '%', meta: 95, sentido: 'minimo',
          medicoes: [{ mes: m(-2), valor: 97 }, { mes: m(-1), valor: 96 }, { mes: m(0), valor: 98 }] },
      ],
    },
    {
      id: 'f2', nome: 'Guarda Forte Segurança Patrimonial', cnpj: '45723174000110', categoria: 'seguranca',
      imovelIds: ['4'], notas: 'Vigilância 24h do hotel.',
      kyc: { consultadoEm: emDias(-90), razaoSocial: 'GUARDA FORTE SEGURANCA PATRIMONIAL LTDA', situacao: 'ATIVA', ceis: 'limpo', cnep: 'nao_verificado' },
      certidoes: [
        { id: 'c4', nome: 'CND Federal (Receita e PGFN)', validade: emDias(-12) },
        { id: 'c5', nome: 'CNDT — Trabalhista', validade: emDias(45) },
      ],
      slas: [
        { id: 's2', descricao: 'Tempo de resposta a ocorrências', unidade: ' min', meta: 10, sentido: 'maximo',
          medicoes: [{ mes: m(-2), valor: 8 }, { mes: m(-1), valor: 13 }, { mes: m(0), valor: 14 }] },
        { id: 's3', descricao: 'Rondas cumpridas', unidade: '%', meta: 98, sentido: 'minimo',
          medicoes: [{ mes: m(-1), valor: 99 }] },
      ],
    },
    {
      id: 'f3', nome: 'Elevax Manutenção de Elevadores', cnpj: '07526557000100', categoria: 'elevadores',
      imovelIds: ['1', '2', '3'], notas: '',
      kyc: { ceis: 'nao_verificado', cnep: 'nao_verificado' },
      certidoes: [],
      slas: [],
    },
  ]
}

function lerLocal(): Fornecedor[] {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (bruto) return JSON.parse(bruto) as Fornecedor[]
  } catch {
    // sem armazenamento: usa a semente
  }
  const inicial = semente()
  gravarLocal(inicial)
  return inicial
}

function gravarLocal(lista: Fornecedor[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista))
  } catch {
    // sessão só em memória
  }
}

export async function listarFornecedores(): Promise<Fornecedor[]> {
  if (supabaseConfigurado) {
    const { data, error } = await supabase.from('fornecedores').select('id, dados')
    if (error) throw error
    return (data ?? []).map(r => ({ ...(r.dados as Fornecedor), id: String(r.id) }))
  }
  return lerLocal()
}

export async function obterFornecedor(id: string): Promise<Fornecedor | null> {
  return (await listarFornecedores()).find(f => f.id === id) ?? null
}

/** Cria ou atualiza. Registra na trilha de auditoria. */
export async function salvarFornecedor(f: Fornecedor, resumo: string): Promise<void> {
  if (supabaseConfigurado) {
    const { id, ...dados } = f
    const { error } = await supabase.from('fornecedores').upsert({ id, dados })
    if (error) throw error
  } else {
    const lista = lerLocal()
    const idx = lista.findIndex(x => x.id === f.id)
    if (idx >= 0) lista[idx] = f
    else lista.push(f)
    gravarLocal(lista)
  }
  await registrarEvento({ tipo: 'fornecedor_atualizado', entidade: f.id, resumo })
}
