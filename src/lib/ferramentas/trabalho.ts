// Theye Suporte Jurídico — rescisão trabalhista e tempo de contribuição (cálculos sem descontos de INSS e IR).
import { arred, diasEntre, paraData, somarAnos, somarDias, somarMeses } from './base'
import { avisoPrevio } from './calculos'

export type TipoRescisao = 'sem-justa-causa' | 'pedido' | 'justa-causa' | 'acordo'
export const TIPOS_RESCISAO: Record<TipoRescisao, string> = {
  'sem-justa-causa': 'Dispensa sem justa causa', pedido: 'Pedido de demissão', 'justa-causa': 'Dispensa por justa causa', acordo: 'Acordo entre as partes (CLT, art. 484-A)',
}

const fimDoMes = (ano: number, mes: number) => new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate()
/** Avos de 13º no ano do desligamento: mês com 15 dias ou mais de trabalho conta (Lei 4.090/62, art. 1º, § 2º). */
export function avos13(admissao: string, fim: string): number {
  const a = paraData(fim).getUTCFullYear()
  let avos = 0
  for (let m = 0; m < 12; m++) {
    const ini = `${a}-${String(m + 1).padStart(2, '0')}-01`, ult = `${a}-${String(m + 1).padStart(2, '0')}-${fimDoMes(a, m)}`
    const de = admissao > ini ? admissao : ini, ate = fim < ult ? fim : ult
    if (ate >= de && diasEntre(de, ate) + 1 >= 15) avos++
  }
  return avos
}
/** Avos de férias proporcionais no período aquisitivo em curso: fração de 15 dias ou mais conta (CLT, art. 146, parágrafo único). */
export function avosFerias(admissao: string, fim: string): number {
  let inicio = admissao
  while (somarAnos(inicio, 1) <= fim) inicio = somarAnos(inicio, 1)
  let meses = 0
  while (meses < 12 && somarMeses(inicio, meses + 1) <= somarDias(fim, 1)) meses++
  const resto = diasEntre(somarMeses(inicio, meses), fim) + 1
  return Math.min(12, meses + (meses < 12 && resto >= 15 ? 1 : 0))
}

/** Verbas rescisórias brutas (sem INSS, IR e descontos). Aviso indenizado projeta o contrato (CLT, art. 487, § 1º; OJ 82 da SDI-1). */
export function rescisao(salario: number, admissao: string, desligamento: string, tipo: TipoRescisao, avisoIndenizado: boolean, feriasVencidas: number, saldoFgts: number) {
  if (desligamento < admissao) throw new Error('O desligamento precisa ser depois da admissão.')
  const diaria = salario / 30
  const aviso = avisoPrevio(admissao, desligamento)
  const temAviso = (tipo === 'sem-justa-causa' || tipo === 'acordo') && avisoIndenizado
  const diasAviso = temAviso ? (tipo === 'acordo' ? Math.floor(aviso.dias / 2) : aviso.dias) : 0
  const projecao = temAviso ? somarDias(desligamento, aviso.dias) : desligamento
  const linhas: { verba: string; valor: number; base: string }[] = []
  linhas.push({ verba: `Saldo de salário (${paraData(desligamento).getUTCDate()} dias)`, valor: arred(diaria * paraData(desligamento).getUTCDate()), base: 'CLT, art. 462' })
  if (diasAviso) linhas.push({ verba: `Aviso prévio indenizado (${diasAviso} dias${tipo === 'acordo' ? ', metade' : ''})`, valor: arred(diaria * diasAviso), base: tipo === 'acordo' ? 'CLT, art. 484-A, I, a' : 'CLT, art. 487, § 1º; Lei 12.506/2011' })
  if (tipo !== 'justa-causa') {
    const a13 = avos13(admissao, projecao)
    linhas.push({ verba: `13º salário proporcional (${a13}/12)`, valor: arred(salario * a13 / 12), base: 'Lei 4.090/62' })
    const af = avosFerias(admissao, projecao)
    const fp = salario * af / 12
    linhas.push({ verba: `Férias proporcionais (${af}/12) + 1/3`, valor: arred(fp + fp / 3), base: 'CLT, art. 146; Súmulas 171 e 261 do TST' })
  }
  if (feriasVencidas > 0) linhas.push({ verba: `Férias vencidas (${feriasVencidas} período(s)) + 1/3`, valor: arred(salario * feriasVencidas * 4 / 3), base: 'CLT, arts. 137 e 146' })
  const pctMulta = tipo === 'sem-justa-causa' ? 40 : tipo === 'acordo' ? 20 : 0
  if (pctMulta && saldoFgts > 0) linhas.push({ verba: `Multa do FGTS (${pctMulta}%)`, valor: arred(saldoFgts * pctMulta / 100), base: tipo === 'acordo' ? 'CLT, art. 484-A, I, b' : 'Lei 8.036/90, art. 18, § 1º' })
  const total = arred(linhas.reduce((s, l) => s + l.valor, 0))
  const saque = tipo === 'sem-justa-causa' ? 'Saque de 100% do FGTS e seguro-desemprego, se cumpridos os requisitos.' : tipo === 'acordo' ? 'Saque de até 80% do FGTS; sem seguro-desemprego (art. 484-A, §§ 1º e 2º).' : 'Sem saque do FGTS nem seguro-desemprego.'
  return { linhas, total, diasAvisoLei: aviso.dias, projecao, saque, pedidoSemAviso: tipo === 'pedido' }
}

// ---------- Tempo de contribuição ----------
export function somarPeriodos(periodos: { de: string; ate: string }[]) {
  const ord = periodos.filter(p => p.ate >= p.de).sort((a, b) => a.de.localeCompare(b.de))
  const unidos: { de: string; ate: string }[] = []
  for (const p of ord) {
    const u = unidos[unidos.length - 1]
    if (u && p.de <= somarDias(u.ate, 1)) { if (p.ate > u.ate) u.ate = p.ate } else unidos.push({ ...p })
  }
  const dias = unidos.reduce((s, p) => s + diasEntre(p.de, p.ate) + 1, 0)
  const anos = Math.floor(dias / 365), meses = Math.floor((dias % 365) / 30), d = (dias % 365) % 30
  return { dias, anos, meses, diasResto: d, concomitancias: ord.length - unidos.length, unidos }
}
export function idadeEm(nascimento: string, data: string): number { let a = 0; while (somarAnos(nascimento, a + 1) <= data) a++; return a }

/** Regras de transição da EC 103/2019 (arts. 15 e 16) e regra de idade (art. 18), para quem já contribuía antes de 13/11/2019. */
export function aposentadoria(nascimento: string, sexo: 'F' | 'M', periodos: { de: string; ate: string }[], dataBase: string) {
  const t = somarPeriodos(periodos)
  const idadeAnos = idadeEm(nascimento, dataBase)
  const idadeFrac = diasEntre(nascimento, dataBase) / 365.25
  const tempoFrac = t.dias / 365
  const ano = paraData(dataBase).getUTCFullYear()
  const passos = Math.max(0, ano - 2019)
  const pontosExigidos = sexo === 'F' ? Math.min(100, 86 + passos) : Math.min(105, 96 + passos)
  const idadeMinProg = sexo === 'F' ? Math.min(62, 56 + passos * 0.5) : Math.min(65, 61 + passos * 0.5)
  const tempoMin = sexo === 'F' ? 30 : 35
  const pontos = Math.floor((idadeFrac + tempoFrac) * 100) / 100
  return {
    tempo: t, idadeAnos, pontos, ano,
    regras: [
      { nome: `Pontos (art. 15): ${pontosExigidos} pontos e ${tempoMin} anos de contribuição em ${ano}`, ok: pontos >= pontosExigidos && tempoFrac >= tempoMin },
      { nome: `Idade mínima progressiva (art. 16): ${idadeMinProg.toLocaleString('pt-BR')} anos e ${tempoMin} de contribuição em ${ano}`, ok: idadeFrac >= idadeMinProg && tempoFrac >= tempoMin },
      { nome: `Idade (art. 18): ${sexo === 'F' ? 62 : 65} anos e 15 de contribuição`, ok: idadeFrac >= (sexo === 'F' ? 62 : 65) && tempoFrac >= 15 },
    ],
  }
}
