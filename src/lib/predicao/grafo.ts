/**
 * Passo C6 do plano THEYE: o grafo que liga as fontes.
 *
 * Três partes, e a primeira é a que decide se o resto presta:
 *
 * 1. RESOLVEDOR DE ENTIDADES — nome que veio da fonte vira nó do grafo. A regra aqui é dura de
 *    propósito: identificador oficial (CNPJ, código do IBGE, código da ANA) manda sempre; nome
 *    igual depois de normalizado vem em segundo; parecença de nome só resolve acima do corte, e
 *    abaixo dele a resposta é NULL com o motivo escrito. Resolvedor que chuta junta duas empresas
 *    diferentes num nó só, e a partir daí todo número do grafo está errado sem ninguém ver.
 *
 * 2. ARESTAS COM FONTE — nenhuma aresta entra sem fonte e sem data de início. Aresta sem fonte é
 *    opinião nossa disfarçada de dado.
 *
 * 3. CONSULTA DE PRESSÃO — "o que pressiona o preço da soja esta semana?" é caminho no grafo até a
 *    commodity, devolvendo cada passo com a sua fonte e o seu evento. A resposta nunca é um número
 *    nosso: é a lista do que está ligado, com de onde veio.
 */

export type TipoAresta =
  | 'controla' | 'fornece' | 'licencia' | 'montante_de' | 'opera_em'
  | 'pertence_a' | 'concorre_com' | 'regula' | 'insumo_de' | 'escoa_por'

/** Para cada tipo, o que ele quer dizer e se faz sentido subir por ele numa busca de pressão. */
export const SENTIDO: Record<TipoAresta, { diz: string; pressiona: boolean }> = {
  controla: { diz: 'A origem controla o destino', pressiona: true },
  fornece: { diz: 'A origem fornece ao destino', pressiona: true },
  licencia: { diz: 'A origem licencia o destino', pressiona: true },
  montante_de: { diz: 'A origem fica rio acima do destino', pressiona: true },
  opera_em: { diz: 'A origem opera no lugar do destino', pressiona: false },
  pertence_a: { diz: 'A origem pertence ao destino', pressiona: false },
  concorre_com: { diz: 'A origem concorre com o destino', pressiona: false },
  regula: { diz: 'A origem regula o destino', pressiona: true },
  insumo_de: { diz: 'A origem é insumo do destino', pressiona: true },
  escoa_por: { diz: 'A origem escoa pelo destino', pressiona: true },
}

export interface No {
  id: string
  tipo: string
  nome: string
  /** Identificadores oficiais: { cnpj, ibge, ana_sar, ... }. Tudo em texto, como a fonte escreve. */
  identificadores?: Record<string, string>
  fonte: string
}

export interface Aresta {
  origem: string
  destino: string
  tipo: TipoAresta
  fonte: string
  valido_de: string
  valido_ate?: string | null
  peso?: number | null
}

export interface Evento {
  id: string
  tipo: string
  subtipo?: string | null
  titulo?: string | null
  ocorrido_em: string
  observado_em: string
  valor?: number | null
  unidade?: string | null
  fonte: string
  /** Nós a que este evento se refere. */
  entidades: string[]
}

export interface Grafo { nos: No[]; arestas: Aresta[]; eventos: Evento[] }

// --- 1. Resolvedor de entidades ----------------------------------------------------------------

// "S.A." vira "s a" quando a pontuação sai, então o "s a" entra na lista junto com os outros.
const SUFIXOS = /\b(s\s?a|sa|ltda|me|epp|eireli|cia|companhia|industria|comercio|participacoes|holding|group|grupo)\b/g

/** Minúscula, sem acento, sem pontuação, sem sufixo de razão social, espaços colapsados. */
export function normalizar(nome: string): string {
  return nome
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s/]/g, ' ')
    .replace(SUFIXOS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Parecença por palavras em comum (Jaccard), de 0 a 1. Simples e explicável de propósito. */
export function parecenca(a: string, b: string): number {
  const pa = new Set(normalizar(a).split(' ').filter(Boolean))
  const pb = new Set(normalizar(b).split(' ').filter(Boolean))
  if (!pa.size || !pb.size) return 0
  let juntos = 0
  for (const p of pa) if (pb.has(p)) juntos++
  return juntos / (pa.size + pb.size - juntos)
}

/** Abaixo disto o resolvedor não decide: devolve nulo e deixa a linha para conferência humana. */
export const CORTE = 0.75

export type Resolucao =
  | { no: No; confianca: number; motivo: string }
  | { no: null; confianca: number; motivo: string; quaseFoi?: { id: string; nome: string; confianca: number } }

/**
 * Resolve um nome (com os identificadores que a fonte mandou) para um nó do grafo.
 * Ordem: identificador oficial > nome normalizado igual > parecença acima do corte > nulo.
 */
export function resolver(
  entrada: { nome: string; identificadores?: Record<string, string> },
  nos: No[],
): Resolucao {
  const ids = entrada.identificadores ?? {}
  for (const [chave, valor] of Object.entries(ids)) {
    if (!valor) continue
    const achado = nos.find(n => n.identificadores?.[chave] && n.identificadores[chave] === valor)
    if (achado) return { no: achado, confianca: 1, motivo: `Identificador ${chave} igual: ${valor}.` }
  }
  const alvo = normalizar(entrada.nome)
  if (!alvo) return { no: null, confianca: 0, motivo: 'Nome vazio depois de normalizar.' }

  const iguais = nos.filter(n => normalizar(n.nome) === alvo)
  if (iguais.length === 1) return { no: iguais[0], confianca: 0.95, motivo: 'Nome igual depois de normalizar.' }
  if (iguais.length > 1) {
    return { no: null, confianca: 0, motivo: `${iguais.length} nós têm esse mesmo nome; só identificador oficial resolve.` }
  }

  let melhor: { no: No; c: number } | null = null
  for (const n of nos) {
    const c = parecenca(entrada.nome, n.nome)
    if (!melhor || c > melhor.c) melhor = { no: n, c }
  }
  if (melhor && melhor.c >= CORTE) {
    return { no: melhor.no, confianca: Math.round(melhor.c * 100) / 100, motivo: `Parecença de nome ${Math.round(melhor.c * 100)}%, acima do corte de ${CORTE * 100}%.` }
  }
  return {
    no: null,
    confianca: melhor ? Math.round(melhor.c * 100) / 100 : 0,
    motivo: `Nenhum nó alcançou o corte de ${CORTE * 100}%. Fica para conferência humana em vez de virar nó novo por engano.`,
    quaseFoi: melhor && melhor.c > 0 ? { id: melhor.no.id, nome: melhor.no.nome, confianca: Math.round(melhor.c * 100) / 100 } : undefined,
  }
}

// --- 2. Consistência ----------------------------------------------------------------------------

export interface Problema { onde: string; o_que: string }

/** Confere o grafo inteiro. Lista vazia é grafo são; qualquer item aqui é coisa a arrumar. */
export function conferir(g: Grafo): Problema[] {
  const p: Problema[] = []
  const ids = new Set(g.nos.map(n => n.id))

  for (const n of g.nos) if (!n.fonte) p.push({ onde: `nó ${n.id}`, o_que: 'Nó sem fonte.' })

  for (const a of g.arestas) {
    const onde = `aresta ${a.origem}->${a.destino} (${a.tipo})`
    if (!ids.has(a.origem)) p.push({ onde, o_que: 'Origem não existe no grafo.' })
    if (!ids.has(a.destino)) p.push({ onde, o_que: 'Destino não existe no grafo.' })
    if (a.origem === a.destino) p.push({ onde, o_que: 'Aresta de um nó para ele mesmo.' })
    if (!a.fonte) p.push({ onde, o_que: 'Aresta sem fonte.' })
    if (!a.valido_de) p.push({ onde, o_que: 'Aresta sem data de início.' })
    if (a.valido_ate && a.valido_de && a.valido_ate < a.valido_de) p.push({ onde, o_que: 'Fim antes do início.' })
    if (!(a.tipo in SENTIDO)) p.push({ onde, o_que: `Tipo de aresta desconhecido: ${a.tipo}.` })
  }

  for (const e of g.eventos) {
    const onde = `evento ${e.id}`
    if (!e.fonte) p.push({ onde, o_que: 'Evento sem fonte.' })
    if (e.observado_em < e.ocorrido_em) p.push({ onde, o_que: 'Soubemos antes de acontecer: observado_em é anterior a ocorrido_em.' })
    for (const id of e.entidades) if (!ids.has(id)) p.push({ onde, o_que: `Evento aponta para o nó ${id}, que não existe.` })
  }

  for (const c of ciclos(g, 'montante_de')) {
    p.push({ onde: `ciclo em montante_de: ${c.join(' -> ')}`, o_que: 'Rio não pode ficar acima de si mesmo.' })
  }
  return p
}

/** Ciclos num tipo de aresta. Usado para pegar hierarquia que se mordeu, como rio acima de si. */
export function ciclos(g: Grafo, tipo: TipoAresta): string[][] {
  const saindo = new Map<string, string[]>()
  for (const a of g.arestas.filter(x => x.tipo === tipo)) {
    saindo.set(a.origem, [...(saindo.get(a.origem) ?? []), a.destino])
  }
  const achados: string[][] = []
  const estado = new Map<string, 'visitando' | 'pronto'>()
  const caminho: string[] = []
  const andar = (no: string) => {
    estado.set(no, 'visitando')
    caminho.push(no)
    for (const prox of saindo.get(no) ?? []) {
      if (estado.get(prox) === 'visitando') achados.push([...caminho.slice(caminho.indexOf(prox)), prox])
      else if (!estado.has(prox)) andar(prox)
    }
    caminho.pop()
    estado.set(no, 'pronto')
  }
  for (const n of g.nos) if (!estado.has(n.id)) andar(n.id)
  return achados
}

// --- 3. "O que pressiona o preço da soja esta semana?" -------------------------------------------

export interface Passo { de: string; para: string; tipo: TipoAresta; diz: string; fonte: string }

export interface Pressao {
  no: string
  nome: string
  /** O caminho do nó até o alvo, aresta por aresta, cada uma com a sua fonte. */
  caminho: Passo[]
  /** Os eventos desse nó dentro da janela, com fonte e hora. */
  eventos: Evento[]
  /** Quantas arestas até o alvo. Perto pesa mais que longe, e por isso ordena a lista. */
  distancia: number
  fontes: string[]
}

/**
 * Quem pressiona o alvo, numa janela de tempo. Sobe pelas arestas que fazem sentido subir
 * (SENTIDO[tipo].pressiona) até o limite de saltos, e só devolve nó que teve evento na janela:
 * ligação sem fato novo não é pressão desta semana, é só topologia.
 */
export function pressionam(
  g: Grafo,
  alvoId: string,
  janela: { de: string; ate: string },
  saltos = 3,
): Pressao[] {
  const nome = (id: string) => g.nos.find(n => n.id === id)?.nome ?? id
  const fila: { id: string; caminho: Passo[] }[] = [{ id: alvoId, caminho: [] }]
  const visto = new Set([alvoId])
  const fora: Pressao[] = []

  while (fila.length) {
    const atual = fila.shift()!
    if (atual.caminho.length >= saltos) continue
    const chegando = g.arestas.filter(a => a.destino === atual.id && SENTIDO[a.tipo]?.pressiona)
    for (const a of chegando) {
      if (a.valido_ate && a.valido_ate < janela.de) continue      // ligação que já acabou
      if (a.valido_de > janela.ate) continue                      // ligação que ainda não começou
      if (visto.has(a.origem)) continue
      visto.add(a.origem)
      const caminho = [...atual.caminho, { de: a.origem, para: a.destino, tipo: a.tipo, diz: SENTIDO[a.tipo].diz, fonte: a.fonte }]
      fila.push({ id: a.origem, caminho })
      const eventos = g.eventos.filter(e =>
        e.entidades.includes(a.origem) && e.ocorrido_em >= janela.de && e.ocorrido_em <= janela.ate)
      if (eventos.length) {
        fora.push({
          no: a.origem, nome: nome(a.origem), caminho, eventos, distancia: caminho.length,
          fontes: [...new Set([...caminho.map(p => p.fonte), ...eventos.map(e => e.fonte)])].sort(),
        })
      }
    }
  }
  return fora.sort((x, y) => x.distancia - y.distancia || y.eventos.length - x.eventos.length)
}

/** A resposta em português, uma linha por pressão, sempre com a fonte no fim. */
export const emPalavras = (p: Pressao[]): string[] =>
  p.map(x => {
    const caminho = x.caminho.map(c => SENTIDO[c.tipo].diz.toLowerCase()).join('; depois ')
    const fato = x.eventos.map(e => `${e.titulo ?? e.tipo}${e.valor !== null && e.valor !== undefined ? ` (${e.valor}${e.unidade ? ' ' + e.unidade : ''})` : ''}`).join(', ')
    return `${x.nome}: ${fato}. Ligação: ${caminho}. Fontes: ${x.fontes.join(', ')}.`
  })
