// Passo 423: gerador de PDF mínimo — quebra de linhas e estrutura do arquivo (cabeçalho, páginas, xref, EOF).
import { describe, it, expect } from 'vitest'
import { quebrar, gerarPdfTexto } from './pdfSimples'

const texto = (b: Uint8Array) => Array.from(b).map(c => String.fromCharCode(c)).join('')

describe('quebrar', () => {
  it('respeita parágrafos e quebra linhas longas sem cortar palavras', () => {
    const linhas = quebrar('Primeira linha curta\n' + 'palavra '.repeat(60).trim(), 9)
    expect(linhas[0]).toBe('Primeira linha curta')
    expect(linhas.length).toBeGreaterThan(3)
    for (const l of linhas.slice(1)) expect(l.length).toBeLessThanOrEqual(Math.floor((595.28 - 80) / 4.5))
    expect(linhas.slice(1).join(' ')).toBe('palavra '.repeat(60).trim())
  })
  it('texto vazio devolve uma linha vazia', () => {
    expect(quebrar('', 9)).toEqual([''])
  })
})

describe('gerarPdfTexto', () => {
  it('produz um PDF 1.4 com cabeçalho, fontes Helvetica, uma página, xref e EOF', () => {
    const pdf = gerarPdfTexto('Trilha de auditoria', [{ texto: 'Olá, Fátima — teste', negrito: true }, { texto: 'linha 2' }])
    const s = texto(pdf)
    expect(s.startsWith('%PDF-1.4\n')).toBe(true)
    expect(s.endsWith('%%EOF\n')).toBe(true)
    expect(s).toContain('/BaseFont /Helvetica ')
    expect(s).toContain('/BaseFont /Helvetica-Bold')
    expect(s).toContain('/Count 1')
    expect(s).toContain('/Title (Trilha de auditoria)')
    expect(s).toContain('(Ol\xe1, F\xe1tima - teste) Tj')
    expect(s).toContain('/F2 9 Tf')
  })
  it('quebra em várias páginas quando as linhas não cabem e os offsets do xref apontam para os objetos', () => {
    const linhas = Array.from({ length: 200 }, (_, i) => ({ texto: `linha ${i}` }))
    const pdf = gerarPdfTexto('Muitas', linhas)
    const s = texto(pdf)
    expect(s).toMatch(/\/Count ([3-9]|\d{2})/)
    const startxref = Number(s.match(/startxref\n(\d+)\n/)![1])
    expect(s.slice(startxref, startxref + 4)).toBe('xref')
    const primeiro = s.match(/\n(\d{10}) 00000 n/)![1]
    expect(s.slice(Number(primeiro), Number(primeiro) + 7)).toBe('1 0 obj')
  })
})
