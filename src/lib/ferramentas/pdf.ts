// Theye Suporte Jurídico — juntar PDFs, extrair páginas e girar, tudo no navegador (sem enviar arquivos a servidor).
import { PDFDocument, degrees } from 'pdf-lib'

export async function juntarPdfs(arquivos: Uint8Array[]): Promise<Uint8Array> {
  if (!arquivos.length) throw new Error('Escolha ao menos um PDF.')
  const saida = await PDFDocument.create()
  for (const bytes of arquivos) {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: false })
    const paginas = await saida.copyPages(doc, doc.getPageIndices())
    paginas.forEach(p => saida.addPage(p))
  }
  return saida.save()
}

/** "1-3, 5, 8-10" → índices 0-based, na ordem pedida, validando o total de páginas. */
export function interpretarPaginas(spec: string, total: number): number[] {
  const res: number[] = []
  for (const parte of spec.split(',').map(s => s.trim()).filter(Boolean)) {
    const m = parte.match(/^(\d+)(?:\s*-\s*(\d+))?$/)
    if (!m) throw new Error(`Intervalo inválido: "${parte}". Use, por exemplo, 1-3, 5.`)
    const a = Number(m[1]), b = m[2] ? Number(m[2]) : a
    if (a < 1 || b < 1 || a > total || b > total) throw new Error(`O documento tem ${total} página(s); "${parte}" está fora disso.`)
    for (let i = a; a <= b ? i <= b : i >= b; i += a <= b ? 1 : -1) res.push(i - 1)
  }
  if (!res.length) throw new Error('Informe as páginas.')
  return res
}

export async function extrairPaginas(bytes: Uint8Array, spec: string, giro = 0): Promise<{ pdf: Uint8Array; paginas: number }> {
  const doc = await PDFDocument.load(bytes)
  const idx = interpretarPaginas(spec, doc.getPageCount())
  const saida = await PDFDocument.create()
  const paginas = await saida.copyPages(doc, idx)
  paginas.forEach(p => { if (giro) p.setRotation(degrees((p.getRotation().angle + giro) % 360)); saida.addPage(p) })
  return { pdf: await saida.save(), paginas: idx.length }
}

export async function contarPaginas(bytes: Uint8Array): Promise<number> { return (await PDFDocument.load(bytes)).getPageCount() }
export const tamanhoLegivel = (n: number) => n >= 1048576 ? `${(n / 1048576).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(n / 1024))} KB`
