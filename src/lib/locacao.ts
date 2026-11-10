// Passo D21 (Diamante): pacote "administradora de locação" — vistoria com fotos, repasse ao proprietário
// e prestação de contas mensal. Regras puras aqui; a tela só grava e mostra.
import { gerarPdfTexto, quebrar } from './pdfSimples'
import { formatarData } from './datas'

export type TipoLancamento = 'aluguel' | 'encargo' | 'despesa' | 'taxa_administracao' | 'repasse'
export type Lancamento = { id?: number; contrato_id: string; competencia: string; tipo: TipoLancamento; descricao: string; valor: number; pago_em: string | null; comprovante?: string | null }
export type Administracao = { contrato_id: string; taxa_pct: number; proprietario_email: string | null; dia_repasse: number; ativo: boolean }
export const TIPOS: Record<TipoLancamento, string> = { aluguel: 'Aluguel', encargo: 'Encargo (condomínio, IPTU etc.)', despesa: 'Despesa do imóvel', taxa_administracao: 'Taxa de administração', repasse: 'Repasse ao proprietário' }
export const brl = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const r2 = (v: number) => Math.round(v * 100) / 100

/** Primeiro dia do mês (aaaa-mm-01) a partir de "aaaa-mm" ou de uma data. */
export function competenciaDe(mes: string): string { return mes.slice(0, 7) + '-01' }
export function rotuloCompetencia(competencia: string): string {
  const [a, m] = competencia.split('-')
  const nomes = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  return `${nomes[Number(m) - 1] ?? m} de ${a}`
}

/** Lançamentos padrão do mês: aluguel do contrato e taxa de administração sobre o aluguel. Não duplica o que já existe. */
export function lancamentosPadrao(contratoId: string, competencia: string, aluguel: number, taxaPct: number, existentes: Lancamento[]): Lancamento[] {
  const tem = (t: TipoLancamento) => existentes.some(l => l.tipo === t && l.competencia === competencia)
  const novos: Lancamento[] = []
  if (!tem('aluguel') && aluguel > 0) novos.push({ contrato_id: contratoId, competencia, tipo: 'aluguel', descricao: 'Aluguel do mês', valor: r2(aluguel), pago_em: null })
  if (!tem('taxa_administracao') && aluguel > 0 && taxaPct > 0) novos.push({ contrato_id: contratoId, competencia, tipo: 'taxa_administracao', descricao: `Taxa de administração ${taxaPct.toLocaleString('pt-BR')}%`, valor: r2(aluguel * taxaPct / 100), pago_em: null })
  return novos
}

export type Prestacao = { competencia: string; recebido: number; aReceber: number; despesas: number; taxa: number; repasse: number; repassado: number; saldoRepasse: number; linhas: Lancamento[] }

/** Repasse = o que o inquilino pagou (aluguel + encargos) − despesas pagas pela administradora − taxa. Só entra o que foi efetivamente pago. */
export function prestacaoContas(lancamentos: Lancamento[], competencia: string): Prestacao {
  const linhas = lancamentos.filter(l => l.competencia === competencia)
  const soma = (f: (l: Lancamento) => boolean) => r2(linhas.filter(f).reduce((s, l) => s + Number(l.valor), 0))
  const recebido = soma(l => (l.tipo === 'aluguel' || l.tipo === 'encargo') && !!l.pago_em)
  const aReceber = soma(l => (l.tipo === 'aluguel' || l.tipo === 'encargo') && !l.pago_em)
  const despesas = soma(l => l.tipo === 'despesa')
  const taxa = soma(l => l.tipo === 'taxa_administracao')
  const repassado = soma(l => l.tipo === 'repasse' && !!l.pago_em)
  const repasse = r2(Math.max(0, recebido - despesas - taxa))
  return { competencia, recebido, aReceber, despesas, taxa, repasse, repassado, saldoRepasse: r2(repasse - repassado), linhas }
}

export type Vistoria = { id?: number; imovel_id: string; contrato_id: string | null; tipo: 'entrada' | 'saida' | 'periodica'; data: string; estado_geral: 'bom' | 'regular' | 'ruim'; itens: ItemVistoria[]; fotos: FotoVistoria[]; observacoes: string | null; responsavel: string | null }
export type ItemVistoria = { comodo: string; item: string; estado: 'bom' | 'regular' | 'ruim' | 'na'; obs?: string }
export type FotoVistoria = { caminho: string; legenda: string }
export const TIPOS_VISTORIA = { entrada: 'Vistoria de entrada', saida: 'Vistoria de saída', periodica: 'Vistoria periódica' } as const
export const ESTADOS = { bom: 'Bom', regular: 'Regular', ruim: 'Ruim', na: 'Não se aplica' } as const

/** Roteiro padrão (Lei 8.245/91, art. 22, V e 23, III): cômodos e itens que toda vistoria confere. */
export function roteiroPadrao(): ItemVistoria[] {
  const comodos: [string, string[]][] = [
    ['Sala', ['Piso', 'Paredes e pintura', 'Teto', 'Janelas e vidros', 'Tomadas e interruptores', 'Iluminação']],
    ['Cozinha', ['Piso', 'Paredes e azulejos', 'Pia e torneira', 'Armários', 'Ponto de gás', 'Tomadas']],
    ['Quarto', ['Piso', 'Paredes e pintura', 'Armários', 'Janelas', 'Tomadas e iluminação']],
    ['Banheiro', ['Piso e azulejos', 'Vaso e descarga', 'Pia e torneira', 'Chuveiro', 'Box e vidros', 'Ralo e esgoto']],
    ['Área de serviço', ['Tanque', 'Ponto de máquina', 'Piso']],
    ['Geral', ['Portas e fechaduras', 'Chaves entregues', 'Hidrômetro (leitura)', 'Medidor de luz (leitura)', 'Infiltrações']],
  ]
  return comodos.flatMap(([comodo, itens]) => itens.map(item => ({ comodo, item, estado: 'bom' as const })))
}

/** Estado geral = pior estado encontrado (ruim > regular > bom), ignorando "não se aplica". */
export function estadoGeral(itens: ItemVistoria[]): 'bom' | 'regular' | 'ruim' {
  if (itens.some(i => i.estado === 'ruim')) return 'ruim'
  if (itens.some(i => i.estado === 'regular')) return 'regular'
  return 'bom'
}

/** Diferenças entre a vistoria de entrada e a de saída: itens que pioraram (base para cobrar reparos do inquilino). */
export function compararVistorias(entrada: ItemVistoria[], saida: ItemVistoria[]): { comodo: string; item: string; antes: string; depois: string }[] {
  const peso = { bom: 0, regular: 1, ruim: 2, na: -1 }
  const out: { comodo: string; item: string; antes: string; depois: string }[] = []
  for (const s of saida) {
    const e = entrada.find(x => x.comodo === s.comodo && x.item === s.item)
    if (!e || e.estado === 'na' || s.estado === 'na') continue
    if (peso[s.estado] > peso[e.estado]) out.push({ comodo: s.comodo, item: s.item, antes: ESTADOS[e.estado], depois: ESTADOS[s.estado] })
  }
  return out
}

type Cabecalho = { escritorio?: string; imovel: string; proprietario: string; inquilino: string }

export function linhasPrestacao(p: Prestacao, cab: Cabecalho, taxaPct: number) {
  const L: { texto: string; tamanho?: number; negrito?: boolean; x?: number }[] = []
  L.push({ texto: cab.escritorio ?? 'Instituto THEYE', tamanho: 10, negrito: true })
  L.push({ texto: `Prestação de contas — ${rotuloCompetencia(p.competencia)}`, tamanho: 16, negrito: true })
  L.push({ texto: `Imóvel: ${cab.imovel}`, tamanho: 10 }); L.push({ texto: `Proprietário: ${cab.proprietario}   Inquilino: ${cab.inquilino}`, tamanho: 10 }); L.push({ texto: ' ' })
  L.push({ texto: 'Lançamentos do mês', tamanho: 12, negrito: true })
  for (const l of p.linhas) L.push({ texto: `${TIPOS[l.tipo]} · ${l.descricao} · ${brl(l.valor)} · ${l.pago_em ? 'pago em ' + formatarData(l.pago_em) : 'em aberto'}`, tamanho: 9 })
  L.push({ texto: ' ' }); L.push({ texto: 'Resumo', tamanho: 12, negrito: true })
  L.push({ texto: `Recebido do inquilino (aluguel + encargos): ${brl(p.recebido)}`, tamanho: 10 })
  if (p.aReceber > 0) L.push({ texto: `Ainda a receber: ${brl(p.aReceber)}`, tamanho: 10 })
  L.push({ texto: `(−) Despesas do imóvel pagas pela administradora: ${brl(p.despesas)}`, tamanho: 10 })
  L.push({ texto: `(−) Taxa de administração (${taxaPct.toLocaleString('pt-BR')}%): ${brl(p.taxa)}`, tamanho: 10 })
  L.push({ texto: `= Repasse ao proprietário: ${brl(p.repasse)}`, tamanho: 12, negrito: true })
  if (p.repassado > 0) L.push({ texto: `Já repassado: ${brl(p.repassado)} · Saldo: ${brl(p.saldoRepasse)}`, tamanho: 10 })
  L.push({ texto: ' ' })
  for (const t of quebrar('Documento gerado pela plataforma a partir dos lançamentos registrados. Comprovantes ficam guardados na nuvem do escritório e podem ser pedidos a qualquer momento. Lei 8.245/91 e Código Civil, arts. 653 e seguintes (mandato).', 8)) L.push({ texto: t, tamanho: 8 })
  return L
}
export function pdfPrestacao(p: Prestacao, cab: Cabecalho, taxaPct: number) { return gerarPdfTexto(`Prestação de contas ${p.competencia.slice(0, 7)}`, linhasPrestacao(p, cab, taxaPct)) }

export function linhasLaudo(v: Vistoria, cab: Omit<Cabecalho, 'proprietario'> & { proprietario?: string }) {
  const L: { texto: string; tamanho?: number; negrito?: boolean }[] = []
  L.push({ texto: cab.escritorio ?? 'Instituto THEYE', tamanho: 10, negrito: true })
  L.push({ texto: `Laudo de ${TIPOS_VISTORIA[v.tipo].toLowerCase()} — ${formatarData(v.data)}`, tamanho: 16, negrito: true })
  L.push({ texto: `Imóvel: ${cab.imovel}`, tamanho: 10 }); L.push({ texto: `Inquilino: ${cab.inquilino}${v.responsavel ? '   Responsável pela vistoria: ' + v.responsavel : ''}`, tamanho: 10 })
  L.push({ texto: `Estado geral: ${ESTADOS[v.estado_geral]}`, tamanho: 11, negrito: true }); L.push({ texto: ' ' })
  let comodo = ''
  for (const i of v.itens) {
    if (i.comodo !== comodo) { comodo = i.comodo; L.push({ texto: comodo, tamanho: 11, negrito: true }) }
    L.push({ texto: `  ${i.item}: ${ESTADOS[i.estado]}${i.obs ? ' — ' + i.obs : ''}`, tamanho: 9 })
  }
  if (v.fotos.length) { L.push({ texto: ' ' }); L.push({ texto: `Fotos (${v.fotos.length}), guardadas na nuvem do escritório:`, tamanho: 10, negrito: true }); for (const f of v.fotos) L.push({ texto: `  ${f.legenda || f.caminho.split('/').pop()}`, tamanho: 9 }) }
  if (v.observacoes) { L.push({ texto: ' ' }); for (const t of quebrar('Observações: ' + v.observacoes, 9)) L.push({ texto: t, tamanho: 9 }) }
  L.push({ texto: ' ' })
  for (const t of quebrar('Vistoria realizada nos termos da Lei 8.245/91, art. 22, V (entrega do imóvel com descrição minuciosa do estado) e art. 23, III (devolução no estado recebido). As partes recebem cópia; divergências devem ser apontadas em 5 dias.', 8)) L.push({ texto: t, tamanho: 8 })
  return L
}
export function pdfLaudo(v: Vistoria, cab: Omit<Cabecalho, 'proprietario'>) { return gerarPdfTexto(`Laudo de vistoria ${v.data}`, linhasLaudo(v, cab)) }
