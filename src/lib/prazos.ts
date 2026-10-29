// Contagem de prazos processuais em dias úteis (CPC, arts. 219, 220 e 224): exclui o dia do começo,
// conta só dias úteis, suspende de 20/12 a 20/01 (recesso forense) e pula feriados nacionais e do Rio.
// Feriados locais do tribunal e suspensões por portaria não entram: a tela avisa para conferir.

function pascoa(ano: number): Date {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(ano, mes - 1, dia))
}
const chave = (d: Date) => d.toISOString().slice(0, 10)
const somaDias = (d: Date, n: number) => new Date(d.getTime() + n * 86400000)

export function feriados(ano: number): Map<string, string> {
  const f = new Map<string, string>()
  const fixos: [string, string][] = [
    ['01-01', 'Confraternização Universal'], ['01-20', 'São Sebastião (Rio)'], ['04-21', 'Tiradentes'], ['04-23', 'São Jorge (RJ)'],
    ['05-01', 'Dia do Trabalho'], ['08-11', 'Dia do Advogado (expediente forense)'], ['09-07', 'Independência'], ['10-12', 'Nossa Senhora Aparecida'],
    ['11-01', 'Todos os Santos (Lei 5.010/66)'], ['11-02', 'Finados'], ['11-15', 'Proclamação da República'], ['11-20', 'Consciência Negra'], ['12-25', 'Natal'],
  ]
  for (const [md, nome] of fixos) f.set(`${ano}-${md}`, nome)
  const p = pascoa(ano)
  f.set(chave(somaDias(p, -48)), 'Carnaval'); f.set(chave(somaDias(p, -47)), 'Carnaval')
  f.set(chave(somaDias(p, -46)), 'Quarta-feira de Cinzas (até 14h)')
  f.set(chave(somaDias(p, -3)), 'Quinta-feira Santa'); f.set(chave(somaDias(p, -2)), 'Sexta-feira Santa')
  f.set(chave(somaDias(p, 60)), 'Corpus Christi')
  return f
}

export function recesso(d: Date): boolean {
  const m = d.getUTCMonth() + 1, dia = d.getUTCDate()
  return (m === 12 && dia >= 20) || (m === 1 && dia <= 20)
}

export function diaUtil(d: Date): string | null {
  const dow = d.getUTCDay()
  if (dow === 0 || dow === 6) return 'fim de semana'
  if (recesso(d)) return 'recesso forense (art. 220 CPC)'
  return feriados(d.getUTCFullYear()).get(chave(d)) ?? null
}

/** Data final do prazo de `dias` úteis a partir da intimação/publicação em `inicio` (AAAA-MM-DD). */
export function calcularPrazo(inicio: string, dias: number, emDobro = false) {
  const total = emDobro ? dias * 2 : dias
  let d = new Date(`${inicio}T00:00:00Z`)
  const pulados: { data: string; motivo: string }[] = []
  let contados = 0
  while (contados < total) {
    d = somaDias(d, 1)
    const motivo = diaUtil(d)
    if (motivo) { if (motivo !== 'fim de semana') pulados.push({ data: chave(d), motivo }) } else contados++
  }
  return { final: chave(d), diasContados: total, pulados }
}
