// Migração do sistema antigo: o escritório solta aqui, de uma vez, tudo o que tinha em outro lugar
// (planilhas do Excel com várias abas, CSV, TSV, texto colado, PDF, Word, LibreOffice, JSON, calendário .ics
// e as "planilhas" .xls que muitos sistemas jurídicos exportam em HTML). Cada aba é lida, reconhecida
// (processos, clientes, prazos ou financeiro) e organizada antes de gravar. Nenhuma coluna se perde:
// o que não tem lugar próprio vai para as observações do registro.
import { analisarPlanilha, campoDoCabecalho, extrairNumeros, formatarCnj, lerValor, type LinhaImportacao } from './importarProcessos'
import { validarCnj } from '@/lib/ferramentas/documentos'

export type Tipo = 'processos' | 'clientes' | 'prazos' | 'financeiro' | 'ignorar'
export const TIPOS: { valor: Tipo; rotulo: string; destino: string }[] = [
  { valor: 'processos', rotulo: 'Processos', destino: 'viram casos em Projetos e entram no acompanhamento do CNJ' },
  { valor: 'clientes', rotulo: 'Clientes e contatos', destino: 'vão para o Funil de clientes como "Contrato fechado"' },
  { valor: 'prazos', rotulo: 'Prazos e audiências', destino: 'vão para a Agenda, com aviso antes da data' },
  { valor: 'financeiro', rotulo: 'Financeiro', destino: 'viram lançamentos em Financeiro (a receber e a pagar)' },
  { valor: 'ignorar', rotulo: 'Não trazer', destino: 'fica de fora' },
]

/** Uma tabela lida de um arquivo (uma aba da planilha, ou o texto de um PDF/Word). */
export type Tabela = { id: string; arquivo: string; aba: string; cabecalho: string[]; linhas: string[][]; tipo: Tipo; porque: string; textoLivre?: boolean }

export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

// ---------- Leitura das linhas ----------

function separador(linha: string): string {
  const cont = (c: string) => linha.split(c).length - 1
  if (cont('\t') > 0) return '\t'
  return cont(';') >= cont(',') ? ';' : ','
}
function dividir(linha: string, sep: string): string[] {
  const out: string[] = []; let cur = ''; let aspas = false
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]
    if (c === '"') { if (aspas && linha[i + 1] === '"') { cur += '"'; i++ } else aspas = !aspas }
    else if (c === sep && !aspas) { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out.map(x => x.replace(/\s+/g, ' ').trim())
}

/** Texto com colunas (tabulação, ponto e vírgula ou vírgula) em linhas de células. */
export function textoEmLinhas(texto: string): string[][] {
  const brutas = texto.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim())
  if (!brutas.length) return []
  const sep = separador(brutas.slice(0, 5).sort((a, b) => b.length - a.length)[0])
  return brutas.map(l => dividir(l, sep))
}

/** Parece tabela? (duas linhas ou mais, quase todas com o mesmo número de colunas, e pelo menos duas colunas) */
export function pareceTabela(linhas: string[][]): boolean {
  if (linhas.length < 2) return false
  const larguras = linhas.slice(0, 30).map(l => l.length)
  const moda = larguras.sort((a, b) => larguras.filter(x => x === b).length - larguras.filter(x => x === a).length)[0]
  return moda >= 2 && larguras.filter(x => x === moda).length >= Math.ceil(larguras.length * 0.6)
}

// ---------- Reconhecimento das colunas ----------

type CampoExtra = 'data' | 'descricao' | 'local' | 'valor' | 'tipo_fin' | 'categoria' | 'pago' | 'nome' | 'documento' | 'email' | 'telefone' | 'endereco'
const EXTRAS: Record<CampoExtra, string[]> = {
  data: ['data', 'prazo', 'data do prazo', 'prazo fatal', 'data fatal', 'data limite', 'vencimento', 'data de vencimento', 'dia', 'data da audiencia', 'audiencia', 'data do evento', 'quando', 'data final', 'data prevista', 'data inicio', 'data de inicio', 'data compromisso', 'dt prazo', 'dt vencimento'],
  descricao: ['descricao', 'tarefa', 'compromisso', 'evento', 'titulo', 'assunto', 'providencia', 'atividade', 'o que fazer', 'historico', 'tipo de prazo', 'tipo do prazo', 'tipo de compromisso', 'detalhe', 'detalhes'],
  local: ['local', 'onde', 'sala', 'endereco da audiencia', 'link', 'link da audiencia'],
  valor: ['valor', 'valor r', 'valor rs', 'montante', 'total', 'quantia', 'valor pago', 'valor recebido', 'valor previsto', 'valor da parcela', 'parcela', 'entrada', 'saida', 'credito', 'debito'],
  tipo_fin: ['tipo', 'natureza', 'receita despesa', 'entrada saida', 'operacao', 'movimento', 'tipo de lancamento'],
  categoria: ['categoria', 'centro de custo', 'conta', 'plano de contas', 'classificacao'],
  pago: ['pago', 'pago em', 'data pagamento', 'data de pagamento', 'data do pagamento', 'recebido', 'recebido em', 'quitado', 'baixa', 'data baixa', 'liquidado'],
  nome: ['nome', 'cliente', 'nome do cliente', 'razao social', 'nome completo', 'contato', 'nome razao social', 'pessoa', 'nome fantasia'],
  documento: ['cpf', 'cnpj', 'cpf cnpj', 'cpf ou cnpj', 'documento', 'doc', 'rg', 'cnpj cpf'],
  email: ['email', 'e mail', 'correio eletronico', 'email principal'],
  telefone: ['telefone', 'tel', 'celular', 'whatsapp', 'fone', 'telefones', 'contato telefonico', 'telefone celular'],
  endereco: ['endereco', 'logradouro', 'cidade', 'bairro', 'cep', 'uf', 'estado', 'municipio'],
}
const NOMES_TIPO: Record<Exclude<Tipo, 'ignorar'>, RegExp> = {
  processos: /process|acao|acoes|carteira|caso|ativo|jud|contencios|autos/,
  clientes: /client|contato|pessoa|cadastro/,
  prazos: /prazo|agenda|audienc|compromiss|pericia|calendario|tarefa/,
  financeiro: /financ|honorar|receita|despesa|pagament|lancament|caixa|faturament|cobranc|recebiment|conta/,
}

export function campoExtra(cab: string): CampoExtra | null {
  const n = norm(cab)
  if (!n) return null
  for (const [c, lista] of Object.entries(EXTRAS) as [CampoExtra, string[]][]) if (lista.includes(n)) return c
  for (const [c, lista] of Object.entries(EXTRAS) as [CampoExtra, string[]][]) if (lista.some(a => a.length > 3 && (n.startsWith(a + ' ') || n.endsWith(' ' + a)))) return c
  return null
}
const reconhecido = (cab: string) => !!campoDoCabecalho(cab) || !!campoExtra(cab)

/** Em muitas planilhas o cabeçalho não está na primeira linha (título, data de emissão...). Procura nas 15 primeiras. */
export function acharCabecalho(linhas: string[][]): number {
  let melhor = -1, nota = 0
  for (let i = 0; i < Math.min(15, linhas.length - 1); i++) {
    const cheias = linhas[i].filter(Boolean)
    if (cheias.length < 2) continue
    const n = cheias.filter(reconhecido).length - cheias.filter(c => extrairNumeros(c).length > 0).length * 2
    if (n > nota) { nota = n; melhor = i }
  }
  if (melhor >= 0) return melhor
  return Math.max(0, linhas.findIndex(l => l.filter(Boolean).length >= 2))
}

const indice = (cab: string[], f: (c: string) => boolean) => cab.findIndex(f)
export function colunasDe(cab: string[]) {
  const proc = (c: string) => cab.findIndex(h => campoDoCabecalho(h) === c)
  const ex = (c: CampoExtra) => cab.findIndex(h => !campoDoCabecalho(h) && campoExtra(h) === c)
  const exQualquer = (c: CampoExtra) => cab.findIndex(h => campoExtra(h) === c)
  return {
    numero: proc('numero'), cliente: proc('cliente'), titulo: proc('titulo'), observacoes: proc('observacoes'),
    data: exQualquer('data'), descricao: ex('descricao'), local: ex('local'), valor: exQualquer('valor'), tipo_fin: ex('tipo_fin'), categoria: ex('categoria'), pago: exQualquer('pago'),
    nome: indice(cab, h => campoExtra(h) === 'nome' || campoDoCabecalho(h) === 'cliente'), documento: ex('documento'), email: ex('email'), telefone: ex('telefone'), endereco: ex('endereco'),
  }
}

/** Decide o que cada aba é, com o motivo em palavras simples. */
export function classificar(t: Pick<Tabela, 'aba' | 'arquivo' | 'cabecalho' | 'linhas' | 'textoLivre'>): { tipo: Tipo; porque: string } {
  if (t.textoLivre) return t.linhas.length ? { tipo: 'processos', porque: `achei ${t.linhas.length} número(s) de processo no texto` } : { tipo: 'ignorar', porque: 'não achei número de processo no texto' }
  if (!t.linhas.length) return { tipo: 'ignorar', porque: 'aba vazia' }
  const c = colunasDe(t.cabecalho)
  const nome = norm(`${t.aba} ${t.arquivo}`)
  const comCnj = t.linhas.filter(l => l.some(x => extrairNumeros(x).length)).length / t.linhas.length
  const camposProc = t.cabecalho.filter(h => { const k = campoDoCabecalho(h); return k && k !== 'numero' && k !== 'observacoes' && k !== 'valor_causa' && k !== 'honorarios' }).length
  const nota: Record<Exclude<Tipo, 'ignorar'>, number> = {
    processos: (c.numero >= 0 ? 3 : 0) + (comCnj > 0.3 ? 2 : 0) + Math.min(camposProc, 3) + (NOMES_TIPO.processos.test(nome) ? 1 : 0),
    prazos: (c.data >= 0 ? 2 : 0) + (c.descricao >= 0 ? 1 : 0) + (t.cabecalho.some(h => /prazo|audienc|compromiss/.test(norm(h))) ? 2 : 0) + (NOMES_TIPO.prazos.test(nome) ? 2 : 0) - (c.valor >= 0 ? 2 : 0),
    financeiro: (c.valor >= 0 ? 2 : 0) + (c.data >= 0 || c.pago >= 0 ? 1 : 0) + (c.tipo_fin >= 0 || c.categoria >= 0 ? 1 : 0) + (NOMES_TIPO.financeiro.test(nome) ? 2 : 0) - (c.numero >= 0 && c.data < 0 ? 2 : 0),
    clientes: (c.nome >= 0 ? 2 : 0) + (c.documento >= 0 ? 2 : 0) + (c.email >= 0 ? 1 : 0) + (c.telefone >= 0 ? 1 : 0) + (NOMES_TIPO.clientes.test(nome) ? 1 : 0) - (c.numero >= 0 || comCnj > 0.3 ? 3 : 0),
  }
  if (c.data < 0) nota.prazos = Math.min(nota.prazos, 1)
  if (c.valor < 0) nota.financeiro = Math.min(nota.financeiro, 1)
  if (c.nome < 0) nota.clientes = Math.min(nota.clientes, 1)
  const [tipo, n] = (Object.entries(nota) as [Exclude<Tipo, 'ignorar'>, number][]).sort((a, b) => b[1] - a[1])[0]
  if (n < 3) return { tipo: 'ignorar', porque: 'não reconheci as colunas; escolha o tipo, se quiser trazer' }
  const motivos: Record<Exclude<Tipo, 'ignorar'>, string> = {
    processos: c.numero >= 0 ? `tem a coluna "${t.cabecalho[c.numero]}"` : 'tem números de processo nas linhas',
    prazos: `tem a coluna de data "${t.cabecalho[c.data]}"`,
    financeiro: `tem a coluna de valor "${t.cabecalho[c.valor]}"`,
    clientes: `tem a coluna "${t.cabecalho[c.nome]}"${c.documento >= 0 ? ` e "${t.cabecalho[c.documento]}"` : ''}`,
  }
  return { tipo, porque: motivos[tipo] }
}

let seq = 0
/** Monta a tabela a partir das linhas brutas: acha o cabeçalho, tira linhas vazias e reconhece o tipo. */
export function montarTabela(arquivo: string, aba: string, brutas: string[][]): Tabela {
  const i = acharCabecalho(brutas)
  const cabecalho = (brutas[i] ?? []).map((h, j) => h || `Coluna ${j + 1}`)
  const linhas = brutas.slice(i + 1).filter(l => l.some(Boolean) && !(l.filter(Boolean).length === 1 && /^total/i.test(l.find(Boolean)!)))
  const base = { arquivo, aba, cabecalho, linhas }
  return { id: `t${++seq}`, ...base, ...classificar(base) }
}

/** Texto corrido (PDF, Word, e-mail): cada número de processo vira uma linha, com o trecho em volta. */
export function tabelaDoTexto(arquivo: string, aba: string, texto: string): Tabela {
  const vistos = new Set<string>()
  const linhas: string[][] = []
  for (const m of texto.matchAll(/\d{7}[-.\s]?\d{2}[-.\s]?\d{4}[-.\s]?\d[-.\s]?\d{2}[-.\s]?\d{4}/g)) {
    const d = m[0].replace(/\D/g, '')
    if (vistos.has(d)) continue
    vistos.add(d)
    const i = m.index ?? 0
    const trecho = texto.slice(Math.max(0, i - 120), i + m[0].length + 200).replace(/\s+/g, ' ').trim()
    linhas.push([formatarCnj(d), `Trecho do arquivo: ${trecho}`])
  }
  const base = { arquivo, aba, cabecalho: ['Número do processo', 'Observações'], linhas, textoLivre: true }
  return { id: `t${++seq}`, ...base, ...classificar(base) }
}

// ---------- Datas e valores ----------

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
/** Data em qualquer formato comum (dd/mm/aaaa, aaaa-mm-dd, dd/mm/aa, "12 de março de 2026", número de série do Excel) → aaaa-mm-dd. */
export function lerData(v: string | undefined): string | null {
  const s = (v ?? '').trim()
  if (!s) return null
  const ok = (a: number, m: number, d: number) => {
    if (a < 100) a += a < 70 ? 2000 : 1900
    const dt = new Date(Date.UTC(a, m - 1, d))
    return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && a >= 1950 && a <= 2100 ? `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null
  }
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return ok(+m[1], +m[2], +m[3])
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/)
  if (m) return ok(+m[3], +m[2], +m[1])
  m = norm(s).match(/^(\d{1,2}) (?:de )?([a-z]{3})[a-z]* (?:de )?(\d{4})/)
  if (m && MESES.includes(m[2])) return ok(+m[3], MESES.indexOf(m[2]) + 1, +m[1])
  if (/^\d{5}(\.\d+)?$/.test(s)) { // série do Excel (dias desde 30/12/1899)
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 86400000)
    return ok(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
  }
  return null
}

// ---------- Conversão de cada tipo ----------

export type Pronto<T> = { linha: number; registro: T | null; resumo: string; motivo?: string; repetido?: boolean }

/** Colunas que não têm lugar próprio: vão para as observações, como "Coluna: valor". */
function sobras(cab: string[], l: string[], usadas: number[]): string {
  return cab.map((h, j) => (usadas.includes(j) || !l[j] ? '' : `${h}: ${l[j]}`)).filter(Boolean).join(' · ')
}

/** Processos: usa o mesmo leitor da importação de processos e acrescenta as colunas que ele não conhece. */
export function prepararProcessos(t: Tabela, existentes: Iterable<string>, jaNaMigracao: Set<string>): LinhaImportacao[] {
  const tsv = [t.cabecalho, ...t.linhas].map(l => l.map(x => x.replace(/[\t\r\n]+/g, ' ')).join('\t')).join('\n')
  const r = analisarPlanilha(tsv, [...existentes, ...jaNaMigracao])
  const usadas = t.cabecalho.map((h, j) => (campoDoCabecalho(h) ? j : -1)).filter(j => j >= 0)
  return r.linhas.map(l => {
    const original = t.linhas[l.linha - 2] ?? []
    const extra = t.textoLivre ? '' : sobras(t.cabecalho, original, usadas)
    const dados = { ...l.dados, observacoes: [l.dados.observacoes, extra].filter(Boolean).join(' · ') || undefined }
    const saida = { ...l, dados }
    if (l.situacao === 'ja_cadastrado' && jaNaMigracao.has(l.numero)) saida.motivo = 'Já está em outra aba desta migração.'
    if (l.situacao === 'ok') jaNaMigracao.add(l.numero)
    return saida
  })
}

export type NovoCliente = { nome: string; telefone: string | null; email: string | null; origem: 'cliente_atual'; etapa: 'ganho'; observacoes: string | null; assunto: string | null }
export function prepararClientes(t: Tabela, existentes: Iterable<string>): Pronto<NovoCliente>[] {
  const c = colunasDe(t.cabecalho)
  const ja = new Set([...existentes].map(norm))
  const usadas = [c.nome, c.telefone, c.email].filter(j => j >= 0)
  return t.linhas.map((l, i) => {
    const nome = (l[c.nome] ?? '').trim()
    const linha = i + 2
    if (nome.length < 2) return { linha, registro: null, resumo: l.filter(Boolean).slice(0, 3).join(' · '), motivo: 'Sem nome.' }
    if (ja.has(norm(nome))) return { linha, registro: null, resumo: nome, motivo: 'Já cadastrado (mesmo nome).', repetido: true }
    ja.add(norm(nome))
    const email = (l[c.email] ?? '').match(/[^\s,;<>]+@[^\s,;<>]+\.[^\s,;<>]+/)?.[0]?.toLowerCase() ?? null
    const obs = sobras(t.cabecalho, l, usadas)
    return {
      linha, resumo: nome,
      registro: { nome: nome.slice(0, 200), telefone: (l[c.telefone] ?? '').slice(0, 40) || null, email: email && email.length <= 200 ? email : null, origem: 'cliente_atual', etapa: 'ganho', assunto: `Trazido do sistema antigo (${t.arquivo})`.slice(0, 500), observacoes: obs.slice(0, 4000) || null },
    }
  })
}

export type NovoPrazo = { titulo: string; imovel: string; data_evento: string; dias_antes: number; avisos_dias: number[]; uid_externo: string }
const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36) }
export function prepararPrazos(t: Tabela): Pronto<NovoPrazo>[] {
  const c = colunasDe(t.cabecalho)
  const vistos = new Set<string>()
  return t.linhas.map((l, i) => {
    const linha = i + 2
    const data = lerData(l[c.data])
    const numero = extrairNumeros(l.join(' '))[0]
    const proc = numero && validarCnj(numero).valido ? formatarCnj(numero) : ''
    const desc = (c.descricao >= 0 ? l[c.descricao] : '') || (c.titulo >= 0 ? l[c.titulo] : '') || t.cabecalho.map((_, j) => (j !== c.data && j !== c.numero && l[j] ? l[j] : '')).find(Boolean) || 'Prazo'
    const titulo = [desc, proc].filter(Boolean).join(' · ').slice(0, 200)
    if (!data) return { linha, registro: null, resumo: titulo, motivo: l[c.data] ? `Não entendi a data "${l[c.data]}".` : 'Sem data.' }
    const uid = `migracao-${hash(`${titulo}|${data}`)}`
    if (vistos.has(uid)) return { linha, registro: null, resumo: titulo, motivo: 'Repetido nesta aba.', repetido: true }
    vistos.add(uid)
    const local = ((c.local >= 0 ? l[c.local] : '') || proc || 'Trazido do sistema antigo').slice(0, 200)
    return { linha, resumo: `${data.split('-').reverse().join('/')} · ${titulo}`, registro: { titulo, imovel: local, data_evento: data, dias_antes: 7, avisos_dias: [7, 3, 1], uid_externo: uid } }
  })
}

export type NovoLancamento = { tipo: 'receita' | 'despesa'; categoria: string; descricao: string; valor: number; vencimento: string; pago_em: string | null; cliente: string | null }
export function prepararFinanceiro(t: Tabela): Pronto<NovoLancamento>[] {
  const c = colunasDe(t.cabecalho)
  const colCliente = t.cabecalho.findIndex(h => campoDoCabecalho(h) === 'cliente' || campoExtra(h) === 'nome')
  const usadas = [c.valor, c.data, c.pago, c.tipo_fin, c.categoria, c.descricao, colCliente].filter(j => j >= 0)
  return t.linhas.map((l, i) => {
    const linha = i + 2
    const bruto = l[c.valor] ?? ''
    const valor = lerValor(bruto.replace(/[-()]/g, ''))
    const negativo = /^\s*-|\(.*\)|^\s*R?\$?\s*-/.test(bruto)
    const pagoTxt = c.pago >= 0 ? l[c.pago] ?? '' : ''
    const pagoData = lerData(pagoTxt)
    const vencimento = lerData(l[c.data]) ?? pagoData
    const tipoTxt = norm(`${c.tipo_fin >= 0 ? l[c.tipo_fin] : ''} ${t.cabecalho[c.valor] ?? ''}`)
    const tipo: 'receita' | 'despesa' = negativo || /despesa|saida|pagar|debito|custo|pagamento a/.test(tipoTxt) ? 'despesa' : 'receita'
    const desc = ((c.descricao >= 0 ? l[c.descricao] : '') || (c.titulo >= 0 ? l[c.titulo] : '') || sobras(t.cabecalho, l, usadas) || 'Lançamento trazido do sistema antigo').slice(0, 300)
    const descricao = desc.length >= 2 ? desc : 'Lançamento trazido do sistema antigo'
    if (!(valor > 0)) return { linha, registro: null, resumo: descricao, motivo: bruto ? `Não entendi o valor "${bruto}".` : 'Sem valor.' }
    if (!vencimento) return { linha, registro: null, resumo: descricao, motivo: 'Sem data.' }
    const pago = pagoData ?? (/^(sim|s|pago|paga|quitado|recebido|liquidado|ok|x)$/.test(norm(pagoTxt)) ? vencimento : null)
    return {
      linha, resumo: `${vencimento.split('-').reverse().join('/')} · ${descricao} · R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      registro: { tipo, categoria: ((c.categoria >= 0 ? l[c.categoria] : '') || (tipo === 'receita' ? 'Honorários' : 'Outros')).slice(0, 80), descricao, valor, vencimento, pago_em: pago, cliente: (colCliente >= 0 ? l[colCliente] : '')?.slice(0, 200) || null },
    }
  })
}

// ---------- Histórico (para desfazer) ----------

export type Lote = {
  id: string; quando: string; arquivos: string[]
  contagem: { processos: number; clientes: number; prazos: number; financeiro: number }
  ids: { tarefas: string[]; compromissos: string[]; lancamentos_financeiros: string[]; leads: string[]; monitoramentos: string[] }
  desfeito?: boolean
}
const CHAVE_HIST = 'lsm-migracoes-v1'
export function lerHistorico(): Lote[] { try { return JSON.parse(localStorage.getItem(CHAVE_HIST) || '[]') } catch { return [] } }
export function gravarHistorico(h: Lote[]) { try { localStorage.setItem(CHAVE_HIST, JSON.stringify(h.slice(0, 30))) } catch { /* navegador sem espaço */ } }
