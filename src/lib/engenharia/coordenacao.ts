// Mesa de coordenação BIM em tempo real (ferramenta P2 do Plano Master de Engenharia), versão 1.
// Quem abre a mesma sala vê quem está online e os mesmos apontamentos (no molde de um BCF: elemento,
// disciplinas, descrição, responsável, prazo, situação). A troca é ao vivo pelo canal em tempo real do
// Supabase (broadcast + presença, sem gravar no banco); cada aparelho guarda a sua cópia, e quem entra
// depois recebe o estado dos que já estão na sala. A regra de junção abaixo é determinística: todos
// chegam ao mesmo resultado, seja qual for a ordem em que as mensagens chegam.

export type Situacao = 'aberto' | 'em análise' | 'resolvido' | 'fechado'
export const SITUACOES: Situacao[] = ['aberto', 'em análise', 'resolvido', 'fechado']
export interface Apontamento {
  id: string; titulo: string; elemento: string; disciplinas: string; descricao: string
  responsavel: string; prazo: string; situacao: Situacao; autor: string
  criadoEm: string
  /** relógio de versão: maior vence; empate decide por autor e depois pelo conteúdo */
  versao: number; atualizadoEm: string; atualizadoPor: string
  apagado?: boolean
}

export type Evento =
  | { tipo: 'upsert'; ap: Apontamento }
  | { tipo: 'estado'; aps: Apontamento[] }

const chave = (a: Apontamento) => `${String(a.versao).padStart(12, '0')}|${a.atualizadoEm}|${a.atualizadoPor}|${JSON.stringify([a.titulo, a.situacao, a.descricao, a.responsavel, a.prazo, a.elemento, a.disciplinas, !!a.apagado])}`

/** escolhe a versão vencedora de um mesmo apontamento (comutativa, associativa, idempotente) */
export function vencedor(a: Apontamento, b: Apontamento): Apontamento {
  return chave(a) >= chave(b) ? a : b
}

export function mesclar(atual: Apontamento[], chegando: Apontamento[]): Apontamento[] {
  const m = new Map(atual.map(a => [a.id, a]))
  for (const b of chegando) {
    if (!b || typeof b.id !== 'string' || typeof b.versao !== 'number') continue
    const a = m.get(b.id)
    m.set(b.id, a ? vencedor(a, b) : b)
  }
  return [...m.values()].sort((x, y) => x.criadoEm.localeCompare(y.criadoEm) || x.id.localeCompare(y.id))
}

export function aplicar(atual: Apontamento[], e: Evento): Apontamento[] {
  return e.tipo === 'upsert' ? mesclar(atual, [e.ap]) : mesclar(atual, e.aps)
}

export function editar(a: Apontamento, mudancas: Partial<Omit<Apontamento, 'id' | 'versao' | 'criadoEm' | 'autor'>>, quem: string, agora = new Date()): Apontamento {
  return { ...a, ...mudancas, versao: a.versao + 1, atualizadoEm: agora.toISOString(), atualizadoPor: quem }
}

export function novoApontamento(dados: Pick<Apontamento, 'titulo' | 'elemento' | 'disciplinas' | 'descricao' | 'responsavel' | 'prazo'>, autor: string, agora = new Date()): Apontamento {
  const t = agora.toISOString()
  return { id: `ap-${agora.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, ...dados, situacao: 'aberto', autor, criadoEm: t, versao: 1, atualizadoEm: t, atualizadoPor: autor }
}

export function painel(aps: Apontamento[], hoje = new Date().toISOString().slice(0, 10)) {
  const vivos = aps.filter(a => !a.apagado)
  const por = (s: Situacao) => vivos.filter(a => a.situacao === s).length
  const atrasados = vivos.filter(a => (a.situacao === 'aberto' || a.situacao === 'em análise') && a.prazo && a.prazo < hoje)
  return { total: vivos.length, aberto: por('aberto'), analise: por('em análise'), resolvido: por('resolvido'), fechado: por('fechado'), atrasados: atrasados.length }
}

/** nome de sala: só letras, números e hífen, para servir de nome de canal */
export function normalizarSala(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48)
}

export function apontamentosParaCSV(aps: Apontamento[]): string {
  const esc = (s: string) => `"${(s ?? '').replace(/"/g, '""')}"`
  return ['Id;Título;Elemento;Disciplinas;Descrição;Responsável;Prazo;Situação;Autor;Criado em;Versão;Atualizado por',
    ...aps.filter(a => !a.apagado).map(a => [a.id, esc(a.titulo), esc(a.elemento), esc(a.disciplinas), esc(a.descricao), esc(a.responsavel), a.prazo, a.situacao, esc(a.autor), a.criadoEm, a.versao, esc(a.atualizadoPor)].join(';'))].join('\n')
}

/** apontamentos a partir dos conflitos detectados: cada cruzamento vira um item da pauta de coordenação */
export function apontamentosDeConflitos(conflitos: { a: string; b: string; disciplinas: string; tipo: string; texto: string }[], autor: string, agora = new Date()): Apontamento[] {
  return conflitos.map((c, k) => ({
    ...novoApontamento({ titulo: `${c.tipo === 'duro' ? 'Cruzamento' : 'Folga'} ${c.a} × ${c.b}`, elemento: `${c.a}, ${c.b}`, disciplinas: c.disciplinas, descricao: c.texto, responsavel: '', prazo: '' }, autor, new Date(agora.getTime() + k)),
    id: `ap-conf-${c.a}-${c.b}`,
  }))
}
