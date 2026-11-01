// Dublê do pdf-lib para os testes das Edge Functions: não desenha nada, só anota os textos e devolve bytes que começam como PDF.
export const desenhado: { textos: string[]; paginas: number; titulo: string } = { textos: [], paginas: 0, titulo: '' }

export const rgb = (r: number, g: number, b: number) => ({ r, g, b })

class Fonte { widthOfTextAtSize(t: string, s: number) { return t.length * s * 0.5 } }
class Pagina {
  drawRectangle() { /* nada */ }
  drawLine() { /* nada */ }
  drawText(t: string) { desenhado.textos.push(t) }
}
export class PDFDocument {
  static async create() { desenhado.textos = []; desenhado.paginas = 0; desenhado.titulo = ''; return new PDFDocument() }
  setTitle(t: string) { desenhado.titulo = t }
  setAuthor() { /* nada */ }
  async embedFont() { return new Fonte() }
  addPage() { desenhado.paginas++; return new Pagina() }
  async save() { return new TextEncoder().encode(`%PDF-1.7\n${desenhado.titulo}\n${desenhado.textos.join('\n')}\n%%EOF`) }
}
