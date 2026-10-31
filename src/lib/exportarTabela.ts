// Passo 61: exportar qualquer tabela da tela em CSV (abre no Excel com acentos) ou PDF simples.
import { gerarPdfTexto, quebrar } from '@/lib/pdfSimples'

export type Grade = { titulo: string; cabecalho: string[]; linhas: string[][] }

const limpar = (s: string) => s.replace(/\s+/g, ' ').trim()

/** CSV com BOM UTF-8 e ponto e vírgula (padrão do Excel em português). */
export function paraCsv(g: Grade): string {
  const cel = (v: string) => (/[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  return '﻿' + [g.cabecalho, ...g.linhas].map(l => l.map(c => cel(limpar(c))).join(';')).join('\r\n') + '\r\n'
}

/** Lê uma <table> do DOM: cabeçalho do <thead> (ou da primeira linha) e corpo; ignora colunas só de ações. */
export function lerTabela(t: HTMLTableElement, tituloPadrao: string): Grade {
  const texto = (el: Element) => limpar((el as HTMLElement).innerText ?? el.textContent ?? '')
  const linhasDom = [...t.querySelectorAll('tr')]
  const head = t.tHead?.rows[0] ?? linhasDom[0]
  const cabecalho = head ? [...head.cells].map(texto) : []
  const corpo = linhasDom.filter(r => r !== head && r.cells.length > 0).map(r => [...r.cells].map(texto))
  const ignorar = new Set(cabecalho.map((c, i) => (/^a[çc][õo]es$/i.test(c) || (c === '' && corpo.every(l => !l[i]))) ? i : -1).filter(i => i >= 0))
  const fica = (l: string[]) => l.filter((_, i) => !ignorar.has(i))
  const titulo = limpar(t.caption?.textContent ?? '') || tituloAnterior(t) || tituloPadrao
  return { titulo, cabecalho: fica(cabecalho), linhas: corpo.map(fica).filter(l => l.some(Boolean)) }
}

function tituloAnterior(t: Element): string {
  let el: Element | null = t
  for (let n = 0; el && n < 6; n++) {
    let irmao = el.previousElementSibling
    while (irmao) {
      const h = irmao.matches('h1,h2,h3,h4') ? irmao : irmao.querySelector('h2,h3,h4')
      if (h) return limpar(h.textContent ?? '')
      irmao = irmao.previousElementSibling
    }
    el = el.parentElement
  }
  return ''
}

export function paraPdf(g: Grade, tela: string): Uint8Array<ArrayBuffer> {
  const linhas: Parameters<typeof gerarPdfTexto>[1] = [
    { texto: 'GMenezes Advogados Associados', tamanho: 14, negrito: true, cor: [0.08, 0.13, 0.24] },
    { texto: `${tela} · ${g.titulo}`, tamanho: 11, negrito: true },
    { texto: `Exportado em ${new Date().toLocaleString('pt-BR')} · ${g.linhas.length} linha(s)`, tamanho: 8, cor: [0.4, 0.4, 0.4] },
    { texto: ' ', tamanho: 6 },
  ]
  for (const l of g.linhas) {
    const pares = l.map((v, i) => (g.cabecalho[i] ? `${g.cabecalho[i]}: ${v || '-'}` : v)).filter(Boolean).join(' · ')
    quebrar(pares, 8.5).forEach((t, i) => linhas.push({ texto: t, tamanho: 8.5, x: i ? 52 : undefined }))
    linhas.push({ texto: ' ', tamanho: 3 })
  }
  linhas.push({ texto: ' ', tamanho: 6 }, { texto: 'Desenvolvido pelo Instituto THEYE.', tamanho: 7, cor: [0.4, 0.4, 0.4] })
  return gerarPdfTexto(`${tela} - ${g.titulo}`, linhas)
}

export function nomeArquivo(tela: string, titulo: string, ext: string) {
  const base = `${tela}-${titulo}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
  return `${base || 'tabela'}-${new Date().toISOString().slice(0, 10)}.${ext}`
}
