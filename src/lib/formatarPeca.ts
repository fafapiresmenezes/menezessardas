// Peça formatada no padrão de grandes escritórios (pedido de M, 06/11/2026): gera um arquivo
// que o Word abre direto (HTML com estilos do Office), com fonte, margens, entrelinhas,
// recuos, títulos e citações conforme FORMATACAO em estiloPecas.ts.
import { FORMATACAO } from './estiloPecas'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const negrito = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')

/** Linha que é título de seção: "I – DOS FATOS", "1. DO DIREITO", "## Do pedido" ou toda em caixa alta. */
export function ehTitulo(linha: string) {
  const t = linha.trim().replace(/^#+\s*/, '').replace(/\*\*/g, '')
  if (/^#+\s/.test(linha.trim())) return true
  if (t.length < 4 || t.length > 110) return false
  const letras = t.replace(/[^A-Za-zÀ-ÿ]/g, '')
  return letras.length >= 4 && letras === letras.toUpperCase() && !/[.;:]$/.test(t)
}

/** Converte o texto da peça (markdown simples) em HTML com o padrão de formatação. */
export function pecaEmHtml(texto: string, titulo = 'Peça') {
  const f = FORMATACAO
  const blocos = texto.replace(/\r/g, '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)
  const corpo = blocos.map(b => {
    const linhas = b.split('\n')
    if (linhas.length === 1 && ehTitulo(b)) return `<h2>${negrito(b.replace(/^#+\s*/, '').replace(/\*\*/g, ''))}</h2>`
    if (linhas.every(l => /^\s*>/.test(l))) return `<blockquote>${negrito(linhas.map(l => l.replace(/^\s*>\s?/, '')).join(' '))}</blockquote>`
    if (linhas.every(l => /^\s*([-*•]|[a-z]\)|\d+[.)])\s+/.test(l))) {
      return `<ul class="pedidos">${linhas.map(l => `<li>${negrito(l.replace(/^\s*[-*•]\s+/, ''))}</li>`).join('')}</ul>`
    }
    return linhas.map(l => (ehTitulo(l) ? `<h2>${negrito(l.replace(/^#+\s*/, '').replace(/\*\*/g, ''))}</h2>` : `<p>${negrito(l)}</p>`)).join('')
  }).join('\n')
  const m = f.margens
  return `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<style>
@page { size: 21cm 29.7cm; margin: ${m.superior}cm ${m.direita}cm ${m.inferior}cm ${m.esquerda}cm; }
body { font-family: '${f.fonte}', ${f.fonteAlternativa}, serif; font-size: ${f.corpo}pt; line-height: ${f.entrelinhas}; color: #000; }
p { text-align: justify; text-indent: ${f.recuoPrimeiraLinha}cm; margin: 0 0 6pt 0; }
h2 { font-size: ${f.corpo}pt; font-weight: bold; text-transform: uppercase; margin: 18pt 0 6pt 0; }
blockquote { margin: 6pt 0 6pt ${f.recuoCitacao}cm; font-size: ${f.citacaoLonga}pt; line-height: 1; text-align: justify; }
ul.pedidos { list-style: none; margin: 0 0 6pt ${f.recuoPrimeiraLinha}cm; padding: 0; }
ul.pedidos li { text-align: justify; margin-bottom: 4pt; }
</style></head><body>
${corpo}
</body></html>`
}

/** Baixa a peça como .doc (o Word abre e mantém a formatação). */
export function baixarPecaWord(texto: string, titulo = 'peca') {
  const html = pecaEmHtml(texto, titulo)
  const blob = new Blob(['﻿', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).toLowerCase() || 'peca'}.doc`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
