// Peça formatada no padrão de grandes escritórios (pedido de M, 06/11/2026): gera um arquivo
// que o Word abre direto (HTML com estilos do Office), com fonte, margens, entrelinhas,
// recuos, títulos e citações conforme FORMATACAO em estiloPecas.ts.
import { FORMATACAO } from './estiloPecas'

/** Formatação de saída: o padrão de grandes escritórios ou a da própria pessoa (lida do Word que ela enviou). */
export interface Formatacao {
  fonte: string
  corpo: number
  entrelinhas: number
  recuoPrimeiraLinha: number
  margens: { superior: number; inferior: number; esquerda: number; direita: number }
}

/** Junta a formatação da pessoa ao padrão, aceitando só valores plausíveis. */
export function formatacaoFinal(propria?: Partial<Formatacao> | null): Formatacao {
  const base: Formatacao = { fonte: FORMATACAO.fonte, corpo: FORMATACAO.corpo, entrelinhas: FORMATACAO.entrelinhas, recuoPrimeiraLinha: FORMATACAO.recuoPrimeiraLinha, margens: { ...FORMATACAO.margens } }
  if (!propria) return base
  const ok = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max
  if (typeof propria.fonte === 'string' && /^[\w À-ÿ-]{2,40}$/.test(propria.fonte)) base.fonte = propria.fonte
  if (ok(propria.corpo, 8, 16)) base.corpo = propria.corpo!
  if (ok(propria.entrelinhas, 1, 3)) base.entrelinhas = propria.entrelinhas!
  if (ok(propria.recuoPrimeiraLinha, 0, 5)) base.recuoPrimeiraLinha = propria.recuoPrimeiraLinha!
  const m = propria.margens
  if (m && [m.superior, m.inferior, m.esquerda, m.direita].every(x => ok(x, 0.5, 6))) base.margens = { ...m }
  return base
}

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

/**
 * Dez modelos de formatação, em rodízio (pedido do M, 11/11/2026: "formatação top 10, rotacionada").
 * Todos seguem o que é aceito em peça forense no Brasil (A4, texto justificado, fonte serifada ou sóbria de 11,5 a 13 pt,
 * entrelinhas de 1,15 a 1,5, margens ABNT ou próximas, citação longa recuada) e variam o que muda de banca para banca:
 * fonte, corpo, entrelinhas, margens, recuo, como os títulos aparecem e se os parágrafos são numerados.
 * São padrões gerais, inspirados em práticas públicas; não reproduzem o manual de nenhum escritório.
 */
export type NumeracaoTitulo = 'romano' | 'arabico' | 'nenhuma'
export interface ModeloFormatacao {
  id: string
  nome: string
  base: Formatacao
  tituloAlinhado: 'left' | 'center'
  numeracaoTitulos: NumeracaoTitulo
  paragrafosNumerados: boolean
  espacoDepois: number
  tituloVersalete: boolean
}
const M = (superior: number, direita: number, inferior: number, esquerda: number) => ({ superior, direita, inferior, esquerda })
export const FORMATOS: ModeloFormatacao[] = [
  { id: 'abnt-classico', nome: 'Clássico ABNT', base: { fonte: 'Times New Roman', corpo: 12, entrelinhas: 1.5, recuoPrimeiraLinha: 2, margens: M(3, 2, 2, 3) }, tituloAlinhado: 'left', numeracaoTitulos: 'romano', paragrafosNumerados: false, espacoDepois: 6, tituloVersalete: false },
  { id: 'banca-numerada', nome: 'Grande banca, parágrafos numerados', base: { fonte: 'Garamond', corpo: 13, entrelinhas: 1.5, recuoPrimeiraLinha: 0, margens: M(3, 2.5, 2.5, 3) }, tituloAlinhado: 'left', numeracaoTitulos: 'arabico', paragrafosNumerados: true, espacoDepois: 8, tituloVersalete: false },
  { id: 'tribunal-superior', nome: 'Tribunal superior (memorial)', base: { fonte: 'Book Antiqua', corpo: 12, entrelinhas: 1.5, recuoPrimeiraLinha: 2.5, margens: M(3, 2, 2, 3) }, tituloAlinhado: 'center', numeracaoTitulos: 'romano', paragrafosNumerados: false, espacoDepois: 6, tituloVersalete: true },
  { id: 'corporativo', nome: 'Corporativo sóbrio', base: { fonte: 'Arial', corpo: 12, entrelinhas: 1.5, recuoPrimeiraLinha: 0, margens: M(2.5, 2.5, 2.5, 3) }, tituloAlinhado: 'left', numeracaoTitulos: 'arabico', paragrafosNumerados: true, espacoDepois: 10, tituloVersalete: false },
  { id: 'cambria-moderno', nome: 'Moderno de escritório', base: { fonte: 'Cambria', corpo: 12, entrelinhas: 1.5, recuoPrimeiraLinha: 1.5, margens: M(3, 2, 2, 3) }, tituloAlinhado: 'left', numeracaoTitulos: 'romano', paragrafosNumerados: false, espacoDepois: 8, tituloVersalete: false },
  { id: 'palatino-academico', nome: 'Acadêmico (parecerista)', base: { fonte: 'Palatino Linotype', corpo: 12, entrelinhas: 1.5, recuoPrimeiraLinha: 2, margens: M(3, 2.5, 2.5, 3) }, tituloAlinhado: 'center', numeracaoTitulos: 'arabico', paragrafosNumerados: true, espacoDepois: 6, tituloVersalete: true },
  { id: 'georgia-leitura', nome: 'Leitura em tela (PJe)', base: { fonte: 'Georgia', corpo: 12, entrelinhas: 1.5, recuoPrimeiraLinha: 1.25, margens: M(2.5, 2.5, 2.5, 2.5) }, tituloAlinhado: 'left', numeracaoTitulos: 'nenhuma', paragrafosNumerados: false, espacoDepois: 10, tituloVersalete: false },
  { id: 'century-contencioso', nome: 'Contencioso tradicional', base: { fonte: 'Century Schoolbook', corpo: 12, entrelinhas: 1.5, recuoPrimeiraLinha: 2.5, margens: M(3, 2, 2, 3) }, tituloAlinhado: 'left', numeracaoTitulos: 'romano', paragrafosNumerados: true, espacoDepois: 6, tituloVersalete: false },
  { id: 'calibri-agil', nome: 'Ágil de contencioso de massa', base: { fonte: 'Calibri', corpo: 12, entrelinhas: 1.15, recuoPrimeiraLinha: 1.25, margens: M(2.5, 2, 2, 3) }, tituloAlinhado: 'left', numeracaoTitulos: 'arabico', paragrafosNumerados: false, espacoDepois: 10, tituloVersalete: false },
  { id: 'times-compacto', nome: 'Compacto de juizado', base: { fonte: 'Times New Roman', corpo: 12, entrelinhas: 1.15, recuoPrimeiraLinha: 1.5, margens: M(2.5, 2, 2, 2.5) }, tituloAlinhado: 'left', numeracaoTitulos: 'romano', paragrafosNumerados: false, espacoDepois: 6, tituloVersalete: false },
]

/** Escolhe o modelo de formatação desta peça: pela semente, sem repetir os últimos usados enquanto houver outro. */
export function sortearFormato(semente: number, usados: string[] = []): ModeloFormatacao {
  const recentes = new Set(usados.slice(0, FORMATOS.length - 1))
  const livres = FORMATOS.filter(f => !recentes.has(f.id))
  const lista = livres.length ? livres : FORMATOS
  return lista[(semente >>> 0) % lista.length]
}

const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX']
/** Tira a numeração que a IA pôs ("I –", "1.", "2)") para o modelo aplicar a dele, igual em toda a peça. */
const semNumero = (t: string) => t.replace(/^\s*(?:[IVXLC]+|\d+(?:\.\d+)*)\s*(?:[–—.)-]|\.\s*[–—-])?\s+(?=[A-ZÀ-Ý])/, '')

/** Converte o texto da peça (markdown simples) em HTML com o padrão de formatação (e, se dado, o modelo do rodízio). */
export function pecaEmHtml(texto: string, titulo = 'Peça', propria?: Partial<Formatacao> | null, modelo?: ModeloFormatacao | null) {
  if (modelo) return pecaComModelo(texto, titulo, propria, modelo)
  const f = { ...FORMATACAO, ...formatacaoFinal(propria) }
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
body { font-family: '${esc(f.fonte)}', ${f.fonteAlternativa}, serif; font-size: ${f.corpo}pt; line-height: ${f.entrelinhas}; color: #000; }
p { text-align: justify; text-indent: ${f.recuoPrimeiraLinha}cm; margin: 0 0 6pt 0; }
h2 { font-size: ${f.corpo}pt; font-weight: bold; text-transform: uppercase; margin: 18pt 0 6pt 0; }
blockquote { margin: 6pt 0 6pt ${f.recuoCitacao}cm; font-size: ${f.citacaoLonga}pt; line-height: 1; text-align: justify; }
ul.pedidos { list-style: none; margin: 0 0 6pt ${f.recuoPrimeiraLinha}cm; padding: 0; }
ul.pedidos li { text-align: justify; margin-bottom: 4pt; }
</style></head><body>
${corpo}
</body></html>`
}

function pecaComModelo(texto: string, titulo: string, propria: Partial<Formatacao> | null | undefined, md: ModeloFormatacao) {
  // A formatação da própria pessoa (Word que ela enviou) vale por cima do modelo; o resto vem do modelo sorteado.
  const f = { ...FORMATACAO, ...md.base, ...(propria ? formatacaoFinal({ ...md.base, ...propria }) : {}) }
  let nTitulo = 0, nPar = 0, depoisDoPrimeiroTitulo = false
  const tituloHtml = (bruto: string) => {
    const sem = bruto.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim()
    const limpo = semNumero(sem)
    // Endereçamento, nome das partes e nome da peça também vêm em caixa alta, mas não são seção: ficam sem número.
    const secao = limpo !== sem || /^(D[OA]S?\s|PRELIMINAR|M[ÉE]RITO|S[ÍI]NTESE|CONCLUS|PEDIDO|REQUERIMENTO|TEMPESTIVIDADE|CABIMENTO|RESUMO|BREVE|RAZ[ÕO]ES|FUNDAMENT|INTRODU)/.test(limpo)
    if (!secao) return `<p class="cx"><b>${negrito(limpo)}</b></p>`
    nTitulo++; depoisDoPrimeiroTitulo = true
    const prefixo = md.numeracaoTitulos === 'romano' ? `${ROMANOS[nTitulo - 1] ?? nTitulo} – ` : md.numeracaoTitulos === 'arabico' ? `${nTitulo}. ` : ''
    return `<h2>${negrito(prefixo + limpo)}</h2>`
  }
  const paragrafo = (l: string) => {
    if (md.paragrafosNumerados && depoisDoPrimeiroTitulo) { nPar++; return `<p class="num"><span class="n">${nPar}.</span> ${negrito(l)}</p>` }
    return `<p>${negrito(l)}</p>`
  }
  const blocos = texto.replace(/\r/g, '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)
  const corpo = blocos.map(b => {
    const linhas = b.split('\n')
    if (linhas.length === 1 && ehTitulo(b)) return tituloHtml(b)
    if (linhas.every(l => /^\s*>/.test(l))) return `<blockquote>${negrito(linhas.map(l => l.replace(/^\s*>\s?/, '')).join(' '))}</blockquote>`
    if (linhas.every(l => /^\s*([-*•]|[a-z]\)|\d+[.)])\s+/.test(l))) return `<ul class="pedidos">${linhas.map(l => `<li>${negrito(l.replace(/^\s*[-*•]\s+/, ''))}</li>`).join('')}</ul>`
    return linhas.map(l => (ehTitulo(l) ? tituloHtml(l) : paragrafo(l))).join('')
  }).join('\n')
  const m = f.margens
  return `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<meta name="formatacao" content="${esc(md.id)}">
<style>
@page { size: 21cm 29.7cm; margin: ${m.superior}cm ${m.direita}cm ${m.inferior}cm ${m.esquerda}cm; }
body { font-family: '${esc(f.fonte)}', ${f.fonteAlternativa}, serif; font-size: ${f.corpo}pt; line-height: ${f.entrelinhas}; color: #000; }
p { text-align: justify; text-indent: ${f.recuoPrimeiraLinha}cm; margin: 0 0 ${md.espacoDepois}pt 0; }
p.num, p.cx { text-indent: 0; }
p.num .n { font-weight: bold; display: inline-block; min-width: 1cm; }
h2 { font-size: ${f.corpo}pt; font-weight: bold; text-transform: uppercase; text-align: ${md.tituloAlinhado}; margin: 18pt 0 ${md.espacoDepois}pt 0;${md.tituloVersalete ? ' font-variant: small-caps; letter-spacing: 0.04em;' : ''} }
blockquote { margin: 6pt 0 ${md.espacoDepois}pt ${f.recuoCitacao}cm; font-size: ${f.citacaoLonga}pt; line-height: 1; text-align: justify; }
ul.pedidos { list-style: none; margin: 0 0 ${md.espacoDepois}pt ${f.recuoPrimeiraLinha || 1}cm; padding: 0; }
ul.pedidos li { text-align: justify; margin-bottom: 4pt; }
</style></head><body>
${corpo}
</body></html>`
}

/** Baixa a peça como .doc (o Word abre e mantém a formatação). */
export function baixarPecaWord(texto: string, titulo = 'peca', propria?: Partial<Formatacao> | null) {
  const html = pecaEmHtml(texto, titulo, propria)
  const blob = new Blob(['﻿', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).toLowerCase() || 'peca'}.doc`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
