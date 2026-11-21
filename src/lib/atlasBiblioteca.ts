// Biblioteca do Atlas: lê o ficheiro publicado com as peças escolhidas do corpus
// (public/atlas-biblioteca-v1.jsonl) e filtra-o na própria tela, sem servidor.
// Só metadados: título, ano, fonte, licença e o endereço de onde vem. Nenhum ficheiro
// de norma é guardado aqui; normas citam-se por número.

export interface PecaAtlas {
  /** Identificador na fonte (ex.: "zenodo:123456"). */
  id: string
  /** Título, como vem da fonte. */
  titulo: string
  ano: number | null
  /** Id da especialidade (ex.: "geotecnia"). */
  especialidade: string
  /** Nome da especialidade, por extenso. */
  especialidadeNome: string
  fonte: string
  licenca: string
  /** Verdadeiro quando a licença deixa o Instituto guardar o ficheiro. */
  guardavel: boolean
  /** Verdadeiro quando o texto fala de Angola, Namíbia, África ou contexto tropical. */
  contextoLocal: boolean
  /** Nota de utilidade de 0 a 5, dada por regra escrita na classificação. */
  nota: number
  tipo: string
  url: string
}

/** Onde a tela procura o ficheiro, por ordem. */
export const ONDE_BIBLIOTECA = [
  // Só no próprio site: desde 20/11/2026 nada sai do GitHub nem do jsDelivr (pedido de M: ninguém copia).
  './atlas-biblioteca-v1.jsonl',
]

/** Lê o ficheiro linha a linha. Linha estragada é saltada, não derruba a tela. */
export function lerBiblioteca(texto: string): PecaAtlas[] {
  const fora: PecaAtlas[] = []
  for (const linha of texto.split('\n')) {
    const s = linha.trim()
    if (!s) continue
    try {
      const d = JSON.parse(s) as Record<string, unknown>
      if (typeof d.id !== 'string' || typeof d.t !== 'string') continue
      fora.push({
        id: d.id,
        titulo: d.t,
        ano: typeof d.a === 'number' ? d.a : null,
        especialidade: String(d.e ?? ''),
        especialidadeNome: String(d.en ?? d.e ?? ''),
        fonte: String(d.f ?? ''),
        licenca: String(d.l ?? 'não informada'),
        guardavel: d.g === true,
        contextoLocal: d.af === true,
        nota: typeof d.n === 'number' ? d.n : 0,
        tipo: String(d.tp ?? ''),
        url: String(d.u ?? ''),
      })
    } catch { /* linha estragada: salta */ }
  }
  return fora
}

export interface FiltroBiblioteca {
  busca?: string
  especialidade?: string
  soGuardaveis?: boolean
  soContextoLocal?: boolean
}

/** Filtra sem acentuar diferença entre maiúsculas e minúsculas; ordena pela nota e pelo ano. */
export function filtrarBiblioteca(pecas: PecaAtlas[], f: FiltroBiblioteca): PecaAtlas[] {
  const termo = (f.busca ?? '').trim().toLowerCase()
  const fora = pecas.filter(p => {
    if (f.especialidade && p.especialidade !== f.especialidade) return false
    if (f.soGuardaveis && !p.guardavel) return false
    if (f.soContextoLocal && !p.contextoLocal) return false
    if (termo && !`${p.titulo} ${p.especialidadeNome} ${p.fonte} ${p.tipo}`.toLowerCase().includes(termo)) return false
    return true
  })
  return fora.sort((a, b) => b.nota - a.nota || (b.ano ?? 0) - (a.ano ?? 0))
}

/** Contagens para mostrar em cima da lista. */
export function contarBiblioteca(pecas: PecaAtlas[]) {
  return {
    total: pecas.length,
    guardaveis: pecas.filter(p => p.guardavel).length,
    contextoLocal: pecas.filter(p => p.contextoLocal).length,
    especialidades: new Set(pecas.map(p => p.especialidade)).size,
  }
}
