/**
 * Passo C7 — a régua que todo modelo da predição tem de bater.
 *
 * A ideia é simples e desconfortável: antes de acreditar em qualquer modelo, a gente mede quanto
 * erraria um palpite burro ("amanhã é igual a hoje"). Se o modelo não erra menos que o palpite
 * burro, ele não entra. E nenhuma previsão sai daqui sem intervalo: um número sozinho esconde o
 * tamanho da dúvida, e número sem dúvida declarada é achismo com cara de ciência.
 *
 * Tudo aqui é aritmética sobre a série, sem biblioteca externa e sem rede, para que o teste possa
 * prender o comportamento inteiro.
 */

export type Ponto = { quando: string; valor: number }

export type Serie = {
  id: string
  nome: string
  unidade: string
  /** Quantos pontos fecham um ciclo: 7 para série diária com semana, 12 para série mensal com ano. 1 = sem ciclo. */
  periodo: number
  pontos: Ponto[]
}

export type Previsao = {
  quando: string
  valor: number
  baixo: number
  alto: number
  /** Fração da banda: 0,8 quer dizer "esperamos que 8 de cada 10 caiam dentro". */
  confianca: number
}

export type Modelo = {
  id: string
  nome: string
  explicacao: string
  prever: (pontos: Ponto[], passos: number) => Previsao[]
}

/** Confiança que todo modelo daqui declara. Mudar isto muda a régua de cobertura do relatório. */
export const CONFIANCA = 0.8

/** Mínimo de comparações fora da amostra para um relatório valer alguma coisa. */
export const MINIMO_DE_COMPARACOES = 10

export const SEM_INTERVALO =
  'Previsão sem intervalo não sai desta plataforma: um número sozinho esconde o tamanho da dúvida.'

const DIA = 86400000

const ordenar = (pontos: Ponto[]) => [...pontos].sort((a, b) => a.quando.localeCompare(b.quando))

export function quantil(valores: number[], q: number): number {
  if (valores.length === 0) return 0
  const v = [...valores].sort((a, b) => a - b)
  const pos = (v.length - 1) * q
  const baixo = Math.floor(pos)
  const alto = Math.ceil(pos)
  if (baixo === alto) return v[baixo]
  return v[baixo] + (v[alto] - v[baixo]) * (pos - baixo)
}

export const mediana = (valores: number[]) => quantil(valores, 0.5)

/** Quantos dias separam dois pontos seguidos, pela mediana — resiste a um buraco na série. */
export function passoEmDias(pontos: Ponto[]): number {
  if (pontos.length < 2) return 1
  const p = ordenar(pontos)
  const difs: number[] = []
  for (let i = 1; i < p.length; i++) {
    const d = (Date.parse(p[i].quando) - Date.parse(p[i - 1].quando)) / DIA
    if (d > 0) difs.push(d)
  }
  if (difs.length === 0) return 1
  return Math.max(1, Math.round(mediana(difs)))
}

export function somarDias(iso: string, dias: number): string {
  return new Date(Date.parse(iso) + dias * DIA).toISOString().slice(0, 10)
}

function datasFuturas(pontos: Ponto[], passos: number): string[] {
  const p = ordenar(pontos)
  const salto = passoEmDias(p)
  const ultima = p[p.length - 1].quando.slice(0, 10)
  return Array.from({ length: passos }, (_, i) => somarDias(ultima, salto * (i + 1)))
}

/**
 * Banda em torno do número.
 *
 * Duas correções que parecem detalhe e não são. A primeira: o erro que o modelo comete DENTRO da
 * amostra é menor que o erro de verdade, porque ele gastou pontos ajustando os seus parâmetros —
 * por isso o resíduo é inflado por raiz de n/(n−k), com k igual ao número de parâmetros gastos.
 * Sem essa correção a banda sai estreita e a cobertura medida fica bem abaixo do que ela promete,
 * que é exatamente a mentira que este passo existe para impedir. A segunda: a banda abre com a
 * raiz do horizonte, porque prever cinco pontos à frente é mais incerto que prever um.
 */
function banda(residuos: number[], passo: number, parametros: number): number {
  const n = residuos.length
  const inflar = n > parametros ? Math.sqrt(n / (n - parametros)) : 2
  const largura = quantil(residuos.map(Math.abs), CONFIANCA) * inflar
  return largura * Math.sqrt(passo)
}

function comBanda(datas: string[], valores: number[], residuos: number[], parametros = 0): Previsao[] {
  return datas.map((quando, i) => {
    const meia = banda(residuos, i + 1, parametros)
    return { quando, valor: valores[i], baixo: valores[i] - meia, alto: valores[i] + meia, confianca: CONFIANCA }
  })
}

/** Reta por mínimos quadrados sobre o índice do ponto. */
export function reta(valores: number[]): { a: number; b: number } {
  const n = valores.length
  if (n === 0) return { a: 0, b: 0 }
  if (n === 1) return { a: valores[0], b: 0 }
  const mediaT = (n - 1) / 2
  const mediaY = valores.reduce((s, v) => s + v, 0) / n
  let cima = 0
  let baixo = 0
  for (let t = 0; t < n; t++) {
    cima += (t - mediaT) * (valores[t] - mediaY)
    baixo += (t - mediaT) ** 2
  }
  const b = baixo === 0 ? 0 : cima / baixo
  return { a: mediaY - b * mediaT, b }
}

/**
 * Índices do ciclo, já centrados: quanto cada posição da semana (ou do ano) costuma ficar acima ou
 * abaixo da reta. Só são calculados com pelo menos dois ciclos completos; com menos que isso, o que
 * pareceria sazonalidade é ruído, e a função devolve zeros.
 */
export function indicesDoCiclo(valores: number[], periodo: number): number[] {
  if (periodo < 2 || valores.length < periodo * 2) return new Array(Math.max(periodo, 1)).fill(0)
  const { a, b } = reta(valores)
  const somas = new Array(periodo).fill(0)
  const contas = new Array(periodo).fill(0)
  valores.forEach((y, t) => {
    somas[t % periodo] += y - (a + b * t)
    contas[t % periodo] += 1
  })
  const brutos = somas.map((s, j) => (contas[j] === 0 ? 0 : s / contas[j]))
  const media = brutos.reduce((s, v) => s + v, 0) / periodo
  return brutos.map(v => v - media)
}

/** "Amanhã é igual a hoje." É esta a régua: nenhum modelo entra sem errar menos que ela. */
export const ingenuo: Modelo = {
  id: 'ingenuo',
  nome: 'Palpite simples (amanhã igual a hoje)',
  explicacao: 'Repete o último valor observado. Serve de régua: modelo que não bate isto não entra.',
  prever(pontos, passos) {
    const p = ordenar(pontos)
    const ultimo = p[p.length - 1].valor
    const residuos = p.slice(1).map((x, i) => x.valor - p[i].valor)
    return comBanda(datasFuturas(p, passos), new Array(passos).fill(ultimo), residuos)
  },
}

/** "Esta segunda-feira é igual à segunda passada." Régua para série com ciclo forte. */
export function sazonalIngenuo(periodo: number): Modelo {
  return {
    id: `sazonal-ingenuo-${periodo}`,
    nome: 'Palpite simples do mesmo dia do ciclo',
    explicacao: `Repete o valor de ${periodo} pontos atrás. Régua para série com ciclo forte.`,
    prever(pontos, passos) {
      const p = ordenar(pontos)
      const n = p.length
      const valor = (h: number) => p[Math.max(0, n - periodo + ((h - 1) % periodo))].valor
      const residuos = p.slice(periodo).map((x, i) => x.valor - p[i].valor)
      return comBanda(
        datasFuturas(p, passos),
        Array.from({ length: passos }, (_, i) => valor(i + 1)),
        residuos.length > 0 ? residuos : [0],
      )
    },
  }
}

/** O ajuste de tendência mais ciclo, separado para poder ser refeito sobre pedaços da série. */
function ajusteSazonal(valores: number[], periodo: number) {
  const { a, b } = reta(valores)
  const indices = indicesDoCiclo(valores, periodo)
  const m = Math.max(indices.length, 1)
  return (t: number) => a + b * t + (indices[t % m] ?? 0)
}

/**
 * Tendência mais ciclo: uma reta pelo meio da série, mais o quanto cada posição do ciclo costuma
 * se afastar dela. É o modelo que o passo pede, e continua simples de propósito — ele é a régua,
 * não o produto final.
 *
 * O intervalo NÃO sai do resíduo dentro da amostra. Ele sai de refazer o ajuste em cada pedaço do
 * passado e anotar o erro do ponto seguinte, que o ajuste não tinha visto. Medir a dúvida com o
 * erro que o modelo comete sobre os pontos que ele usou para se ajustar dá uma banda estreita
 * demais, e uma banda estreita demais é uma promessa de 80% que entrega 60%.
 */
export function sazonalMaisTendencia(periodo: number): Modelo {
  return {
    id: `sazonal-tendencia-${periodo}`,
    nome: 'Tendência mais ciclo',
    explicacao:
      'Traça uma reta pelo meio da série e soma o desvio típico de cada posição do ciclo. ' +
      'Com menos de dois ciclos completos, usa só a reta e diz isso pelo tamanho do intervalo.',
    prever(pontos, passos) {
      const p = ordenar(pontos)
      const valores = p.map(x => x.valor)
      const n = valores.length
      const ajuste = ajusteSazonal(valores, periodo)

      const minimo = Math.max(periodo * 2, 4)
      const andando: number[] = []
      for (let origem = minimo; origem < n; origem++) {
        andando.push(valores[origem] - ajusteSazonal(valores.slice(0, origem), periodo)(origem))
      }

      const dentro = valores.map((y, t) => y - ajuste(t))
      const gastos = 2 + (indicesDoCiclo(valores, periodo).some(x => x !== 0) ? periodo - 1 : 0)
      const [residuos, parametros] = andando.length >= 5 ? [andando, 0] : [dentro, gastos]

      return comBanda(
        datasFuturas(p, passos),
        Array.from({ length: passos }, (_, i) => ajuste(n + i)),
        residuos,
        parametros,
      )
    },
  }
}

export type Avaliacao = {
  quando: string
  previsto: number
  real: number
  baixo: number
  alto: number
  /** Último valor que o modelo viu antes de prever — é contra ele que se mede a direção. */
  ultimoVisto: number
}

/**
 * Backtest de origem móvel: o modelo só enxerga o passado de cada data e é cobrado pelo futuro que
 * ele não viu. É a única medição que não se engana sozinha.
 */
export function backtest(
  serie: Serie,
  modelo: Modelo,
  opcoes: { minimoTreino?: number; horizonte?: number } = {},
): Avaliacao[] {
  const horizonte = opcoes.horizonte ?? 1
  const pontos = ordenar(serie.pontos)
  const minimo = Math.max(opcoes.minimoTreino ?? Math.max(serie.periodo * 2, 4), 2)
  const fora: Avaliacao[] = []
  for (let origem = minimo; origem + horizonte <= pontos.length; origem++) {
    const treino = pontos.slice(0, origem)
    const previsao = modelo.prever(treino, horizonte)[horizonte - 1]
    const real = pontos[origem + horizonte - 1]
    fora.push({
      quando: real.quando,
      previsto: previsao.valor,
      real: real.valor,
      baixo: previsao.baixo,
      alto: previsao.alto,
      ultimoVisto: treino[treino.length - 1].valor,
    })
  }
  return fora
}

export type Relatorio = {
  serie: string
  modelo: string
  comparacoes: number
  horizonte: number
  erroMedioAbsoluto: number
  erroPercentualMediano: number
  /** Fração de vezes em que acertou se o valor ia subir ou descer. Empates não contam. */
  acertoDirecional: number
  /** Fração de vezes em que o real caiu dentro do intervalo declarado. */
  cobertura: number
  confiancaDeclarada: number
  /** Erro do modelo dividido pelo erro do palpite simples. Abaixo de 1 é melhor que a régua. */
  contraARegua: number
  aprovado: boolean
  motivos: string[]
}

const media = (v: number[]) => (v.length === 0 ? 0 : v.reduce((s, x) => s + x, 0) / v.length)

export function relatorio(
  serie: Serie,
  modelo: Modelo,
  opcoes: { minimoTreino?: number; horizonte?: number } = {},
): Relatorio {
  const horizonte = opcoes.horizonte ?? 1
  const avaliacoes = backtest(serie, modelo, opcoes)
  const regua = backtest(serie, ingenuo, opcoes)

  const erros = avaliacoes.map(a => Math.abs(a.previsto - a.real))
  const errosRegua = regua.map(a => Math.abs(a.previsto - a.real))
  const percentuais = avaliacoes.filter(a => a.real !== 0).map(a => Math.abs(a.previsto - a.real) / Math.abs(a.real))

  const direcionais = avaliacoes.filter(a => a.real !== a.ultimoVisto)
  const acertos = direcionais.filter(
    a => Math.sign(a.previsto - a.ultimoVisto) === Math.sign(a.real - a.ultimoVisto),
  )

  const dentro = avaliacoes.filter(a => a.real >= a.baixo && a.real <= a.alto)
  const erroRegua = media(errosRegua)

  const r: Relatorio = {
    serie: serie.nome,
    modelo: modelo.nome,
    comparacoes: avaliacoes.length,
    horizonte,
    erroMedioAbsoluto: media(erros),
    erroPercentualMediano: percentuais.length === 0 ? 0 : mediana(percentuais),
    acertoDirecional: direcionais.length === 0 ? 0 : acertos.length / direcionais.length,
    cobertura: avaliacoes.length === 0 ? 0 : dentro.length / avaliacoes.length,
    confiancaDeclarada: CONFIANCA,
    contraARegua: erroRegua === 0 ? (media(erros) === 0 ? 1 : Infinity) : media(erros) / erroRegua,
    aprovado: false,
    motivos: [],
  }

  const motivos: string[] = []
  if (r.comparacoes < MINIMO_DE_COMPARACOES) {
    motivos.push(
      `Só ${r.comparacoes} comparações fora da amostra; são precisas ao menos ${MINIMO_DE_COMPARACOES} para o número significar algo.`,
    )
  }
  if (!(r.contraARegua < 1)) {
    motivos.push('Erra tanto quanto, ou mais que, o palpite simples de repetir o último valor.')
  }
  if (r.cobertura < CONFIANCA - 0.1) {
    motivos.push(
      `O intervalo promete ${Math.round(CONFIANCA * 100)}% e acerta ${Math.round(r.cobertura * 100)}%: a banda está estreita demais.`,
    )
  }
  if (direcionais.length > 0 && r.acertoDirecional <= 0.5) {
    motivos.push('Não acerta a direção mais vezes do que cara ou coroa.')
  }
  r.motivos = motivos
  r.aprovado = motivos.length === 0
  return r
}

const pct = (x: number) => `${Math.round(x * 100)}%`

/** O relatório dito como se fala, para quem lê a tela e não quer decorar sigla. */
export function emPalavras(r: Relatorio): string[] {
  const linhas = [
    `${r.comparacoes} comparações fora da amostra, prevendo ${r.horizonte} ponto(s) à frente.`,
    `Erra em média ${r.erroMedioAbsoluto.toFixed(2)} (${pct(r.erroPercentualMediano)} do valor, na mediana).`,
    `Acerta a direção ${pct(r.acertoDirecional)} das vezes.`,
    `O intervalo promete ${pct(r.confiancaDeclarada)} e acerta ${pct(r.cobertura)}.`,
    r.contraARegua < 1
      ? `Erra ${pct(1 - r.contraARegua)} menos que o palpite simples.`
      : 'Não bate o palpite simples de repetir o último valor.',
  ]
  return r.aprovado ? linhas : [...linhas, ...r.motivos]
}

/** Compara vários modelos na mesma série e devolve do melhor para o pior. */
export function comparar(
  serie: Serie,
  modelos: Modelo[],
  opcoes: { minimoTreino?: number; horizonte?: number } = {},
): Relatorio[] {
  return modelos.map(m => relatorio(serie, m, opcoes)).sort((a, b) => a.contraARegua - b.contraARegua)
}
