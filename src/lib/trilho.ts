/**
 * Passo T2, parte que não depende de ninguém: conferir a corrente do trilho no próprio navegador.
 *
 * O trilho é um arquivo em que cada volta de trabalho vira um "elo", e cada elo carrega o hash do
 * elo anterior. Quem quiser saber se alguém mexeu no registro depois de escrito não precisa
 * acreditar em mim: recalcula os hashes e compara. Esta biblioteca faz exatamente isso, e a tela
 * /lastro mostra o resultado.
 *
 * RECEITA OFICIAL DO ELO, a mesma de /mnt/project-files/predicao/conferir-trilho.py:
 *
 *     hash = sha256( anterior + json.dumps(elo_sem_hash, ensure_ascii=False, sort_keys=True) )
 *
 * O `json.dumps` do Python, nesses parâmetros, escreve `{"a": 1, "b": [2, 3]}`: chaves em ordem
 * alfabética, dois-pontos e vírgula seguidos de UM espaço, e acentos crus em UTF-8. O
 * `JSON.stringify` do JavaScript escreve `{"a":1,"b":[2,3]}`, sem espaço nenhum, e por isso NÃO
 * serve: daria outro hash. `corpoCanonico` abaixo reproduz a forma do Python.
 *
 * Isso foi conferido, não suposto: rodado contra os 39 elos de 13/11/2026, este serializador
 * reproduz exatamente os mesmos 36 que o script em Python reproduz, e falha nos mesmos 3.
 */

/** Hash da gênese do plano v4: para onde o primeiro elo aponta. */
export const GENESE = '4bfb87dc1dc0e9c363f39c0cfdd09c1b4a89368de2b5f7c6307943725622641c'

export interface Elo {
  passo?: string
  quando?: string
  hash: string
  anterior?: string
  /** Elos antigos usavam este nome; a leitura aceita os dois, elo novo escreve `anterior`. */
  hash_anterior?: string
  [campo: string]: unknown
}

export interface ConferenciaElo {
  n: number
  passo: string
  /** O elo aponta para o hash do elo de cima? */
  ligado: boolean
  /** O hash do elo é reproduzível pela receita oficial? */
  reproduzido: boolean
  hash: string
}

export interface Conferencia {
  elos: ConferenciaElo[]
  ligacaoIntegra: boolean
  reproduzidos: number
  ultimoHash: string
}

export const anteriorDe = (elo: Elo): string => elo.anterior || elo.hash_anterior || ''

/** O mesmo texto que `json.dumps(obj, ensure_ascii=False, sort_keys=True)` produziria. */
export function corpoCanonico(valor: unknown): string {
  if (valor === null) return 'null'
  if (typeof valor === 'boolean') return valor ? 'true' : 'false'
  if (typeof valor === 'number') return String(valor)
  if (typeof valor === 'string') return JSON.stringify(valor)
  if (Array.isArray(valor)) return `[${valor.map(corpoCanonico).join(', ')}]`
  if (typeof valor === 'object') {
    const o = valor as Record<string, unknown>
    return `{${Object.keys(o).sort().map(k => `${JSON.stringify(k)}: ${corpoCanonico(o[k])}`).join(', ')}}`
  }
  return 'null'
}

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')

/** Recalcula o hash de um elo pela receita oficial. Usa o SHA-256 do próprio navegador. */
export async function recalcular(elo: Elo): Promise<string> {
  const { hash: _descartado, ...semHash } = elo
  const texto = anteriorDe(elo) + corpoCanonico(semHash)
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)))
}

/** Lê o arquivo do trilho (um elo por linha) e descarta linha vazia. */
export function lerElos(conteudo: string): Elo[] {
  return conteudo.split('\n').filter(l => l.trim()).map(l => JSON.parse(l) as Elo)
}

/**
 * Confere a corrente inteira. São DUAS perguntas diferentes, e a tela mostra as duas separadas:
 *  - a ligação está íntegra? (cada elo aponta para o hash do elo de cima, desde a gênese)
 *  - quantos hashes são reproduzíveis? (elo escrito antes de 13/11/2026 usou outra receita e não é)
 * Ligação quebrada é grave. Hash não reproduzido num elo antigo não é: é receita diferente.
 */
export async function conferirCorrente(elos: Elo[]): Promise<Conferencia> {
  const resultado: ConferenciaElo[] = []
  let esperado = GENESE
  let ligacaoIntegra = true
  for (const [i, elo] of elos.entries()) {
    const ligado = anteriorDe(elo) === esperado
    if (!ligado) ligacaoIntegra = false
    resultado.push({
      n: i + 1,
      passo: String(elo.passo ?? '—'),
      ligado,
      reproduzido: (await recalcular(elo)) === elo.hash,
      hash: elo.hash,
    })
    esperado = elo.hash
  }
  return {
    elos: resultado,
    ligacaoIntegra,
    reproduzidos: resultado.filter(e => e.reproduzido).length,
    ultimoHash: esperado,
  }
}
