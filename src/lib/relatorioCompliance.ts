// Passo D08 (Diamante): relatório de compliance em PDF para o cliente, com código de integridade e selo OpenTimestamps (.ots).
import { gerarPdfTexto, quebrar } from '@/lib/pdfSimples'
import { selarDigest } from '@/lib/exportarTrilha'
import { registrarEvento } from '@/lib/trilha'

export interface DadosRelatorio {
  empresa: string
  geral: number
  nivel: string
  pilares: { nome: string; nota: number | null }[]
  lacunas: { pilar: string; acao: string; base: string; v: number }[]
  codigo: string
}
export interface RelatorioSelado { pdf: Uint8Array; sha256: string; ots: Uint8Array | null; calendario: string | null; nomeBase: string }

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('')
const cinza: [number, number, number] = [0.4, 0.4, 0.4]

export function linhasDoRelatorio(d: DadosRelatorio, hoje = new Date()): Parameters<typeof gerarPdfTexto>[1] {
  const dia = (n: number) => { const x = new Date(hoje); x.setDate(x.getDate() + n); return x.toLocaleDateString('pt-BR') }
  const L: Parameters<typeof gerarPdfTexto>[1] = [
    { texto: 'GMenezes Advogados Associados', tamanho: 16, negrito: true, cor: [0.08, 0.13, 0.24] },
    { texto: `Diagnóstico de integridade (compliance) · ${d.empresa || 'Cliente'}`, tamanho: 12, negrito: true },
    { texto: `Emitido em ${hoje.toLocaleDateString('pt-BR')} · Base: Decreto 11.129/2022, art. 57 (Lei 12.846/2013) e LGPD`, tamanho: 8, cor: cinza },
    { texto: ' ', tamanho: 6 },
    { texto: `Nota geral: ${d.geral}% · programa ${d.nivel}`, tamanho: 12, negrito: true },
    ...d.pilares.map(p => ({ texto: `${p.nome}: ${p.nota === null ? 'não respondido' : `${p.nota}%`}`, tamanho: 10 })),
    { texto: ' ', tamanho: 6 },
    { texto: `Plano de ação (${d.lacunas.length} item(ns); prioridade alta em 30 dias, média em 60)`, tamanho: 12, negrito: true },
  ]
  const ordenadas = [...d.lacunas].sort((a, b) => a.v - b.v)
  if (!ordenadas.length) L.push({ texto: 'Nenhuma lacuna: todos os pontos respondidos com "Sim".', tamanho: 10 })
  ordenadas.forEach((l, i) => {
    for (const t of quebrar(`${i + 1}. [${l.v === 0 ? 'ALTA' : 'média'} · até ${dia(l.v === 0 ? 30 : 60)}] ${l.pilar}: ${l.acao} (${l.base})`, 10)) L.push({ texto: t, tamanho: 10 })
  })
  L.push({ texto: ' ', tamanho: 6 })
  for (const t of quebrar(`Código de integridade (SHA-256 das respostas, empresa e data): ${d.codigo}. O SHA-256 deste PDF é enviado ao OpenTimestamps (Bitcoin); a prova vai no arquivo .ots que acompanha este documento. Qualquer alteração no relatório ou nas respostas muda os dois códigos.`, 8)) L.push({ texto: t, tamanho: 8, cor: cinza })
  return L
}

export async function gerarRelatorioSelado(d: DadosRelatorio): Promise<RelatorioSelado> {
  const pdf = gerarPdfTexto(`Diagnóstico de integridade ${d.empresa}`.trim(), linhasDoRelatorio(d))
  const sha256 = hex(await crypto.subtle.digest('SHA-256', pdf))
  const selo = await selarDigest(sha256).catch(() => null)
  const nomeBase = `compliance-${(d.empresa || 'cliente').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${new Date().toISOString().slice(0, 10)}`
  await registrarEvento({ tipo: 'trilha_ancorada', entidade: nomeBase, resumo: `Relatório de compliance de ${d.empresa || 'cliente'} em PDF (nota ${d.geral}%, ${d.lacunas.length} lacuna(s)); SHA-256 ${sha256}${selo ? `; selo OpenTimestamps via ${selo.calendario}` : '; selo não obtido'}` }).catch(() => undefined)
  return { pdf, sha256, ots: selo?.ots ?? null, calendario: selo?.calendario ?? null, nomeBase }
}
