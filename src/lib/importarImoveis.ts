// Passo 31: importação de imóveis por planilha CSV (modelo para baixar, validação linha a linha, relatório de erros).
// Aceita separador ; ou , e cabeçalho em português. Nenhuma linha é gravada enquanto houver erro, salvo se a pessoa
// escolher "importar só as válidas".
import { TIPOS_IMOVEL, USOS_IMOVEL, UFS, type TipoImovel, type UsoImovel, type UF } from './dominio'
import type { NovoImovel } from './repositorio'

export const COLUNAS = ['endereco', 'cidade', 'uf', 'tipo', 'uso', 'proprietario', 'matricula', 'area_m2', 'notas'] as const
export type Linha = { numero: number; dados?: NovoImovel; erros: string[]; bruto: Record<string, string> }

export const MODELO_CSV = [
  COLUNAS.join(';'),
  'Rua Exemplo, 100, apto 201;Rio de Janeiro;RJ;apartamento;locado;Maria da Silva;123456;85;Vista para a lagoa',
  'Av. Exemplo, 2000, loja B;Rio de Janeiro;RJ;loja;uso_proprio;Empresa Exemplo Ltda;;120;',
].join('\n') + '\n'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Divide uma linha CSV respeitando aspas. */
export function dividir(linha: string, sep: string): string[] {
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

function opcao<T extends string>(lista: { valor: T; rotulo: string }[], v: string): T | null {
  const n = norm(v)
  const o = lista.find(x => norm(x.valor) === n || norm(x.rotulo) === n)
  return o ? o.valor : null
}

export function analisarCsv(texto: string): { linhas: Linha[]; validas: Linha[]; erros: number; cabecalhoOk: boolean } {
  const brutas = texto.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim())
  if (!brutas.length) return { linhas: [], validas: [], erros: 0, cabecalhoOk: false }
  const sep = (brutas[0].match(/;/g)?.length ?? 0) >= (brutas[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const cab = dividir(brutas[0], sep).map(c => norm(c).replace(/[^a-z0-9_]/g, '_'))
  const alias: Record<string, string> = { endereco: 'endereco', cidade: 'cidade', uf: 'uf', estado: 'uf', tipo: 'tipo', uso: 'uso', proprietario: 'proprietario', matricula: 'matricula', matricula_rgi: 'matricula', area_m2: 'area_m2', area: 'area_m2', notas: 'notas', observacoes: 'notas' }
  const idx = cab.map(c => alias[c] ?? null)
  const cabecalhoOk = ['endereco', 'cidade', 'uf', 'tipo', 'uso', 'proprietario'].every(c => idx.includes(c))
  const linhas: Linha[] = []
  if (!cabecalhoOk) return { linhas, validas: [], erros: 0, cabecalhoOk }
  brutas.slice(1).forEach((l, i) => {
    const partes = dividir(l, sep)
    const bruto: Record<string, string> = {}
    idx.forEach((k, j) => { if (k) bruto[k] = partes[j] ?? '' })
    const erros: string[] = []
    if (!bruto.endereco) erros.push('endereço vazio')
    if (!bruto.cidade) erros.push('cidade vazia')
    const uf = opcao(UFS, bruto.uf ?? '') as UF | null
    if (!uf) erros.push(`UF "${bruto.uf ?? ''}" inválida`)
    const tipo = opcao(TIPOS_IMOVEL, bruto.tipo ?? '') as TipoImovel | null
    if (!tipo) erros.push(`tipo "${bruto.tipo ?? ''}" inválido (use: ${TIPOS_IMOVEL.map(t => t.valor).join(', ')})`)
    const uso = opcao(USOS_IMOVEL, bruto.uso ?? '') as UsoImovel | null
    if (!uso) erros.push(`uso "${bruto.uso ?? ''}" inválido (use: ${USOS_IMOVEL.map(t => t.valor).join(', ')})`)
    if (!bruto.proprietario) erros.push('proprietário vazio')
    let areaM2: number | undefined
    if (bruto.area_m2) { areaM2 = Number(bruto.area_m2.replace(/\./g, '').replace(',', '.')); if (!Number.isFinite(areaM2) || areaM2 <= 0) erros.push(`área "${bruto.area_m2}" inválida`) }
    const dados: NovoImovel | undefined = erros.length ? undefined : { endereco: bruto.endereco, cidade: bruto.cidade, uf: uf!, tipo: tipo!, uso: uso!, proprietario: bruto.proprietario, matricula: bruto.matricula ?? '', areaM2, notas: bruto.notas ?? '' }
    linhas.push({ numero: i + 2, dados, erros, bruto })
  })
  // Duplicidade dentro da própria planilha (mesmo endereço + cidade).
  const vistos = new Map<string, number>()
  for (const l of linhas) {
    const k = `${norm(l.bruto.endereco ?? '')}|${norm(l.bruto.cidade ?? '')}`
    if (!l.bruto.endereco) continue
    if (vistos.has(k)) { l.erros.push(`repete a linha ${vistos.get(k)}`); l.dados = undefined } else vistos.set(k, l.numero)
  }
  const validas = linhas.filter(l => !l.erros.length)
  return { linhas, validas, erros: linhas.length - validas.length, cabecalhoOk }
}
