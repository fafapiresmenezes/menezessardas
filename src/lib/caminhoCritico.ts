// Passo 30: dependências entre etapas (campo "depende de"), caminho crítico e data prevista de conclusão.
// Método do caminho crítico (PMBOK 7, cronograma): cada etapa tem duração em dias, estimada pela
// distância entre o prazo da etapa anterior (ou o início) e o próprio prazo; a etapa começa quando a
// etapa de que depende termina. A cadeia mais longa é o caminho crítico e seu fim é a previsão.
export type Etapa = { id: string; titulo: string; prazo: string | null; situacao: string; depende_de: string | null; criado_em?: string }
export type Resultado = { fimPrevisto: string | null; caminho: string[]; atraso: number; fins: Record<string, string> }

const dia = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00Z`)
const chave = (d: Date) => d.toISOString().slice(0, 10)
const mais = (d: Date, n: number) => new Date(d.getTime() + n * 86400000)
const diasEntre = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000)

export function caminhoCritico(etapas: Etapa[], inicio: string, hojeIso = chave(new Date())): Resultado {
  const porId = new Map(etapas.map(e => [e.id, e]))
  const ini = dia(inicio), hoje = dia(hojeIso)
  const fins = new Map<string, Date>()
  const dur = new Map<string, number>()
  const visitando = new Set<string>()
  const fim = (e: Etapa): Date => {
    if (fins.has(e.id)) return fins.get(e.id)!
    if (visitando.has(e.id)) return e.prazo ? dia(e.prazo) : ini // ciclo: ignora a dependência
    visitando.add(e.id)
    const dep = e.depende_de ? porId.get(e.depende_de) : undefined
    const base = dep ? fim(dep) : ini
    // Duração: do prazo anterior até o próprio prazo; sem prazo, 1 dia.
    const previsto = e.prazo ? dia(e.prazo) : mais(base, 1)
    const duracao = Math.max(1, dep && dep.prazo ? diasEntre(dia(dep.prazo), previsto) : diasEntre(ini, previsto))
    dur.set(e.id, duracao)
    let f: Date
    if (e.situacao === 'feito') f = previsto
    else {
      f = mais(base, duracao)
      if (f < hoje) f = hoje // o que não terminou não pode terminar no passado
    }
    visitando.delete(e.id)
    fins.set(e.id, f)
    return f
  }
  for (const e of etapas) fim(e)
  if (!etapas.length) return { fimPrevisto: null, caminho: [], atraso: 0, fins: {} }
  // Caminho crítico: cadeia de dependências que termina mais tarde.
  let ultima = etapas[0]
  for (const e of etapas) if (fins.get(e.id)! > fins.get(ultima.id)!) ultima = e
  const caminho: string[] = []
  const vistos = new Set<string>()
  for (let e: Etapa | undefined = ultima; e && !vistos.has(e.id); e = e.depende_de ? porId.get(e.depende_de) : undefined) { vistos.add(e.id); caminho.unshift(e.id) }
  const fimPrevisto = fins.get(ultima.id)!
  const prazos = etapas.map(e => e.prazo).filter((x): x is string => !!x).sort()
  const prazoFinal = prazos[prazos.length - 1]
  const atraso = prazoFinal ? Math.max(0, diasEntre(dia(prazoFinal), fimPrevisto)) : 0
  return { fimPrevisto: chave(fimPrevisto), caminho, atraso, fins: Object.fromEntries([...fins].map(([k, v]) => [k, chave(v)])) }
}
