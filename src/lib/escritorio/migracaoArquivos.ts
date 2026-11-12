// Abre cada arquivo do sistema antigo no próprio navegador (nada sai do computador antes da conferência)
// e devolve as tabelas que achou. Formatos: .xlsx (todas as abas), .xls exportado como HTML, .ods, .csv,
// .tsv, .txt, .json, .ics, .html, .docx (tabelas e texto) e .pdf (texto). O .xls binário antigo e
// imagens escaneadas não dão para ler aqui: a tela explica o que fazer.
import { arquivoDoZip, xlsxAbas } from './lerXlsx'
import { montarTabela, pareceTabela, tabelaDoTexto, textoEmLinhas, type Tabela } from './migracao'
import { lerIcs } from '@/lib/ics'

const desescapar = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, '&')
const semTags = (s: string) => desescapar(s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

/** Tabelas de um HTML (muitos sistemas exportam "Excel" assim). */
export function tabelasDoHtml(html: string): string[][][] {
  return [...html.matchAll(/<table\b[\s\S]*?<\/table>/gi)].map(t =>
    [...t[0].matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map(r => [...r[0].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => semTags(c[1]))).filter(r => r.some(Boolean)),
  ).filter(t => t.length)
}

/** Tabelas e texto de um Word (.docx). */
export function lerDocxXml(xml: string): { tabelas: string[][][]; texto: string } {
  const tabelas = [...xml.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>/g)].map(t =>
    [...t[0].matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)].map(r => [...r[0].matchAll(/<w:tc>([\s\S]*?)<\/w:tc>/g)].map(c => desescapar([...c[1].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(m => m[1]).join('')).trim())),
  ).filter(t => t.length > 1)
  const texto = [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map(p => desescapar([...p[0].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(m => m[1]).join(''))).join('\n')
  return { tabelas, texto }
}

/** Abas de uma planilha do LibreOffice (.ods). */
export function lerOdsXml(xml: string): { nome: string; linhas: string[][] }[] {
  return [...xml.matchAll(/<table:table\b([^>]*)>([\s\S]*?)<\/table:table>/g)].map(t => {
    const nome = desescapar(t[1].match(/table:name="([^"]*)"/)?.[1] ?? 'Aba')
    const linhas: string[][] = []
    for (const r of t[2].matchAll(/<table:table-row\b[^>]*?(?:\/>|>([\s\S]*?)<\/table:table-row>)/g)) {
      const cel: string[] = []
      for (const c of (r[1] ?? '').matchAll(/<table:(?:covered-)?table-cell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/table:(?:covered-)?table-cell>)/g)) {
        const rep = Math.min(Number(c[1].match(/number-columns-repeated="(\d+)"/)?.[1] ?? 1), 50)
        const data = c[1].match(/office:date-value="([^"]+)"/)?.[1]
        const v = data ?? [...(c[2] ?? '').matchAll(/<text:p[^>]*>([\s\S]*?)<\/text:p>/g)].map(m => semTags(m[1])).join(' ')
        for (let k = 0; k < rep; k++) cel.push(v)
      }
      while (cel.length && !cel[cel.length - 1]) cel.pop()
      if (cel.some(Boolean)) linhas.push(cel)
    }
    return { nome, linhas }
  })
}

/** JSON exportado de outro sistema: lista de objetos (ou um objeto com listas dentro). */
export function tabelasDoJson(dado: unknown): { nome: string; linhas: string[][] }[] {
  const out: { nome: string; linhas: string[][] }[] = []
  const plano = (o: unknown): string => (o == null ? '' : typeof o === 'object' ? JSON.stringify(o) : String(o))
  const lista = (nome: string, arr: unknown[]) => {
    const objs = arr.filter(x => x && typeof x === 'object' && !Array.isArray(x)) as Record<string, unknown>[]
    if (!objs.length) return
    const chaves = [...new Set(objs.flatMap(o => Object.keys(o)))]
    out.push({ nome, linhas: [chaves, ...objs.map(o => chaves.map(k => plano(o[k])))] })
  }
  if (Array.isArray(dado)) lista('Lista', dado)
  else if (dado && typeof dado === 'object') for (const [k, v] of Object.entries(dado)) if (Array.isArray(v)) lista(k, v)
  return out
}

async function textoDoPdf(f: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
  const doc = await pdfjs.getDocument({ data: await f.arrayBuffer() }).promise
  const partes: string[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const c = await (await doc.getPage(n)).getTextContent()
    partes.push(c.items.map(it => ('str' in it ? it.str : '')).join(' '))
  }
  return partes.join('\n')
}

/** Lê o texto de um arquivo tentando UTF-8 e, se aparecerem caracteres quebrados, Windows-1252 (Excel antigo). */
async function lerTexto(f: File): Promise<string> {
  const buf = await f.arrayBuffer()
  const utf = new TextDecoder('utf-8').decode(buf)
  return utf.includes('�') ? new TextDecoder('windows-1252').decode(buf) : utf
}

function deTexto(arquivo: string, aba: string, texto: string): Tabela[] {
  const linhas = textoEmLinhas(texto)
  if (pareceTabela(linhas)) return [montarTabela(arquivo, aba, linhas)]
  return [tabelaDoTexto(arquivo, aba, texto)]
}

export type Leitura = { tabelas: Tabela[]; avisos: string[] }

export async function lerArquivo(f: File): Promise<Leitura> {
  const nome = f.name
  const ext = (nome.match(/\.([a-z0-9]+)$/i)?.[1] ?? '').toLowerCase()
  const avisos: string[] = []
  const tabelas: Tabela[] = []
  try {
    if (ext === 'xlsx' || ext === 'xlsm') {
      for (const a of await xlsxAbas(await f.arrayBuffer())) if (a.texto.trim()) tabelas.push(montarTabela(nome, a.nome, a.texto.split('\n').map(l => l.split('\t').map(x => x.trim()))))
    } else if (ext === 'ods') {
      const xml = await arquivoDoZip(await f.arrayBuffer(), 'content.xml')
      for (const a of lerOdsXml(xml ?? '')) if (a.linhas.length) tabelas.push(montarTabela(nome, a.nome, a.linhas))
    } else if (ext === 'docx') {
      const xml = await arquivoDoZip(await f.arrayBuffer(), 'word/document.xml')
      const d = lerDocxXml(xml ?? '')
      d.tabelas.forEach((t, i) => tabelas.push(montarTabela(nome, `Tabela ${i + 1}`, t)))
      const doTexto = tabelaDoTexto(nome, 'Texto', d.texto)
      if (doTexto.linhas.length || !tabelas.length) tabelas.push(doTexto)
    } else if (ext === 'pdf') {
      tabelas.push(tabelaDoTexto(nome, 'Texto do PDF', await textoDoPdf(f)))
      if (!tabelas[0].linhas.length) avisos.push(`${nome}: não achei número de processo. Se o PDF é uma foto (escaneado), o texto não pode ser lido; use a lista em Excel.`)
    } else if (ext === 'ics') {
      const ev = lerIcs(await lerTexto(f))
      tabelas.push(montarTabela(nome, 'Calendário', [['Data', 'Compromisso', 'Local'], ...ev.map(e => [e.data, e.titulo, e.local])]))
    } else if (ext === 'json') {
      const abas = tabelasDoJson(JSON.parse(await lerTexto(f)))
      for (const a of abas) tabelas.push(montarTabela(nome, a.nome, a.linhas))
      if (!abas.length) avisos.push(`${nome}: o JSON não tem lista de registros.`)
    } else if (ext === 'xls' || ext === 'htm' || ext === 'html') {
      const buf = new Uint8Array(await f.slice(0, 8).arrayBuffer())
      if (buf[0] === 0xd0 && buf[1] === 0xcf) {
        avisos.push(`${nome}: é o formato antigo do Excel (.xls, de antes de 2007). Abra no Excel e use Arquivo → Salvar como → "Pasta de Trabalho do Excel (.xlsx)", e solte o novo arquivo aqui.`)
      } else {
        const texto = await lerTexto(f)
        const html = tabelasDoHtml(texto)
        if (html.length) html.forEach((t, i) => tabelas.push(montarTabela(nome, html.length > 1 ? `Tabela ${i + 1}` : 'Planilha', t)))
        else tabelas.push(...deTexto(nome, 'Planilha', /<[a-z][\s\S]*>/i.test(texto) ? semTags(texto) : texto))
      }
    } else if (['csv', 'tsv', 'txt', 'tab', 'prn', 'eml', 'xml', ''].includes(ext)) {
      tabelas.push(...deTexto(nome, ext === 'txt' || ext === 'eml' ? 'Texto' : 'Planilha', await lerTexto(f)))
    } else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'tif', 'tiff', 'bmp', 'heic'].includes(ext)) {
      avisos.push(`${nome}: é uma imagem. Não dá para tirar os dados de uma foto com segurança; mande a planilha ou o PDF com texto.`)
    } else if (ext === 'zip' || ext === 'rar' || ext === '7z') {
      avisos.push(`${nome}: é um arquivo compactado. Descompacte no computador e solte aqui os arquivos de dentro (pode soltar todos de uma vez).`)
    } else {
      tabelas.push(...deTexto(nome, 'Arquivo', await lerTexto(f)))
    }
  } catch (e) {
    avisos.push(`${nome}: não consegui abrir (${e instanceof Error ? e.message : String(e)}).`)
  }
  return { tabelas, avisos }
}
