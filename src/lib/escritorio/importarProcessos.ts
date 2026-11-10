// Importação de processos anteriores: o escritório traz a carteira que já tem (planilha, lista de números,
// intimações das suas OABs ou busca no Escavador) e não começa do zero. Tudo validado antes de gravar:
// dígito verificador CNJ, duplicados no arquivo e processos que já estão na carteira.
import { validarCnj } from '@/lib/ferramentas/documentos'

export type Campo = 'numero' | 'cliente' | 'parte_contraria' | 'area' | 'vara' | 'valor_causa' | 'fase' | 'honorarios' | 'observacoes' | 'titulo'
export type Situacao = 'ok' | 'duplicado_arquivo' | 'ja_cadastrado' | 'invalido' | 'sem_numero'
export type LinhaImportacao = {
  linha: number
  numero: string // 20 dígitos, ou '' quando não houver
  formatado: string
  tribunal: string
  dados: Partial<Record<Campo, string>>
  situacao: Situacao
  motivo?: string
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

// Cabeçalhos aceitos (como escritórios costumam nomear as colunas no Excel, no Astrea, no Projuris etc.).
const APELIDOS: Record<Campo, string[]> = {
  numero: ['numero', 'numero do processo', 'n do processo', 'no do processo', 'processo', 'numero cnj', 'cnj', 'autos', 'numero dos autos', 'n processo'],
  cliente: ['cliente', 'nome do cliente', 'parte', 'nosso cliente', 'contratante', 'autor cliente'],
  parte_contraria: ['parte contraria', 'contraparte', 'parte adversa', 'reu', 'adverso', 'outra parte', 'polo passivo'],
  area: ['area', 'area do direito', 'materia', 'ramo'],
  vara: ['vara', 'orgao', 'orgao julgador', 'juizo', 'comarca', 'vara comarca', 'foro'],
  valor_causa: ['valor da causa', 'valor causa', 'valor', 'valor discutido'],
  fase: ['fase', 'situacao', 'status', 'etapa', 'andamento'],
  honorarios: ['honorarios', 'honorario', 'honorarios contratados', 'valor dos honorarios', 'honorarios previstos'],
  observacoes: ['observacoes', 'obs', 'observacao', 'notas', 'anotacoes', 'comentarios'],
  titulo: ['titulo', 'nome do caso', 'caso', 'acao', 'tipo de acao', 'classe'],
}

export function campoDoCabecalho(cab: string): Campo | null {
  const n = norm(cab)
  for (const [campo, lista] of Object.entries(APELIDOS) as [Campo, string[]][]) if (lista.includes(n)) return campo
  for (const [campo, lista] of Object.entries(APELIDOS) as [Campo, string[]][]) if (lista.some(a => a.length > 4 && n.startsWith(a))) return campo
  return null
}

/** Separador mais provável: tabulação (copiado do Excel), ponto e vírgula ou vírgula. */
export function separador(linha: string): string {
  const cont = (c: string) => linha.split(c).length - 1
  if (cont('\t') > 0) return '\t'
  return cont(';') >= cont(',') ? ';' : ','
}

export function dividirLinha(linha: string, sep: string): string[] {
  const out: string[] = []; let cur = ''; let aspas = false
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]
    if (c === '"') { if (aspas && linha[i + 1] === '"') { cur += '"'; i++ } else aspas = !aspas }
    else if (c === sep && !aspas) { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out.map(x => x.trim())
}

const RE_CNJ = /\d{7}[-.\s]?\d{2}[-.\s]?\d{4}[-.\s]?\d[-.\s]?\d{2}[-.\s]?\d{4}/g

/** Todos os números CNJ que aparecem num texto livre (com ou sem máscara). */
export function extrairNumeros(texto: string): string[] {
  return (texto.match(RE_CNJ) ?? []).map(n => n.replace(/\D/g, ''))
}

export function formatarCnj(d: string): string {
  const n = d.replace(/\D/g, '')
  return n.length === 20 ? `${n.slice(0, 7)}-${n.slice(7, 9)}.${n.slice(9, 13)}.${n.slice(13, 14)}.${n.slice(14, 16)}.${n.slice(16)}` : d
}

/** Valor em reais escrito como "R$ 1.234,56", "1234.56" ou "1234,56". */
export function lerValor(v: string | undefined): number {
  if (!v) return 0
  let s = v.replace(/[^\d,.-]/g, '')
  if (!s) return 0
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if ((s.match(/\./g) ?? []).length > 1) s = s.replace(/\./g, '')
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0
}

function classificar(numero: string, vistos: Set<string>, existentes: Set<string>): Pick<LinhaImportacao, 'situacao' | 'motivo' | 'tribunal' | 'formatado'> {
  if (!numero) return { situacao: 'sem_numero', motivo: 'Sem número de processo: entra como caso sem número (ex.: consultivo).', tribunal: '', formatado: '' }
  const v = validarCnj(numero)
  const formatado = formatarCnj(numero)
  const tribunal = 'tribunal' in v && v.tribunal ? String(v.tribunal) : ''
  if (!v.valido) return { situacao: 'invalido', motivo: v.motivo, tribunal, formatado }
  if (existentes.has(numero)) return { situacao: 'ja_cadastrado', motivo: 'Já está na carteira.', tribunal, formatado }
  if (vistos.has(numero)) return { situacao: 'duplicado_arquivo', motivo: 'Repetido nesta importação.', tribunal, formatado }
  return { situacao: 'ok', tribunal, formatado }
}

/** Planilha (CSV, ou colada do Excel) com cabeçalho. Se não houver coluna de número, procura o número em qualquer coluna. */
export function analisarPlanilha(texto: string, existentes: Iterable<string> = []): { linhas: LinhaImportacao[]; colunas: (Campo | null)[]; cabecalho: string[]; erro?: string } {
  const brutas = texto.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim())
  if (brutas.length < 2) return { linhas: [], colunas: [], cabecalho: [], erro: 'A planilha precisa de uma linha de cabeçalho e pelo menos uma linha de processo.' }
  const sep = separador(brutas[0])
  const cabecalho = dividirLinha(brutas[0], sep)
  const colunas = cabecalho.map(campoDoCabecalho)
  const temNumero = colunas.includes('numero')
  const temAlgo = colunas.some(Boolean)
  if (!temAlgo && !extrairNumeros(brutas[0]).length) return { linhas: [], colunas, cabecalho, erro: 'Não reconheci nenhuma coluna. Use o modelo (Número do processo; Cliente; Parte contrária; Área; Vara; Valor da causa; Fase; Honorários; Observações).' }
  const ex = new Set([...existentes].map(n => n.replace(/\D/g, '')))
  const vistos = new Set<string>()
  const linhas: LinhaImportacao[] = []
  brutas.slice(1).forEach((l, i) => {
    const partes = dividirLinha(l, sep)
    if (!partes.some(Boolean)) return
    const dados: Partial<Record<Campo, string>> = {}
    colunas.forEach((c, j) => { if (c && partes[j]) dados[c] = partes[j] })
    let numero = (dados.numero ?? '').replace(/\D/g, '')
    if (!temNumero) numero = extrairNumeros(l)[0] ?? ''
    const c = classificar(numero, vistos, ex)
    if (c.situacao === 'ok') vistos.add(numero)
    linhas.push({ linha: i + 2, numero, dados, ...c })
  })
  return { linhas, colunas, cabecalho }
}

/** Lista de números colada (um por linha, separados por vírgula ou soltos no meio de um texto). */
export function analisarLista(texto: string, existentes: Iterable<string> = []): LinhaImportacao[] {
  const ex = new Set([...existentes].map(n => n.replace(/\D/g, '')))
  const vistos = new Set<string>()
  const linhas: LinhaImportacao[] = []
  const encontrados = extrairNumeros(texto)
  // Sequências de 7 ou mais dígitos que não formam um número CNJ completo viram aviso.
  const resto = texto.replace(RE_CNJ, ' ')
  for (const t of resto.match(/\d[\d.\-/]{5,}\d/g) ?? []) {
    const d = t.replace(/\D/g, '')
    if (d.length >= 7) linhas.push({ linha: linhas.length + 1, numero: d, formatado: t.trim(), tribunal: '', dados: {}, situacao: 'invalido', motivo: 'O número CNJ tem 20 dígitos.' })
  }
  for (const numero of encontrados) {
    const c = classificar(numero, vistos, ex)
    if (c.situacao === 'ok') vistos.add(numero)
    linhas.push({ linha: linhas.length + 1, numero, dados: {}, ...c })
  }
  return linhas
}

/** Monta as linhas a partir de resultados já estruturados (intimações do DJEN ou Escavador). */
export function analisarResultados(itens: { numero: string; titulo?: string; tribunal?: string; vara?: string; cliente?: string }[], existentes: Iterable<string> = []): LinhaImportacao[] {
  const ex = new Set([...existentes].map(n => n.replace(/\D/g, '')))
  const vistos = new Set<string>()
  return itens.map((it, i) => {
    const numero = (it.numero ?? '').replace(/\D/g, '')
    const c = classificar(numero, vistos, ex)
    if (c.situacao === 'ok') vistos.add(numero)
    return { linha: i + 1, numero, dados: { titulo: it.titulo, vara: it.vara, cliente: it.cliente }, ...c, tribunal: c.tribunal || it.tribunal || '' }
  })
}

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  ok: 'Pronto para importar', sem_numero: 'Sem número', duplicado_arquivo: 'Repetido', ja_cadastrado: 'Já cadastrado', invalido: 'Número inválido',
}
export const importavel = (l: LinhaImportacao) => l.situacao === 'ok' || l.situacao === 'sem_numero'

const AREAS_CONHECIDAS = ['Imobiliário', 'Cível', 'Trabalhista', 'Família e sucessões', 'Tributário', 'Empresarial', 'Consumidor', 'Previdenciário', 'Penal', 'Compliance']
export function areaProvavel(l: LinhaImportacao): string {
  const dado = l.dados.area ? AREAS_CONHECIDAS.find(a => norm(a).startsWith(norm(l.dados.area!).slice(0, 5))) : undefined
  if (dado) return dado
  const j = l.numero[13]
  if (j === '5') return 'Trabalhista'
  if (l.dados.area) return l.dados.area
  const t = norm(`${l.dados.titulo ?? ''} ${l.dados.observacoes ?? ''}`)
  if (/despejo|locac|aluguel|renovatoria|condominio|usucapiao/.test(t)) return 'Imobiliário'
  if (/alimentos|divorcio|inventario|guarda/.test(t)) return 'Família e sucessões'
  if (/execucao fiscal|tribut|icms|iss /.test(t)) return 'Tributário'
  if (/consumidor|indenizat|dano moral/.test(t)) return 'Consumidor'
  return 'Cível'
}

/** Descrição do caso com os dados extras em "Chave: valor" (aparece no caso e é lida de volta pela carteira). */
export function descricaoDoCaso(l: LinhaImportacao, origem: string): string {
  const d = l.dados
  return [
    d.parte_contraria && `Parte contrária: ${d.parte_contraria}`,
    (d.vara || l.tribunal) && `Vara/órgão: ${[d.vara, l.tribunal].filter(Boolean).join(' · ')}`,
    d.valor_causa && `Valor da causa: ${d.valor_causa}`,
    d.fase && `Fase: ${d.fase}`,
    d.observacoes && `Observações: ${d.observacoes}`,
    `Importado em ${new Date().toLocaleDateString('pt-BR')} (${origem}).`,
  ].filter(Boolean).join('\n')
}

export function lerDescricao(descricao: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  for (const l of (descricao ?? '').split('\n')) { const m = l.match(/^([^:]{2,30}):\s*(.+)$/); if (m) out[norm(m[1])] = m[2].trim() }
  return out
}

const FEITO = /arquivad|baixad|transitad|encerrad|extint|finalizad|concluid/
export type NovoCaso = { titulo: string; nivel: 'projeto'; tipo: 'caso'; area: string; cliente: string | null; numero_processo: string | null; descricao: string; honorario_previsto: number; situacao: 'a_fazer' | 'fazendo' | 'feito'; prioridade: 'media'; responsavel_id: string | null }

export function paraCaso(l: LinhaImportacao, origem: string, responsavel: string | null = null): NovoCaso {
  const cliente = l.dados.cliente?.trim() || null
  const base = l.dados.titulo?.trim() || (l.dados.parte_contraria ? `${cliente ?? 'Cliente'} x ${l.dados.parte_contraria}` : cliente ? `Processo · ${cliente}` : `Processo ${l.formatado || 'sem número'}`)
  return {
    titulo: base.slice(0, 200), nivel: 'projeto', tipo: 'caso', area: areaProvavel(l), cliente,
    numero_processo: l.numero && l.situacao === 'ok' ? l.formatado : null,
    descricao: descricaoDoCaso(l, origem), honorario_previsto: lerValor(l.dados.honorarios),
    situacao: FEITO.test(norm(l.dados.fase ?? '')) ? 'feito' : 'fazendo', prioridade: 'media', responsavel_id: responsavel,
  }
}

export const MODELO_PLANILHA = [
  'Número do processo;Cliente;Parte contrária;Área;Vara;Valor da causa;Fase;Honorários;Observações',
  '0001234-56.2023.8.19.0001;Maria Exemplo;Imobiliária Exemplo Ltda;Imobiliário;5ª Vara Cível da Capital;R$ 25.000,00;Instrução;R$ 6.000,00;Despejo por falta de pagamento',
  ';João Exemplo;;Família e sucessões;;;Consultivo;R$ 3.000,00;Planejamento sucessório (sem processo)',
].join('\n') + '\n'
