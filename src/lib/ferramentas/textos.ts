// Theye Suporte Jurídico — ferramentas de texto: valor e data por extenso, medidor de peça, juridiquês e legibilidade.

const UNID = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
const DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const CEM = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

function ate999(n: number, feminino = false): string {
  if (n === 100) return 'cem'
  const c = Math.floor(n / 100), r = n % 100, partes: string[] = []
  if (c) partes.push(feminino && c > 1 ? CEM[c].replace(/os$/, 'as') : CEM[c])
  if (r) {
    if (r < 20) partes.push(feminino && r <= 2 ? (r === 1 ? 'uma' : 'duas') : UNID[r])
    else { const d = Math.floor(r / 10), u = r % 10; partes.push(u ? `${DEZ[d]} e ${feminino && u <= 2 ? (u === 1 ? 'uma' : 'duas') : UNID[u]}` : DEZ[d]) }
  }
  return partes.join(' e ')
}

const ESCALAS: [string, string][] = [['', ''], ['mil', 'mil'], ['milhão', 'milhões'], ['bilhão', 'bilhões'], ['trilhão', 'trilhões']]

/** Número inteiro por extenso (até 999 trilhões). */
export function inteiroPorExtenso(n: number, feminino = false): string {
  n = Math.floor(Math.abs(n))
  if (n === 0) return 'zero'
  const grupos: number[] = []
  while (n > 0) { grupos.push(n % 1000); n = Math.floor(n / 1000) }
  if (grupos.length > ESCALAS.length) throw new Error('Número grande demais')
  const partes: { txt: string; g: number; i: number }[] = []
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i]
    if (!g) continue
    let txt: string
    if (i === 0) txt = ate999(g, feminino)
    else if (i === 1) txt = g === 1 ? 'mil' : `${ate999(g, feminino)} mil`
    else txt = `${ate999(g)} ${g === 1 ? ESCALAS[i][0] : ESCALAS[i][1]}`
    partes.push({ txt, g, i })
  }
  // "e" antes do último grupo quando ele é < 100 ou centena redonda (ex.: "mil e cem", "dois mil e cinco")
  return partes.map((p, k) => {
    if (k === 0) return p.txt
    const ultimo = k === partes.length - 1
    return (ultimo && (p.g < 100 || p.g % 100 === 0) ? ' e ' : ', ').concat(p.txt)
  }).join('').replace(/, /g, ' ').replace(/\s+/g, ' ')
}

/** Valor em reais por extenso, como em contratos e recibos. */
export function reaisPorExtenso(valor: number): string {
  if (!Number.isFinite(valor) || valor < 0) throw new Error('Informe um valor positivo')
  const centavosTot = Math.round(valor * 100)
  const reais = Math.floor(centavosTot / 100), cent = centavosTot % 100
  const partes: string[] = []
  if (reais) {
    const milhaoRedondo = reais >= 1_000_000 && reais % 1_000_000 === 0
    partes.push(`${inteiroPorExtenso(reais)}${milhaoRedondo ? ' de' : ''} ${reais === 1 ? 'real' : 'reais'}`)
  }
  if (cent) partes.push(`${inteiroPorExtenso(cent)} ${cent === 1 ? 'centavo' : 'centavos'}`)
  if (!partes.length) return 'zero real'
  return partes.join(' e ')
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export function dataPorExtenso(dataIso: string, completo = false): string {
  const [a, m, d] = dataIso.split('-').map(Number)
  if (!a || !m || !d || m > 12 || d > 31) throw new Error('Data inválida')
  if (!completo) return `${d === 1 ? '1º' : d} de ${MESES[m - 1]} de ${a}`
  return `${d === 1 ? 'primeiro' : inteiroPorExtenso(d)} de ${MESES[m - 1]} de ${inteiroPorExtenso(a)}`
}

// ---------- Medidor de peça ----------
export function contarPalavras(t: string): number { return (t.match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu) ?? []).length }
export function frases(t: string): string[] { return t.split(/(?<=[.!?;])\s+|\n{2,}/).map(s => s.trim()).filter(s => contarPalavras(s) > 0) }

export function medirPeca(t: string) {
  const palavras = contarPalavras(t)
  const caracteres = t.length, semEspaco = t.replace(/\s/g, '').length
  const fs = frases(t)
  const paragrafos = t.split(/\n\s*\n/).filter(p => p.trim()).length
  return {
    palavras, caracteres, semEspaco, frases: fs.length, paragrafos,
    paginas: Math.max(palavras ? 1 : 0, Math.ceil(palavras / 500)), // ~500 palavras por página A4, fonte 12, espaço 1,5
    leituraMin: Math.ceil(palavras / 200), // leitura silenciosa ~200 palavras/minuto
    falaMin: Math.ceil(palavras / 130), // fala em sustentação ~130 palavras/minuto
    mediaPorFrase: fs.length ? Math.round(palavras / fs.length) : 0,
    frasesLongas: fs.filter(f => contarPalavras(f) > 40).length,
  }
}

// ---------- Linguagem simples (juridiquês) ----------
export const JURIDIQUES: [RegExp, string, string][] = [
  [/\bdata\s+venia\b/i, 'data venia', 'com o devido respeito'],
  [/\boutrossim\b/i, 'outrossim', 'além disso'],
  [/\bdestarte\b/i, 'destarte', 'assim'],
  [/\bdessarte\b/i, 'dessarte', 'assim'],
  [/\bm[aá]xime\b/i, 'máxime', 'principalmente'],
  [/\bin\s+casu\b/i, 'in casu', 'neste caso'],
  [/\bpe[çc]a\s+(vestibular|exordial|prefacial)\b/i, 'peça vestibular/exordial', 'petição inicial'],
  [/\bexordial\b/i, 'exordial', 'petição inicial'],
  [/\bExcelso\s+Pret[oó]rio\b/i, 'Excelso Pretório', 'Supremo Tribunal Federal (STF)'],
  [/\bcolendo\b/i, 'colendo', '(dispensável)'],
  [/\begr[eé]gio\b/i, 'egrégio', '(dispensável)'],
  [/\bconsorte\b/i, 'consorte', 'cônjuge'],
  [/\bc[aá]rtula\b/i, 'cártula', 'título (cheque, nota promissória)'],
  [/\bal[vu]itre\b/i, 'alvitre', 'sugestão'],
  [/\bab\s+initio\b/i, 'ab initio', 'desde o início'],
  [/\bincontinenti\b/i, 'incontinenti', 'imediatamente'],
  [/\bhodiernamente\b/i, 'hodiernamente', 'atualmente'],
  [/\bperfunct[oó]ri[ao]\b/i, 'perfunctório', 'superficial'],
  [/\bsupracitad[oa]s?\b/i, 'supracitado', 'citado acima'],
  [/\bretromencionad[oa]s?\b/i, 'retromencionado', 'mencionado'],
  [/\bimpende\s+(?:salientar|destacar|ressaltar)\b/i, 'impende salientar', 'é importante destacar'],
  [/\bmister\s+se\s+faz\b/i, 'mister se faz', 'é necessário'],
  [/\bfulcro\b/i, 'fulcro', 'fundamento / com base em'],
  [/\bsupedâneo\b/i, 'supedâneo', 'fundamento'],
  [/\bvenho,?\s+mui\s+respeitosamente\b/i, 'vem, mui respeitosamente', 'vem'],
  [/\bpugna\b/i, 'pugna', 'pede'],
  [/\bermo\b/i, 'ermo', 'vazio / isolado'],
  [/\bex\s+positis\b/i, 'ex positis', 'diante do exposto'],
  [/\bdiante\s+do\s+exposto\s+e\s+por\s+tudo\s+mais\s+que\s+dos\s+autos\s+consta\b/i, 'por tudo mais que dos autos consta', 'diante do exposto'],
  [/\bpreclaro\b/i, 'preclaro', '(dispensável)'],
  [/\bsodalício\b/i, 'sodalício', 'tribunal / associação'],
  [/\balhures\b/i, 'alhures', 'em outro lugar'],
]

export function analisarJuridiques(t: string) {
  const achados: { termo: string; sugestao: string; vezes: number }[] = []
  for (const [re, termo, sugestao] of JURIDIQUES) {
    const vezes = (t.match(new RegExp(re.source, 'gi')) ?? []).length
    if (vezes) achados.push({ termo, sugestao, vezes })
  }
  const longas = frases(t).filter(f => contarPalavras(f) > 40)
  const passivas = (t.match(/\b(foi|foram|é|são|será|serão|seja|sejam)\s+\p{L}+(ado|ada|ados|adas|ido|ida|idos|idas)\b/giu) ?? []).length
  return { achados, longas, passivas }
}

/** Sílabas aproximadas em português (grupos de vogais; ditongos comuns contam como uma). */
export function silabas(palavra: string): number {
  const p = palavra.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '')
  if (!p) return 0
  const grupos = p.replace(/(qu|gu)(?=[ei])/g, 'q').match(/[aeiouy]+/g) ?? []
  let n = 0
  for (const g of grupos) n += g.length === 1 ? 1 : /^(ai|au|ei|eu|oi|ou|ui|iu|ao|ae|oe)$/.test(g) ? 1 : g.length - (/(ai|au|ei|eu|oi|ou|ui|iu|ao|ae|oe)/.test(g) ? 1 : 0)
  return Math.max(1, n)
}

/** Índice de facilidade de leitura de Flesch adaptado ao português (Martins et al., 1996): 248,835 − 1,015·(palavras/frase) − 84,6·(sílabas/palavra). */
export function legibilidade(t: string) {
  const ws = t.match(/[\p{L}]+/gu) ?? []
  const fs = Math.max(1, frases(t).length)
  if (!ws.length) return { indice: 0, faixa: 'sem texto', palavrasPorFrase: 0, silabasPorPalavra: 0 }
  const sil = ws.reduce((s, w) => s + silabas(w), 0)
  const ppf = ws.length / fs, spp = sil / ws.length
  const indice = Math.max(0, Math.min(100, Math.round(248.835 - 1.015 * ppf - 84.6 * spp)))
  const faixa = indice >= 75 ? 'muito fácil (ensino fundamental I)' : indice >= 50 ? 'fácil (ensino fundamental II)' : indice >= 25 ? 'difícil (ensino médio/superior)' : 'muito difícil (acadêmico)'
  return { indice, faixa, palavrasPorFrase: Math.round(ppf * 10) / 10, silabasPorPalavra: Math.round(spp * 100) / 100 }
}
