// Passo D17 (Diamante): comparação de versões (redline) entre o contrato e cada aditivo.
// Diferença por palavras (subsequência comum mais longa), campos do cadastro lado a lado e PDF exportável.
import { gerarPdfTexto, quebrar } from '@/lib/pdfSimples'
import { rotulosTipoContrato, rotulosIndice, rotulosGarantia } from '@/lib/rotulos'
import type { Contrato } from '@/lib/repositorio'

export type Segmento = { tipo: 'igual' | 'removido' | 'inserido'; texto: string }
const LIMITE_PALAVRAS = 3000

const palavras = (t: string) => t.replace(/\[Página \d+\]/g, ' ').split(/\s+/).filter(Boolean).slice(0, LIMITE_PALAVRAS)

/** Diferença por palavras: o que saiu do texto antigo e o que entrou no novo, na ordem do texto. */
export function diffPalavras(antes: string, depois: string): Segmento[] {
  const a = palavras(antes), b = palavras(depois)
  const n = a.length, m = b.length
  if (!n && !m) return []
  // LCS clássico com tabela compacta (Uint16 basta até 3000 palavras).
  const larg = m + 1
  const tab = new Uint16Array((n + 1) * larg)
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    tab[i * larg + j] = a[i] === b[j] ? tab[(i + 1) * larg + j + 1] + 1 : Math.max(tab[(i + 1) * larg + j], tab[i * larg + j + 1])
  const segs: Segmento[] = []
  const empurrar = (tipo: Segmento['tipo'], t: string) => { const u = segs[segs.length - 1]; if (u && u.tipo === tipo) u.texto += ' ' + t; else segs.push({ tipo, texto: t }) }
  let i = 0, j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) { empurrar('igual', a[i]); i++; j++ }
    else if (tab[(i + 1) * larg + j] >= tab[i * larg + j + 1]) { empurrar('removido', a[i]); i++ }
    else { empurrar('inserido', b[j]); j++ }
  }
  while (i < n) empurrar('removido', a[i++])
  while (j < m) empurrar('inserido', b[j++])
  return segs
}

export function resumoRedline(segs: Segmento[]) {
  const conta = (tipo: Segmento['tipo']) => segs.filter(s => s.tipo === tipo).reduce((n, s) => n + s.texto.split(' ').length, 0)
  const iguais = conta('igual'), removidas = conta('removido'), inseridas = conta('inserido')
  const total = iguais + removidas + inseridas
  return { iguais, removidas, inseridas, trechosAlterados: segs.filter(s => s.tipo !== 'igual').length, pctAlterado: total ? Math.round(((removidas + inseridas) / total) * 100) : 0 }
}

export type CampoComparado = { campo: string; antes: string; depois: string; mudou: boolean }
const brl = (v: number) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const data = (d: string | null | undefined) => (d ? d.slice(0, 10).split('-').reverse().join('/') : 'indeterminado')

/** Campos do cadastro lado a lado (sempre disponível, mesmo sem PDF). */
export function diffCampos(antes: Contrato, depois: Contrato): CampoComparado[] {
  const linhas: [string, string, string][] = [
    ['Parte', antes.parte, depois.parte],
    ['Tipo', rotulosTipoContrato[antes.tipo] ?? antes.tipo, rotulosTipoContrato[depois.tipo] ?? depois.tipo],
    ['Valor combinado', brl(antes.valor), brl(depois.valor)],
    ['Periodicidade', antes.periodicidade, depois.periodicidade],
    ['Início', data(antes.dataInicio), data(depois.dataInicio)],
    ['Vencimento', data(antes.dataVencimento), data(depois.dataVencimento)],
    ['Índice de reajuste', rotulosIndice[antes.indice] ?? antes.indice, rotulosIndice[depois.indice] ?? depois.indice],
    ['Garantia', rotulosGarantia[antes.garantia] ?? antes.garantia, rotulosGarantia[depois.garantia] ?? depois.garantia],
  ]
  return linhas.map(([campo, a, d]) => ({ campo, antes: a, depois: d, mudou: a !== d }))
}

/** Redline em texto, com contexto de até 8 palavras ao redor de cada mudança: [- saiu -] {+ entrou +}. */
export function redlineEmTexto(segs: Segmento[], contexto = 8): string {
  const partes: string[] = []
  segs.forEach((s, k) => {
    if (s.tipo === 'igual') {
      const w = s.texto.split(' ')
      const primeiro = k === 0, ultimo = k === segs.length - 1
      if (w.length <= contexto * 2 || (primeiro && w.length <= contexto) || (ultimo && w.length <= contexto)) partes.push(s.texto)
      else partes.push(`${primeiro ? '' : w.slice(0, contexto).join(' ') + ' '}(…)${ultimo ? '' : ' ' + w.slice(-contexto).join(' ')}`)
    } else partes.push(s.tipo === 'removido' ? `[- ${s.texto} -]` : `{+ ${s.texto} +}`)
  })
  return partes.join(' ').replace(/\s+/g, ' ').trim()
}

/** PDF da comparação: campos lado a lado, resumo e redline colorido (vermelho = saiu, verde = entrou). */
export function pdfRedline(titulo: string, campos: CampoComparado[], segs: Segmento[], fonte: string): Uint8Array<ArrayBuffer> {
  const r = resumoRedline(segs)
  const linhas: Parameters<typeof gerarPdfTexto>[1] = [
    { texto: titulo, tamanho: 14, negrito: true },
    { texto: `Gerado em ${new Date().toLocaleString('pt-BR')} · ${fonte}`, tamanho: 8, cor: [0.4, 0.4, 0.4] },
    { texto: ' ' },
    { texto: 'Campos do cadastro', tamanho: 11, negrito: true },
    ...campos.map(c => ({ texto: `${c.campo}: ${c.antes}  →  ${c.depois}${c.mudou ? '   (alterado)' : ''}`, tamanho: 9, cor: (c.mudou ? [0.55, 0.1, 0.1] : [0.1, 0.1, 0.1]) as [number, number, number] })),
    { texto: ' ' },
    { texto: 'Texto', tamanho: 11, negrito: true },
    { texto: segs.length ? `${r.trechosAlterados} trecho(s) alterado(s) · ${r.removidas} palavra(s) saíram · ${r.inseridas} entraram · ${r.pctAlterado}% do texto mudou` : 'Sem texto para comparar (anexe o PDF das duas versões).', tamanho: 9 },
    { texto: ' ' },
  ]
  for (const s of segs) {
    const cor: [number, number, number] = s.tipo === 'removido' ? [0.7, 0.05, 0.05] : s.tipo === 'inserido' ? [0.05, 0.45, 0.15] : [0.25, 0.25, 0.25]
    const marca = s.tipo === 'removido' ? '[- ' : s.tipo === 'inserido' ? '{+ ' : ''
    const fim = s.tipo === 'removido' ? ' -]' : s.tipo === 'inserido' ? ' +}' : ''
    const texto = s.tipo === 'igual' ? redlineEmTexto([s], 12) : s.texto
    for (const l of quebrar(marca + texto + fim, 8)) linhas.push({ texto: l, tamanho: 8, cor })
  }
  return gerarPdfTexto(titulo, linhas)
}
