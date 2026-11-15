// G6.5: ficha do município em PDF lastreado. O hash (sha256) do conteúdo vai impresso no rodapé e
// fica no registro de acesso do cofre; quem tiver o mesmo conteúdo refaz a conta e confere.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { Municipio, Noticia } from './fontes'
import { leituraNdvi } from './fontes'
import { sha256 } from './cofre'

export interface DadosFicha {
  municipio: Municipio
  trilha: { pontos: number; total: number; dias: number } | null
  ndvi: { media: number; minimo: number; maximo: number; cena: string; data: string } | null
  noticias: Noticia[]
  geradoEm: string
}

/** Texto canônico da ficha: é ele que vira o hash. O PDF só desenha este texto. */
export function textoFicha(d: DadosFicha): string[] {
  const m = d.municipio
  const l: string[] = [
    `Ficha do município: ${m.nome}/${m.uf}`,
    `Código IBGE: ${m.codigo}`,
    `População (Censo 2022): ${m.populacao2022 != null ? m.populacao2022.toLocaleString('pt-BR') : 'não informada pela fonte'}`,
  ]
  if (d.trilha) l.push(`Sua trilha dentro do município: ${d.trilha.pontos} de ${d.trilha.total} pontos, em ${d.trilha.dias} dia(s)`)
  if (d.ndvi) l.push(`Índice de vegetação (NDVI) médio: ${d.ndvi.media.toLocaleString('pt-BR')} (${leituraNdvi(d.ndvi.media)}); mínimo ${d.ndvi.minimo.toLocaleString('pt-BR')}, máximo ${d.ndvi.maximo.toLocaleString('pt-BR')}; cena Sentinel-2 ${d.ndvi.cena} de ${d.ndvi.data}`)
  l.push('', `Notícias dos últimos 7 dias (GDELT): ${d.noticias.length}`)
  d.noticias.slice(0, 12).forEach(n => l.push(`- ${n.data} · ${n.fonte} · ${n.titulo}`))
  l.push('', 'Fontes:', ...m.fontes.map(f => `- ${f}`))
  if (d.ndvi) l.push('- Copernicus Sentinel-2 L2A via Microsoft Planetary Computer (estatística no limite do município)')
  if (d.noticias.length) l.push('- GDELT DOC 2.0 (api.gdeltproject.org)')
  l.push('', `Gerado em ${new Date(d.geradoEm).toLocaleString('pt-BR')} pela plataforma THEYE (MVP de geomapeamento).`)
  return l
}

// A fonte padrão do PDF (WinAnsi) não tem todos os caracteres do mundo: o que ela não desenha vira "?".
const seguro = (s: string) => s.normalize('NFC').replace(/[^\x20-\x7E -ÿ·–—“”‘’…]/g, '?')

export async function pdfFicha(d: DadosFicha): Promise<{ bytes: Uint8Array; hash: string }> {
  const linhas = textoFicha(d)
  const hash = await sha256(linhas.join('\n'))
  const doc = await PDFDocument.create()
  doc.setTitle(`Ficha ${d.municipio.nome}/${d.municipio.uf}`)
  doc.setCreator('THEYE')
  const fonte = await doc.embedFont(StandardFonts.Helvetica)
  const negrito = await doc.embedFont(StandardFonts.HelveticaBold)
  const [L, A, M] = [595, 842, 50]
  let pag = doc.addPage([L, A])
  let y = A - M
  const quebrar = (t: string, tam: number, f: typeof fonte) => {
    const out: string[] = []; let atual = ''
    for (const p of seguro(t).split(' ')) {
      const teste = atual ? atual + ' ' + p : p
      if (f.widthOfTextAtSize(teste, tam) > L - 2 * M && atual) { out.push(atual); atual = p } else atual = teste
    }
    out.push(atual)
    return out
  }
  linhas.forEach((t, i) => {
    const tam = i === 0 ? 16 : 10
    const f = i === 0 ? negrito : fonte
    for (const s of quebrar(t, tam, f)) {
      if (y < M + 40) { pag = doc.addPage([L, A]); y = A - M }
      pag.drawText(s, { x: M, y, size: tam, font: f, color: rgb(0.04, 0.04, 0.05) })
      y -= tam + 5
    }
    if (i === 0) y -= 8
  })
  for (const p of doc.getPages()) p.drawText(`sha256 do conteúdo: ${hash}`, { x: M, y: 24, size: 7, font: fonte, color: rgb(0.4, 0.4, 0.42) })
  return { bytes: await doc.save(), hash }
}
