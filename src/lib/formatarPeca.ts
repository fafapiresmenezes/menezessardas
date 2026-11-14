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

const SO_TRACOS = /^\s*(?:[-–—_*=]\s*){3,}$/
const INICIO_ENDERECAMENTO = /^\**\s*(EXCELENT|EXMO|EXMA|EGR[ÉE]GI|COLEND|AO\s+JU[ÍI]Z|À\s|AO\s|ILUSTR[ÍI]SSIM|MERIT[ÍI]SSIM|DOUTO|SENHOR)/i
const INICIO_ANEXO = /^\s*(?:#+\s*)?\**\s*PONTOS\s+A\s+CONFERIR/i
const INICIO_FECHO = /^\s*(nest[ea]s\s+termos|termos\s+em\s+que|pede\s+(e\s+espera\s+)?deferimento|p\.\s*deferimento|pede-se\s+deferimento)/i
const DATA_DO_FECHO = /(\d{1,2}|\[[^\]]*\])\s+de\s+[a-zç\[\]]+\s+de\s+(\d{4}|\[[^\]]*\])/i
const ESPACO_DESPACHO = /^\s*[([]\s*espa[çc]o\s+para\s+despacho\s*[)\]]\s*$/i
const ITEM = /^\s*(?:([-*•])|([a-z]\)|\d+[.)]))\s+/

/**
 * Separa o que é peça do que é recado para o advogado: tudo o que vier antes do endereçamento (avisos) e a seção
 * "PONTOS A CONFERIR" saem do corpo e vão para uma folha à parte, no fim, que não se protocola.
 */
export function separarPeca(texto: string): { corpo: string; conferir: string } {
  const linhas = texto.replace(/\r/g, '').split('\n').filter(l => !SO_TRACOS.test(l))
  const iAnexo = linhas.findIndex(l => INICIO_ANEXO.test(l))
  let corpo = iAnexo >= 0 ? linhas.slice(0, iAnexo) : linhas
  const anexo = iAnexo >= 0 ? linhas.slice(iAnexo + 1) : []
  const iEnd = corpo.findIndex(l => INICIO_ENDERECAMENTO.test(l.trim()))
  const avisos = iEnd > 0 && corpo.slice(0, iEnd).some(l => l.trim()) && iEnd <= 12 ? corpo.slice(0, iEnd) : []
  if (avisos.length) corpo = corpo.slice(iEnd)
  return { corpo: corpo.join('\n').trim(), conferir: [...avisos, ...(avisos.length && anexo.length ? [''] : []), ...anexo].join('\n').trim() }
}

function pecaComModelo(texto: string, titulo: string, propria: Partial<Formatacao> | null | undefined, md: ModeloFormatacao) {
  // A formatação da própria pessoa (Word que ela enviou) vale por cima do modelo; o resto vem do modelo sorteado.
  const f = { ...FORMATACAO, ...md.base, ...(propria ? formatacaoFinal({ ...md.base, ...propria }) : {}) }
  const { corpo: textoDaPeca, conferir } = separarPeca(texto)
  let nTitulo = 0, nPar = 0, depoisDoPrimeiroTitulo = false, houveParagrafo = false, noFecho = false, assinaturas = 0
  const tituloHtml = (bruto: string) => {
    const sem = bruto.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim()
    const limpo = semNumero(sem)
    // Endereçamento, nome das partes e nome da peça também vêm em caixa alta, mas não são seção: ficam sem número.
    const secao = limpo !== sem || /^(D[OA]S?\s|PRELIMINAR|M[ÉE]RITO|S[ÍI]NTESE|CONCLUS|PEDIDO|REQUERIMENTO|TEMPESTIVIDADE|CABIMENTO|RESUMO|BREVE|RAZ[ÕO]ES|FUNDAMENT|INTRODU)/.test(limpo)
    // Depois da qualificação, caixa alta que não é seção é o nome da peça ("CONTESTAÇÃO", "MEMORIAIS"): centralizado.
    if (!secao) return houveParagrafo ? `<p class="nome"><b>${negrito(limpo)}</b></p>` : `<p class="cx"><b>${negrito(limpo)}</b></p>`
    nTitulo++; depoisDoPrimeiroTitulo = true
    const prefixo = md.numeracaoTitulos === 'romano' ? `${ROMANOS[nTitulo - 1] ?? nTitulo} – ` : md.numeracaoTitulos === 'arabico' ? `${nTitulo}. ` : ''
    return `<h2>${negrito(prefixo + limpo)}</h2>`
  }
  const item = (l: string) => {
    const m = l.match(ITEM)!
    const marca = m[1] ? '–' : m[2]!
    return `<p class="item"><span class="marca">${esc(marca)}</span> ${negrito(l.replace(ITEM, ''))}</p>`
  }
  const linhaHtml = (l: string) => {
    if (ESPACO_DESPACHO.test(l)) return '<p class="despacho">&nbsp;</p>'
    if (noFecho) {
      if (DATA_DO_FECHO.test(l)) return `<p class="data">${negrito(l)}</p>`
      assinaturas++
      return `<p class="${assinaturas === 1 ? 'ass primeira' : 'ass'}">${negrito(l.replace(/\*\*/g, ''))}</p>`
    }
    if (INICIO_FECHO.test(l)) { noFecho = true; return `<p class="fecho">${negrito(l)}</p>` }
    if (ehTitulo(l)) return tituloHtml(l)
    if (ITEM.test(l)) return item(l)
    // Antes da qualificação, linhas curtas (classe e número do processo, origem) ficam sem recuo, como referência.
    if (!houveParagrafo && !depoisDoPrimeiroTitulo && l.length < 110 && !/,\s*$/.test(l)) return `<p class="ref">${negrito(l)}</p>`
    houveParagrafo = true
    if (md.paragrafosNumerados && depoisDoPrimeiroTitulo) { nPar++; return `<p class="num"><span class="n">${nPar}.</span> ${negrito(l)}</p>` }
    return `<p>${negrito(l)}</p>`
  }
  const blocos = textoDaPeca.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)
  const corpo = blocos.map(b => {
    const linhas = b.split('\n').filter(l => l.trim())
    if (linhas.length && linhas.every(l => /^\s*>/.test(l))) return `<blockquote>${negrito(linhas.map(l => l.replace(/^\s*>\s?/, '')).join(' '))}</blockquote>`
    return linhas.map(linhaHtml).join('')
  }).join('\n')
  // Folha de conferência: página separada, com aviso de que não faz parte da peça.
  const folha = conferir ? `\n<br clear="all" style="page-break-before:always; mso-break-type:section-break">
<div class="conferir"><p class="conferir-titulo"><b>PONTOS A CONFERIR ANTES DE PROTOCOLAR</b></p>
<p class="conferir-aviso">Esta folha é só para o advogado responsável. Não faz parte da peça: apague antes de protocolar.</p>
${conferir.split('\n').filter(l => l.trim()).map(l => `<p class="conferir-item">${negrito(l)}</p>`).join('\n')}</div>` : ''
  const m = f.margens
  return `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<meta name="formatacao" content="${esc(md.id)}">
<style>
@page { size: 21cm 29.7cm; margin: ${m.superior}cm ${m.direita}cm ${m.inferior}cm ${m.esquerda}cm; }
body { font-family: '${esc(f.fonte)}', ${f.fonteAlternativa}, serif; font-size: ${f.corpo}pt; line-height: ${f.entrelinhas}; color: #000; }
p { text-align: justify; text-indent: ${f.recuoPrimeiraLinha}cm; margin: 0 0 ${md.espacoDepois}pt 0; orphans: 2; widows: 2; }
p.num, p.cx, p.ref, p.nome, p.data, p.ass, p.despacho, p.item, .conferir p { text-indent: 0; }
p.cx { text-align: left; margin-bottom: 0; }
p.despacho { margin: 0; height: 3cm; line-height: 3cm; }
p.ref { text-align: left; margin-bottom: 0; }
p.nome { text-align: center; margin: 14pt 0; letter-spacing: 0.06em; }
p.num .n { font-weight: bold; display: inline-block; min-width: 1cm; }
p.item { margin-left: ${(f.recuoPrimeiraLinha || 1.25) + 0.75}cm; text-indent: -0.75cm; }
p.item .marca { display: inline-block; min-width: 0.75cm; text-indent: 0; }
p.fecho { margin-top: 12pt; }
p.data { text-align: right; margin: 12pt 0 0 0; }
p.ass { text-align: center; margin: 0; font-weight: normal; }
p.ass.primeira { margin-top: 42pt; font-weight: bold; }
h2 { font-size: ${f.corpo}pt; font-weight: bold; text-transform: uppercase; text-align: ${md.tituloAlinhado}; margin: 18pt 0 ${md.espacoDepois}pt 0; page-break-after: avoid;${md.tituloVersalete ? ' font-variant: small-caps; letter-spacing: 0.04em;' : ''} }
blockquote { margin: 6pt 0 ${md.espacoDepois}pt ${f.recuoCitacao}cm; font-size: ${f.citacaoLonga}pt; line-height: 1; text-align: justify; }
.conferir { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; line-height: 1.3; }
.conferir p { text-align: left; margin: 0 0 6pt 0; }
p.conferir-titulo { font-size: 12pt; margin-bottom: 2pt; }
p.conferir-aviso { font-style: italic; border-bottom: 1px solid #000; padding-bottom: 6pt; margin-bottom: 10pt; }
</style></head><body>
${corpo}${folha}
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
