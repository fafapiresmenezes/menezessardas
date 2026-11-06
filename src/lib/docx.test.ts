// Bloco E (06/11/2026): Word enviado em "Meu estilo de escrita" vira texto + formatação.
import { describe, it, expect } from 'vitest'
import { deflateRawSync } from 'node:zlib'
import { lerDocx, textoDoDocumento, formatacaoDoDocumento } from './docx'
import { formatacaoFinal, pecaEmHtml } from './formatarPeca'

/** Monta um ZIP mínimo (deflate) com os arquivos dados. */
function zip(arquivos: Record<string, string>) {
  const locais: Buffer[] = [], centrais: Buffer[] = []
  let off = 0
  for (const [nome, conteudo] of Object.entries(arquivos)) {
    const nb = Buffer.from(nome), dados = deflateRawSync(Buffer.from(conteudo))
    const l = Buffer.alloc(30); l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(8, 8); l.writeUInt32LE(dados.length, 18); l.writeUInt32LE(conteudo.length, 22); l.writeUInt16LE(nb.length, 26)
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(8, 10); c.writeUInt32LE(dados.length, 20); c.writeUInt32LE(conteudo.length, 24); c.writeUInt16LE(nb.length, 28); c.writeUInt32LE(off, 42)
    locais.push(l, nb, dados); centrais.push(c, nb); off += 30 + nb.length + dados.length
  }
  const cd = Buffer.concat(centrais)
  const e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(Object.keys(arquivos).length, 8); e.writeUInt16LE(Object.keys(arquivos).length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16)
  return Buffer.concat([...locais, cd, e])
}

const DOC = `<w:document><w:body><w:p><w:r><w:t>EXCELENTÍSSIMO SENHOR</w:t></w:r></w:p><w:p><w:pPr><w:ind w:firstLine="1418"/></w:pPr><w:r><w:t xml:space="preserve">O réu &amp; a ré </w:t></w:r><w:r><w:t>não pagaram.</w:t></w:r></w:p>
<w:sectPr><w:pgMar w:top="1701" w:right="1134" w:bottom="1134" w:left="1701"/></w:sectPr></w:body></w:document>`
const ESTILOS = `<w:styles><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial"/><w:sz w:val="24"/></w:rPr></w:rPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:styleId="Normal"><w:pPr><w:spacing w:line="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Garamond"/><w:sz w:val="26"/></w:rPr></w:style></w:styles>`

describe('docx', () => {
  it('extrai texto por parágrafo e desfaz entidades', () => {
    expect(textoDoDocumento(DOC)).toBe('EXCELENTÍSSIMO SENHOR\n\nO réu & a ré não pagaram.')
  })
  it('lê fonte e tamanho do estilo Normal, entrelinhas, recuo e margens em cm', () => {
    expect(formatacaoDoDocumento(DOC, ESTILOS)).toEqual({ fonte: 'Garamond', corpo: 13, entrelinhas: 1.5, recuoPrimeiraLinha: 2.5, margens: { superior: 3, inferior: 2, esquerda: 3, direita: 2 } })
    expect(formatacaoDoDocumento('<w:document/>', '')).toEqual({})
  })
  it('abre um .docx de verdade (ZIP com deflate)', async () => {
    const r = await lerDocx(new Blob([zip({ 'word/document.xml': DOC, 'word/styles.xml': ESTILOS, 'outro.xml': '<x/>' })]))
    expect(r.texto).toContain('não pagaram')
    expect(r.formatacao.fonte).toBe('Garamond')
    await expect(lerDocx(new Blob(['não é zip']))).rejects.toThrow('Word inválido')
  })
  it('formatação da pessoa entra no Word baixado; valores absurdos são ignorados', () => {
    expect(formatacaoFinal(null).fonte).toBe('Times New Roman')
    const f = formatacaoFinal({ fonte: 'Garamond', corpo: 99, entrelinhas: 2, margens: { superior: 3, inferior: 2, esquerda: 3, direita: 40 } })
    expect(f).toMatchObject({ fonte: 'Garamond', corpo: 12, entrelinhas: 2, margens: { direita: 2 } })
    expect(formatacaoFinal({ fonte: "x'; } body{" }).fonte).toBe('Times New Roman')
    const html = pecaEmHtml('Texto da peça.', 'P', { fonte: 'Garamond', corpo: 13, entrelinhas: 1.5 })
    expect(html).toContain("font-family: 'Garamond'")
    expect(html).toContain('font-size: 13pt; line-height: 1.5')
  })
})
