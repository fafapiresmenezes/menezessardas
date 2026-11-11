// Lê a primeira aba de uma planilha do Excel (.xlsx) direto no navegador, sem biblioteca externa:
// o .xlsx é um ZIP com XML dentro. Devolve o conteúdo como texto separado por tabulação,
// o mesmo formato de quando a pessoa copia as células e cola. Assim ninguém precisa "salvar como CSV".

const u16 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8)
const u32 = (b: Uint8Array, i: number) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0

type Entrada = { nome: string; metodo: number; tamanho: number; inicio: number }

function entradasDoZip(b: Uint8Array): Entrada[] {
  let fim = -1
  for (let i = b.length - 22; i >= Math.max(0, b.length - 66000); i--) if (u32(b, i) === 0x06054b50) { fim = i; break }
  if (fim < 0) throw new Error('O arquivo não parece ser uma planilha do Excel (.xlsx).')
  const total = u16(b, fim + 10)
  let p = u32(b, fim + 16)
  const dec = new TextDecoder()
  const lista: Entrada[] = []
  for (let k = 0; k < total; k++) {
    if (u32(b, p) !== 0x02014b50) break
    const metodo = u16(b, p + 10), tamanho = u32(b, p + 20), n = u16(b, p + 28), e = u16(b, p + 30), c = u16(b, p + 32), local = u32(b, p + 42)
    const nome = dec.decode(b.subarray(p + 46, p + 46 + n))
    const inicio = local + 30 + u16(b, local + 26) + u16(b, local + 28)
    lista.push({ nome, metodo, tamanho, inicio })
    p += 46 + n + e + c
  }
  return lista
}

async function abrir(b: Uint8Array, e: Entrada): Promise<string> {
  const dados = b.slice(e.inicio, e.inicio + e.tamanho)
  if (e.metodo === 0) return new TextDecoder().decode(dados)
  if (e.metodo !== 8) throw new Error('Compressão da planilha não reconhecida.')
  const fluxo = new Response(dados).body!.pipeThrough(new DecompressionStream('deflate-raw'))
  return await new Response(fluxo).text()
}

const desescapar = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, '&')
const textoDe = (xml: string) => desescapar([...xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(m => m[1]).join(''))
const coluna = (ref: string) => { let n = 0; for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1 }

/** Converte o .xlsx em texto com colunas separadas por tabulação (uma linha por linha da planilha). */
export async function xlsxParaTexto(arquivo: ArrayBuffer): Promise<string> {
  const b = new Uint8Array(arquivo)
  const entradas = entradasDoZip(b)
  const achar = (nome: string) => entradas.find(e => e.nome === nome)
  const comp = achar('xl/sharedStrings.xml')
  const compartilhadas = comp ? [...(await abrir(b, comp)).matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => textoDe(m[1])) : []
  const abas = entradas.filter(e => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.nome)).sort((x, y) => Number(x.nome.match(/\d+/)![0]) - Number(y.nome.match(/\d+/)![0]))
  if (!abas.length) throw new Error('Não achei nenhuma aba com dados na planilha.')
  const xml = await abrir(b, abas[0])
  const linhas: string[] = []
  for (const r of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const celulas: string[] = []
    for (const c of r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1], dentro = c[2] ?? ''
      const ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1]
      const tipo = attrs.match(/\bt="(\w+)"/)?.[1]
      const v = dentro.match(/<v>([\s\S]*?)<\/v>/)?.[1]
      let valor = ''
      if (tipo === 's' && v !== undefined) valor = compartilhadas[Number(v)] ?? ''
      else if (tipo === 'inlineStr') valor = textoDe(dentro)
      else if (v !== undefined) valor = desescapar(v)
      const i = ref ? coluna(ref) : celulas.length
      while (celulas.length < i) celulas.push('')
      celulas[i] = valor.replace(/[\t\r\n]+/g, ' ').trim()
    }
    if (celulas.some(x => x)) linhas.push(celulas.join('\t'))
  }
  return linhas.join('\n')
}
