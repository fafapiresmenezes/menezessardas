// Leitura de Word (.docx) no navegador, sem biblioteca externa (06/11/2026):
// abre o ZIP, tira o texto de word/document.xml e a formatação (fonte, tamanho, margens,
// entrelinhas, recuo) de word/styles.xml e da seção do documento.
import type { Formatacao } from './formatarPeca'

/** Lê as entradas de um ZIP (método 0 = guardado, 8 = deflate). */
export async function lerZip(buf: ArrayBuffer, nomes: string[]): Promise<Record<string, string>> {
  const v = new DataView(buf)
  let fim = -1
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) if (v.getUint32(i, true) === 0x06054b50) { fim = i; break }
  if (fim < 0) throw new Error('Arquivo Word inválido.')
  const total = v.getUint16(fim + 10, true)
  let p = v.getUint32(fim + 16, true)
  const saida: Record<string, string> = {}
  const dec = new TextDecoder('utf-8')
  for (let n = 0; n < total; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) break
    const metodo = v.getUint16(p + 10, true)
    const comprimido = v.getUint32(p + 20, true)
    const lenNome = v.getUint16(p + 28, true), lenExtra = v.getUint16(p + 30, true), lenCom = v.getUint16(p + 32, true)
    const local = v.getUint32(p + 42, true)
    const nome = dec.decode(new Uint8Array(buf, p + 46, lenNome))
    p += 46 + lenNome + lenExtra + lenCom
    if (!nomes.includes(nome)) continue
    const inicio = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true)
    const dados = new Uint8Array(buf, inicio, comprimido)
    if (metodo === 0) saida[nome] = dec.decode(dados)
    else if (metodo === 8) {
      const fluxo = new Blob([dados]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
      saida[nome] = dec.decode(await new Response(fluxo).arrayBuffer())
    }
  }
  return saida
}

const attr = (xml: string, tag: string, a: string) => xml.match(new RegExp(`<${tag}\\b[^>]*\\b${a}="([^"]+)"`))?.[1]
const cm = (twips?: string) => (twips ? Math.round((Number(twips) / 567) * 10) / 10 : undefined)
const desfazer = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')

/** Texto de word/document.xml, um parágrafo por linha em branco. */
export function textoDoDocumento(xml: string) {
  return (xml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) ?? [])
    .map(p => desfazer((p.match(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>/g) ?? []).map(t => (t === '<w:tab/>' ? '\t' : t.replace(/<[^>]+>/g, ''))).join('')).trim())
    .filter(Boolean).join('\n\n')
}

/** Formatação predominante: padrão do documento (styles.xml) e margens da seção (document.xml). */
export function formatacaoDoDocumento(documento: string, estilos = ''): Partial<Formatacao> {
  const normal = estilos.match(/<w:style\b[^>]*w:styleId="Normal"[\s\S]*?<\/w:style>/)?.[0] ?? ''
  const padrao = estilos.match(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/)?.[0] ?? ''
  const fonte = attr(normal, 'w:rFonts', 'w:ascii') ?? attr(padrao, 'w:rFonts', 'w:ascii') ?? attr(documento, 'w:rFonts', 'w:ascii')
  const sz = attr(normal, 'w:sz', 'w:val') ?? attr(padrao, 'w:sz', 'w:val')
  const linha = attr(normal, 'w:spacing', 'w:line') ?? attr(padrao, 'w:spacing', 'w:line') ?? attr(documento, 'w:spacing', 'w:line')
  const recuo = attr(normal, 'w:ind', 'w:firstLine') ?? attr(documento, 'w:ind', 'w:firstLine')
  const sect = documento.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/)?.[0] ?? ''
  const f: Partial<Formatacao> = {}
  if (fonte) f.fonte = fonte
  if (sz) f.corpo = Number(sz) / 2
  if (linha) f.entrelinhas = Math.round((Number(linha) / 240) * 10) / 10
  if (recuo) f.recuoPrimeiraLinha = cm(recuo)
  const margens = { superior: cm(attr(sect, 'w:pgMar', 'w:top')), inferior: cm(attr(sect, 'w:pgMar', 'w:bottom')), esquerda: cm(attr(sect, 'w:pgMar', 'w:left')), direita: cm(attr(sect, 'w:pgMar', 'w:right')) }
  if (margens.superior != null && margens.inferior != null && margens.esquerda != null && margens.direita != null) f.margens = margens as Formatacao['margens']
  return f
}

/** Lê um .docx: texto e formatação. */
export async function lerDocx(arquivo: Blob) {
  const partes = await lerZip(await arquivo.arrayBuffer(), ['word/document.xml', 'word/styles.xml'])
  const doc = partes['word/document.xml']
  if (!doc) throw new Error('Arquivo Word sem conteúdo.')
  return { texto: textoDoDocumento(doc), formatacao: formatacaoDoDocumento(doc, partes['word/styles.xml']) }
}
