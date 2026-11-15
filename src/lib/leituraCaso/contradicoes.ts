// Confronto de depoimentos já transcritos (texto). Procura o mesmo assunto contado com data, hora,
// valor ou quantidade diferentes, ou afirmado por um e negado por outro. Aponta onde perguntar;
// quem conclui se houve contradição é o advogado, lendo os trechos.
import { frases, datasNoTexto, horasNoTexto, valoresNoTexto } from './contexto'

export interface Depoimento { id: string; quem: string; texto: string }
export type TipoDivergencia = 'data' | 'hora' | 'valor' | 'quantidade' | 'negacao'
export interface Divergencia {
  tipo: TipoDivergencia
  mesmoDepoente: boolean
  a: { quem: string; trecho: string; dado: string }
  b: { quem: string; trecho: string; dado: string }
  assunto: string[]
  pergunta: string
}

const PARADAS = new Set(('a o e é de da do das dos em no na nos nas um uma uns umas que se por para com sem como mas ou ao aos à às ' +
  'eu ele ela eles elas nós voce você vocês me mim meu minha seu sua dele dela isso isto aquilo esse essa este esta aquele aquela ' +
  'foi era ser estava estavam tinha tem ter há havia já mais muito pouco também então quando onde depois antes ainda só sim não nao ' +
  'nunca jamais lá ali aqui aí dia dias hora horas reais real mil vez vezes cerca mais menos sobre entre até pelo pela pelos pelas ' +
  'disse diz falou afirma afirmou declarou declara respondeu sabe lembra acho acredita').split(' '))
const NEGA = /\b(não|nao|nunca|jamais|nenhum|nenhuma|nem|ninguém|ninguem)\b/i
const NUMEROS: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, três: 3, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10 }

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
/** Radical curto: "pagou", "pagamento" e "pagar" viram "paga". */
const radical = (w: string) => semAcento(w).slice(0, 5)

function palavras(f: string): Set<string> {
  const limpo = f.replace(/R\$\s*[\d.,]+/g, ' ').replace(/\d+/g, ' ')
  return new Set(limpo.split(/[^\p{L}]+/u).filter(w => w.length > 2 && !PARADAS.has(w.toLowerCase())).map(radical))
}

/** Quantidades com o que está sendo contado: "três pessoas", "2 carros". */
function quantidades(f: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const m of f.matchAll(/\b(\d{1,4}|um|uma|dois|duas|três|tres|quatro|cinco|seis|sete|oito|nove|dez)\s+(\p{L}{4,})/giu)) {
    const n = /^\d/.test(m[1]) ? +m[1] : NUMEROS[m[1].toLowerCase()]
    const coisa = radical(m[2])
    if (['horas', 'hora', 'reais', 'anos', 'meses', 'dias'].includes(m[2].toLowerCase())) continue
    out.set(coisa, n)
  }
  return out
}

interface Frase { quem: string; idDep: string; texto: string; ord: number; pal: Set<string>; datas: string[]; horas: string[]; valores: number[]; qtd: Map<string, number>; nega: boolean }

function analisar(d: Depoimento): Frase[] {
  return frases(d.texto).map((t, ord) => ({
    quem: d.quem.trim() || 'Depoente', idDep: d.id, texto: t, ord, pal: palavras(t),
    datas: datasNoTexto(t).map(x => x.iso), horas: horasNoTexto(t), valores: valoresNoTexto(t).map(x => x.valor),
    qtd: quantidades(t), nega: NEGA.test(t),
  }))
}

const comum = (a: Set<string>, b: Set<string>) => [...a].filter(x => b.has(x))
const fmtData = (iso: string) => iso.split('-').reverse().join('/')
const fmtValor = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const difere = <T,>(a: T[], b: T[]) => a.length > 0 && b.length > 0 && !a.some(x => b.includes(x))

/**
 * Compara cada frase com as frases dos outros depoentes (e com frases distantes do mesmo depoente,
 * para mudança de versão). Exige pelo menos duas palavras de conteúdo em comum para considerar
 * que falam do mesmo assunto.
 */
export function confrontar(deps: Depoimento[], minComum = 2): Divergencia[] {
  const todas = deps.filter(d => d.texto.trim()).flatMap(analisar)
  const out: Divergencia[] = []
  const vistos = new Set<string>()
  for (let i = 0; i < todas.length; i++) {
    for (let j = i + 1; j < todas.length; j++) {
      const a = todas[i], b = todas[j]
      const mesmo = a.idDep === b.idDep
      if (mesmo && Math.abs(a.ord - b.ord) < 2) continue
      const assunto = comum(a.pal, b.pal)
      if (assunto.length < minComum) continue
      const tema = assunto.slice(0, 4).join(', ')
      const add = (tipo: TipoDivergencia, da: string, db: string, pergunta: string) => {
        const chave = `${tipo}|${a.texto}|${b.texto}`
        if (vistos.has(chave)) return
        vistos.add(chave)
        out.push({ tipo, mesmoDepoente: mesmo, a: { quem: a.quem, trecho: a.texto, dado: da }, b: { quem: b.quem, trecho: b.texto, dado: db }, assunto, pergunta })
      }
      const quemB = mesmo ? `${b.quem} (em outro momento)` : b.quem
      if (difere(a.datas, b.datas)) add('data', a.datas.map(fmtData).join(', '), b.datas.map(fmtData).join(', '), `Sobre ${tema}: ${a.quem} fala em ${a.datas.map(fmtData).join(', ')} e ${quemB} em ${b.datas.map(fmtData).join(', ')}. Qual a data e como a pessoa sabe?`)
      if (difere(a.horas, b.horas)) add('hora', a.horas.join(', '), b.horas.join(', '), `Sobre ${tema}: horário ${a.horas.join(', ')} para ${a.quem} e ${b.horas.join(', ')} para ${quemB}. O que fixa o horário na memória (relógio, celular, compromisso)?`)
      if (difere(a.valores, b.valores)) add('valor', a.valores.map(fmtValor).join(', '), b.valores.map(fmtValor).join(', '), `Sobre ${tema}: ${a.valores.map(fmtValor).join(', ')} para ${a.quem} e ${b.valores.map(fmtValor).join(', ')} para ${quemB}. Há recibo, extrato ou mensagem com o valor?`)
      for (const [coisa, na] of a.qtd) {
        const nb = b.qtd.get(coisa)
        if (nb !== undefined && nb !== na) add('quantidade', `${na}`, `${nb}`, `Quantos eram (${coisa}…)? ${a.quem} diz ${na}, ${quemB} diz ${nb}.`)
      }
      // Negação oposta só conta quando o assunto coincide bastante, para não confundir frases parecidas.
      const forte = assunto.length >= Math.max(3, Math.ceil(Math.min(a.pal.size, b.pal.size) * 0.5))
      if (forte && a.nega !== b.nega) add('negacao', a.nega ? 'nega' : 'afirma', b.nega ? 'nega' : 'afirma', `Sobre ${tema}: ${a.quem} ${a.nega ? 'nega' : 'afirma'} e ${quemB} ${b.nega ? 'nega' : 'afirma'}. Pedir que cada um descreva o fato com detalhes.`)
    }
  }
  const peso: Record<TipoDivergencia, number> = { valor: 0, data: 1, hora: 2, quantidade: 3, negacao: 4 }
  return out.sort((x, y) => peso[x.tipo] - peso[y.tipo] || y.assunto.length - x.assunto.length)
}

/** Assuntos que só um depoente menciona: pontos a perguntar aos demais. */
export function soUmMenciona(deps: Depoimento[]): { quem: string; trecho: string }[] {
  const validos = deps.filter(d => d.texto.trim())
  if (validos.length < 2) return []
  const porDep = validos.map(d => ({ d, fs: analisar(d) }))
  const out: { quem: string; trecho: string }[] = []
  for (const { d, fs } of porDep) {
    const outras = porDep.filter(x => x.d.id !== d.id).flatMap(x => x.fs)
    for (const f of fs) {
      if (f.pal.size < 3) continue
      const tocado = outras.some(o => comum(f.pal, o.pal).length >= 2)
      if (!tocado && (f.datas.length || f.valores.length || f.horas.length || f.qtd.size)) out.push({ quem: f.quem, trecho: f.texto })
    }
  }
  return out
}
