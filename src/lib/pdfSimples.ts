// Gerador de PDF mínimo, sem biblioteca: texto em Helvetica (WinAnsi), várias páginas A4.
// Serve para exportações auditáveis (Trilha) em que o conteúdo é texto tabulado e o que importa é o hash do arquivo.
type Linha = { texto: string; tamanho?: number; negrito?: boolean; cor?: [number, number, number]; x?: number }

const LARGURA = 595.28, ALTURA = 841.89, MARGEM = 40, ENTRELINHA = 1.35

// Converte para WinAnsi: o que não existe na tabela vira "?" (acentos do português existem).
function winAnsi(s: string): string {
  let r = ''
  for (const ch of s) {
    const c = ch.codePointAt(0)!
    if (c === 0x2014 || c === 0x2013) r += '-'
    else if (c === 0x2019 || c === 0x2018) r += "'"
    else if (c === 0x201c || c === 0x201d) r += '"'
    else if (c === 0x2026) r += '...'
    else if (c < 256) r += ch
    else r += '?'
  }
  return r.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}
// Bytes latin-1 do texto (o PDF é binário; evitamos UTF-8 nos literais).
function latin1(s: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(s.length))
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff
  return out
}
// Largura aproximada (Helvetica média 0,5 em) para quebrar linhas longas.
export function quebrar(texto: string, tamanho: number, larguraMax = LARGURA - 2 * MARGEM): string[] {
  const porLinha = Math.max(10, Math.floor(larguraMax / (tamanho * 0.5)))
  const linhas: string[] = []
  for (const paragrafo of texto.split('\n')) {
    let atual = ''
    for (const palavra of paragrafo.split(' ')) {
      if ((atual + ' ' + palavra).trim().length > porLinha) { if (atual) linhas.push(atual); atual = palavra }
      else atual = (atual + ' ' + palavra).trim()
    }
    linhas.push(atual)
  }
  return linhas
}

export function gerarPdfTexto(titulo: string, linhas: Linha[]): Uint8Array<ArrayBuffer> {
  const paginas: string[] = []
  let conteudo = ''; let y = ALTURA - MARGEM
  const fechar = () => { paginas.push(conteudo); conteudo = ''; y = ALTURA - MARGEM }
  for (const l of linhas) {
    const t = l.tamanho ?? 9
    if (y - t * ENTRELINHA < MARGEM) fechar()
    y -= t * ENTRELINHA
    const cor = l.cor ?? [0.1, 0.1, 0.1]
    conteudo += `BT /${l.negrito ? 'F2' : 'F1'} ${t} Tf ${cor.join(' ')} rg ${(l.x ?? MARGEM).toFixed(2)} ${y.toFixed(2)} Td (${winAnsi(l.texto)}) Tj ET\n`
  }
  fechar()

  const objetos: string[] = []
  const add = (s: string) => { objetos.push(s); return objetos.length }
  const fonte1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  const fonte2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
  const paginasId = objetos.length + 1 + paginas.length * 2
  const ids: number[] = []
  for (const c of paginas) {
    const stream = add(`<< /Length ${latin1(c).length} >>\nstream\n${c}endstream`)
    ids.push(add(`<< /Type /Page /Parent ${paginasId} 0 R /MediaBox [0 0 ${LARGURA} ${ALTURA}] /Resources << /Font << /F1 ${fonte1} 0 R /F2 ${fonte2} 0 R >> >> /Contents ${stream} 0 R >>`))
  }
  const pags = add(`<< /Type /Pages /Kids [${ids.map(i => `${i} 0 R`).join(' ')}] /Count ${ids.length} >>`)
  const catalogo = add(`<< /Type /Catalog /Pages ${pags} 0 R >>`)
  const info = add(`<< /Title (${winAnsi(titulo)}) /Producer (Plataforma GMenezes) >>`)

  let saida = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'
  const offsets: number[] = []
  objetos.forEach((o, i) => { offsets.push(latin1(saida).length); saida += `${i + 1} 0 obj\n${o}\nendobj\n` })
  const xref = latin1(saida).length
  saida += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n` + offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
  saida += `trailer\n<< /Size ${objetos.length + 1} /Root ${catalogo} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return latin1(saida)
}
