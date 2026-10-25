/**
 * Extração de texto de um PDF no próprio navegador, para o agente analisar o
 * conteúdo do contrato, não só os campos do cadastro. O worker é carregado
 * pelo Vite como URL.
 */
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

const LIMITE_CHARS = 40000

export async function extrairTextoPdf(arquivo: File): Promise<string> {
  const buffer = await arquivo.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buffer }).promise
  const partes: string[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const pagina = await doc.getPage(n)
    const conteudo = await pagina.getTextContent()
    const linha = conteudo.items.map(it => ('str' in it ? it.str : '')).join(' ')
    partes.push(linha)
    if (partes.join(' ').length > LIMITE_CHARS) break
  }
  return partes.join('\n').slice(0, LIMITE_CHARS).trim()
}
