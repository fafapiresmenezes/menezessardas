// Estimativa de custo paramétrica (ferramenta P2 do Plano Master de Engenharia, versão 1).
// Linhas de serviço com quantidade × preço unitário, indiretos (BDI) e faixa de precisão pela classe AACE 18R-97.
// Os preços de exemplo são marcadores para a conta, não cotação: em cada obra entram a tabela oficial do país
// (SINAPI/SICRO no Brasil) ou a cotação local, e a data-base fica escrita.
import { CLASSES_AACE } from './normasEstruturais'

export interface LinhaCusto { codigo: string; servico: string; unidade: string; quantidade: number; precoUnitario: number; grupo?: string }
export interface ParamEstimativa { moeda: string; bdiPct: number; contingenciaPct: number; classe: 1 | 2 | 3 | 4 | 5; dataBase: string }

export function calcularEstimativa(linhas: LinhaCusto[], p: ParamEstimativa) {
  const validas = linhas.filter(l => Number.isFinite(l.quantidade) && Number.isFinite(l.precoUnitario) && l.quantidade >= 0 && l.precoUnitario >= 0)
  const itens = validas.map(l => ({ ...l, total: l.quantidade * l.precoUnitario }))
  const direto = itens.reduce((s, l) => s + l.total, 0)
  const bdi = direto * (p.bdiPct / 100)
  const contingencia = (direto + bdi) * (p.contingenciaPct / 100)
  const base = direto + bdi + contingencia
  const c = CLASSES_AACE[p.classe]
  const grupos = new Map<string, number>()
  for (const l of itens) grupos.set(l.grupo ?? 'Geral', (grupos.get(l.grupo ?? 'Geral') ?? 0) + l.total)
  // curva ABC: itens que somam 80% do custo direto (classe A) merecem cotação própria antes de qualquer outro
  const ordenados = [...itens].sort((a, b) => b.total - a.total)
  let acum = 0
  const abc = ordenados.map(l => { acum += l.total; const pct = direto ? acum / direto : 0; return { codigo: l.codigo, servico: l.servico, total: l.total, acumuladoPct: pct * 100, classe: pct <= 0.8 + 1e-9 ? 'A' : pct <= 0.95 + 1e-9 ? 'B' : 'C' } })
  // o primeiro item é sempre A, mesmo sozinho passando dos 80%
  if (abc.length) abc[0].classe = 'A'
  return {
    itens, direto, bdi, contingencia, base,
    baixo: base * (1 + c.baixo / 100), alto: base * (1 + c.alto / 100),
    classe: { numero: p.classe, ...c },
    grupos: [...grupos].map(([grupo, total]) => ({ grupo, total, pct: direto ? (total / direto) * 100 : 0 })).sort((a, b) => b.total - a.total),
    abc,
    descartadas: linhas.length - validas.length,
  }
}

export function estimativaParaCSV(r: ReturnType<typeof calcularEstimativa>, p: ParamEstimativa): string {
  const n = (v: number) => v.toFixed(2).replace('.', ',')
  return [
    `Estimativa de custo;moeda ${p.moeda};data-base ${p.dataBase};classe AACE ${p.classe}`,
    'Código;Serviço;Unidade;Quantidade;Preço unitário;Total;Grupo',
    ...r.itens.map(l => [l.codigo, l.servico.replace(/;/g, ','), l.unidade, n(l.quantidade), n(l.precoUnitario), n(l.total), l.grupo ?? 'Geral'].join(';')),
    `;;;;Custo direto;${n(r.direto)}`,
    `;;;;BDI ${p.bdiPct}%;${n(r.bdi)}`,
    `;;;;Contingência ${p.contingenciaPct}%;${n(r.contingencia)}`,
    `;;;;Total base;${n(r.base)}`,
    `;;;;Faixa (classe ${p.classe});${n(r.baixo)} a ${n(r.alto)}`,
  ].join('\n')
}

/** exemplo de galpão pequeno: preços MARCADORES (não cotação) */
export const LINHAS_EXEMPLO: LinhaCusto[] = [
  { codigo: '01.01', servico: 'Escavação mecânica de fundação', unidade: 'm³', quantidade: 48, precoUnitario: 55, grupo: 'Infraestrutura' },
  { codigo: '01.02', servico: 'Concreto estrutural C30 lançado', unidade: 'm³', quantidade: 62, precoUnitario: 750, grupo: 'Estrutura' },
  { codigo: '01.03', servico: 'Aço CA-50 cortado, dobrado e colocado', unidade: 'kg', quantidade: 5200, precoUnitario: 11, grupo: 'Estrutura' },
  { codigo: '01.04', servico: 'Forma de madeira (3 usos)', unidade: 'm²', quantidade: 410, precoUnitario: 120, grupo: 'Estrutura' },
  { codigo: '02.01', servico: 'Estrutura metálica de cobertura (treliças)', unidade: 'kg', quantidade: 6800, precoUnitario: 18, grupo: 'Cobertura' },
  { codigo: '02.02', servico: 'Telha metálica trapezoidal', unidade: 'm²', quantidade: 620, precoUnitario: 85, grupo: 'Cobertura' },
  { codigo: '03.01', servico: 'Alvenaria de bloco de concreto 14 cm', unidade: 'm²', quantidade: 380, precoUnitario: 95, grupo: 'Vedação' },
  { codigo: '04.01', servico: 'Instalações hidrossanitárias (verba por ponto)', unidade: 'pt', quantidade: 24, precoUnitario: 650, grupo: 'Instalações' },
  { codigo: '04.02', servico: 'Instalações elétricas (verba por ponto)', unidade: 'pt', quantidade: 60, precoUnitario: 280, grupo: 'Instalações' },
  { codigo: '05.01', servico: 'Piso industrial de concreto 12 cm', unidade: 'm²', quantidade: 600, precoUnitario: 165, grupo: 'Acabamento' },
]
