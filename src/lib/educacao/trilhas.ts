/**
 * Passo D2 do plano THEYE: trilhas de estudo em cima do que o Instituto já tem.
 *
 * Os 501 consultores de `src/data/agentes-instituto.json` carregam ementa: tópicos e fontes com
 * endereço. Uma trilha é essa ementa virada em plano de estudo: um módulo por tópico, com o tempo
 * que leva, a fonte que sustenta o módulo e o que a pessoa vai saber fazer ao fim.
 *
 * O que esta biblioteca NÃO faz, de propósito:
 *   - não inventa conteúdo: o módulo sem fonte na ementa é MARCADO como sem fonte, não escondido;
 *   - não emite certificado, diploma nem "capacitação reconhecida": o Instituto não é instituição
 *     de ensino credenciada, e dizer o contrário seria vender o que não existe;
 *   - não mede aprendizado. Mede módulo aberto e módulo marcado como lido, que é outra coisa, e a
 *     tela diz isso com todas as letras.
 */
import dados from '@/data/agentes-instituto.json'

export interface Fonte { titulo: string; url: string }
export interface Agente {
  id: string; nome: string; area: string; nicho: string
  ementa?: { topicos?: string[]; fontes?: Fonte[] }
}

export interface Modulo {
  n: number
  titulo: string
  /** A fonte que sustenta este módulo; null quando a ementa não trouxe nenhuma. */
  fonte: Fonte | null
  semFonte: boolean
  minutos: number
}

export interface Trilha {
  id: string
  nome: string
  area: string
  nicho: string
  modulos: Modulo[]
  minutos: number
  fontes: Fonte[]
  /** Quantos módulos não têm fonte. Fica à vista na tela em vez de virar silêncio. */
  modulosSemFonte: number
}

export const AGENTES = (dados as { agentes: Agente[] }).agentes
export const EMENTAS_EM = (dados as { ementas_atualizadas_em: string }).ementas_atualizadas_em

/**
 * Tempo de um módulo: 25 minutos de leitura do tópico mais 20 quando há fonte para visitar.
 * É estimativa declarada, não medição — e por isso é a mesma conta para todo mundo.
 */
export const MINUTOS_TOPICO = 25
export const MINUTOS_FONTE = 20

export function trilhaDoAgente(a: Agente): Trilha {
  const topicos = a.ementa?.topicos ?? []
  const fontes = a.ementa?.fontes ?? []
  const modulos: Modulo[] = topicos.map((t, i) => {
    const fonte = fontes.length ? fontes[i % fontes.length] : null
    return { n: i + 1, titulo: t, fonte, semFonte: !fonte, minutos: MINUTOS_TOPICO + (fonte ? MINUTOS_FONTE : 0) }
  })
  return {
    id: a.id, nome: a.nome, area: a.area, nicho: a.nicho, modulos,
    minutos: modulos.reduce((t, m) => t + m.minutos, 0),
    fontes,
    modulosSemFonte: modulos.filter(m => m.semFonte).length,
  }
}

/** Só os consultores com ementa viram trilha. Os outros ficam de fora e a conta diz quantos são. */
export const trilhasProntas = (): Trilha[] =>
  AGENTES.filter(a => (a.ementa?.topicos?.length ?? 0) > 0).map(trilhaDoAgente)

export const semEmenta = (): number => AGENTES.filter(a => !(a.ementa?.topicos?.length)).length

export const areas = (): { area: string; trilhas: number }[] => {
  const c = new Map<string, number>()
  for (const t of trilhasProntas()) c.set(t.area, (c.get(t.area) ?? 0) + 1)
  return [...c.entries()].map(([area, trilhas]) => ({ area, trilhas })).sort((a, b) => b.trilhas - a.trilhas)
}

export const procurar = (termo: string, lista = trilhasProntas()): Trilha[] => {
  const t = termo.trim().toLowerCase()
  if (!t) return lista
  return lista.filter(x => `${x.nome} ${x.area} ${x.nicho}`.toLowerCase().includes(t))
}

// --- Plano de estudo --------------------------------------------------------------------------

export interface Semana { semana: number; modulos: Modulo[]; minutos: number }

/**
 * Divide a trilha em semanas respeitando o tempo que a pessoa disse ter. Um módulo nunca é partido
 * ao meio, e um módulo mais longo que a semana inteira ganha a sua própria semana em vez de sumir.
 */
export function plano(t: Trilha, minutosPorSemana: number): Semana[] {
  const teto = Math.max(1, minutosPorSemana)
  const semanas: Semana[] = []
  let atual: Semana = { semana: 1, modulos: [], minutos: 0 }
  for (const m of t.modulos) {
    if (atual.modulos.length && atual.minutos + m.minutos > teto) {
      semanas.push(atual)
      atual = { semana: semanas.length + 1, modulos: [], minutos: 0 }
    }
    atual.modulos.push(m)
    atual.minutos += m.minutos
  }
  if (atual.modulos.length) semanas.push(atual)
  return semanas
}

export const semanasAteOFim = (t: Trilha, minutosPorSemana: number): number => plano(t, minutosPorSemana).length

// --- Progresso (local, e dito que é local) ------------------------------------------------------

export interface Progresso { lidos: number[]; porcento: number; proximo: Modulo | null; minutosQueFaltam: number }

export function progresso(t: Trilha, lidos: number[]): Progresso {
  const feitos = new Set(lidos.filter(n => t.modulos.some(m => m.n === n)))
  const faltam = t.modulos.filter(m => !feitos.has(m.n))
  return {
    lidos: [...feitos].sort((a, b) => a - b),
    porcento: t.modulos.length ? Math.round((feitos.size / t.modulos.length) * 100) : 0,
    proximo: faltam[0] ?? null,
    minutosQueFaltam: faltam.reduce((s, m) => s + m.minutos, 0),
  }
}

export const horas = (minutos: number): string => {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`
}

/** O que a plataforma entrega e o que ela não entrega, nesta ordem, para a tela e a proposta. */
export const PROMESSA = [
  'Plano de estudo montado a partir da ementa do consultor daquele nicho, com a fonte de cada módulo.',
  'Tempo estimado por módulo e divisão em semanas conforme o tempo que você tem.',
  'Marcação do que você já leu, guardada só no seu navegador.',
] as const

export const NAO_PROMESSA = [
  'Não emite certificado, diploma nem capacitação reconhecida: o Instituto não é instituição de ensino credenciada.',
  'Não mede se você aprendeu. Mede o que você marcou como lido, que é outra coisa.',
  'Não substitui o curso original: as fontes são de universidades e repositórios públicos, e o crédito é delas.',
  'Não guarda o seu estudo em servidor nenhum enquanto não houver assinatura com o seu aceite em termos.',
] as const
