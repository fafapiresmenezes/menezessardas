import { describe, it, expect, vi } from 'vitest'

// Leitor de PDF simulado: páginas e textos vêm do teste, sem worker nem rede.
let paginas: string[][] = []
vi.mock('pdfjs-dist', () => ({
  version: '4.0.0',
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: paginas.length,
      getPage: async (n: number) => ({
        getTextContent: async () => ({ items: paginas[n - 1].map(str => ({ str })).concat([{ tipo: 'marca' } as never]) }),
      }),
    }),
  }),
}))

const { extrairTextoPdf } = await import('./pdf')
const pdfjs = await import('pdfjs-dist')
const arquivo = new File(['%PDF'], 'c.pdf', { type: 'application/pdf' })

describe('extração de texto do PDF', () => {
  it('usa o worker do cdnjs na mesma versão do pacote', () => {
    expect(pdfjs.GlobalWorkerOptions.workerSrc).toBe('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.0/pdf.worker.min.mjs')
  })

  it('junta os itens de cada página com espaço e as páginas com quebra de linha, ignorando itens sem texto', async () => {
    paginas = [['CONTRATO', 'DE', 'LOCAÇÃO'], ['Cláusula 1ª']]
    expect(await extrairTextoPdf(arquivo)).toBe('[Página 1] CONTRATO DE LOCAÇÃO \n[Página 2] Cláusula 1ª')
  })

  it('para de ler depois de 40 mil caracteres e corta o texto nesse limite', async () => {
    const pagina = ['x'.repeat(25000)]
    paginas = [pagina, pagina, pagina, pagina]
    const texto = await extrairTextoPdf(arquivo)
    expect(texto.length).toBe(40000)
    expect(texto).not.toContain('\n'.repeat(3))
  })

  it('PDF sem páginas devolve texto vazio', async () => {
    paginas = []
    expect(await extrairTextoPdf(arquivo)).toBe('')
  })
})
