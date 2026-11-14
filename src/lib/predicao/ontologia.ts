/**
 * Passo C1 do plano THEYE: a ontologia de eventos, o vocabulário comum da previsão
 * a partir de dados públicos. Espelha database/migrations/122_ontologia_eventos.sql.
 *
 * Quatro tabelas: entidades (as coisas), lugares (a geografia), eventos (o que aconteceu)
 * e arestas (as relações entre entidades). Toda linha carrega a fonte e um hash do próprio
 * conteúdo, para a ingestão não duplicar e para o número ser reconferível depois.
 *
 * Em eventos, `ocorrido_em` é quando a coisa aconteceu e `observado_em` é quando soubemos.
 * As duas são separadas de propósito: o atraso entre elas é o que se mede em nowcasting.
 */
import { supabase, supabaseConfigurado } from '../supabase'

export const ESQUEMA = 'instituto'

export type TipoEntidade =
  | 'empresa' | 'orgao_publico' | 'municipio' | 'estado' | 'pais'
  | 'bacia' | 'corpo_dagua' | 'mina' | 'empreendimento' | 'commodity'
  | 'contrato_futuro' | 'pessoa_juridica_outra'

export type TipoLugar = 'municipio' | 'estado' | 'regiao' | 'pais' | 'bacia' | 'sub_bacia' | 'poligono' | 'ponto'

export type PapelEntidade = 'ator' | 'alvo' | 'orgao' | 'objeto' | 'envolvido' | 'mencionado'

export type TipoAresta = 'controla' | 'fornece' | 'licencia' | 'montante_de' | 'opera_em' | 'pertence_a' | 'concorre_com' | 'regula'

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json }

export interface Entidade {
  id?: string
  tipo: TipoEntidade
  nome: string
  /** Identificadores de cada fonte: { cnpj, ibge, anm_processo, gdelt_ator, ... }. */
  identificadores?: Record<string, Json>
  /** Identificador principal dentro do tipo; é por ele que a ingestão reencontra a entidade. */
  chave_natural: string
  atributos?: Record<string, Json>
  fonte: string
  conteudo_hash?: string
}

export interface Lugar {
  id?: string
  tipo: TipoLugar
  nome: string
  uf?: string | null
  codigo_ibge?: string | null
  pai_id?: string | null
  latitude?: number | null
  longitude?: number | null
  /** Desenho exato, em GeoJSON. */
  geometria?: Record<string, Json> | null
  lat_min?: number | null
  lat_max?: number | null
  lon_min?: number | null
  lon_max?: number | null
  identificadores?: Record<string, Json>
  fonte: string
  conteudo_hash?: string
}

export interface Evento {
  id?: string
  tipo: string
  subtipo?: string | null
  titulo?: string | null
  /** Quando aconteceu no mundo (ISO 8601 com fuso). */
  ocorrido_em: string
  /** Quando a informação chegou até nós (ISO 8601 com fuso). */
  observado_em: string
  lugar_id?: string | null
  latitude?: number | null
  longitude?: number | null
  /** 0 a 1, quando a fonte permite estimar. */
  confianca?: number | null
  /** -10 a 10; o "tone" do GDELT cabe aqui. */
  tom?: number | null
  valor?: number | null
  unidade?: string | null
  /** A carga como veio da fonte, para reprocessar sem recoletar. */
  bruto?: Record<string, Json>
  fonte: string
  conteudo_hash?: string
}

export interface Aresta {
  id?: string
  origem_id: string
  destino_id: string
  tipo: TipoAresta
  peso?: number | null
  valido_de: string
  /** Nulo significa "ainda vale". */
  valido_ate?: string | null
  atributos?: Record<string, Json>
  fonte: string
  conteudo_hash?: string
}

export interface EventoEntidade { evento_id: string; entidade_id: string; papel: PapelEntidade }

// --- Hash de conteúdo ------------------------------------------------------

/** JSON com as chaves em ordem, para o mesmo objeto dar sempre o mesmo texto. */
export function jsonCanonico(v: Json | undefined): string {
  if (v === undefined) return ''
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return '[' + v.map(jsonCanonico).join(',') + ']'
  const chaves = Object.keys(v).sort()
  return '{' + chaves.map(k => JSON.stringify(k) + ':' + jsonCanonico(v[k])).join(',') + '}'
}

const texto = (v: unknown): string => {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (v instanceof Date) return v.toISOString()
  return jsonCanonico(v as Json)
}

/**
 * Forma canônica dos campos: "chave=valor" por linha, ordenado pela chave.
 * Mesma receita da função instituto.ontologia_hash no banco, para os dois hashes baterem.
 * Nulo e ausente entram como texto vazio; objeto entra na sua forma canônica (jsonCanonico,
 * igual a instituto.json_canonico). Número fracionário vindo de fonte deve entrar como texto,
 * porque Postgres e JavaScript não escrevem decimais do mesmo jeito.
 */
export function canonizar(campos: Record<string, unknown>): string {
  return Object.keys(campos).sort().map(k => `${k}=${texto(campos[k])}`).join('\n')
}

/** SHA-256 em hexadecimal da forma canônica. Mesma entrada, mesmo hash, sempre. */
export async function hashConteudo(campos: Record<string, unknown>): Promise<string> {
  const bytes = new TextEncoder().encode(canonizar(campos))
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource)
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Campos que entram no hash de cada tabela. Nunca o id da linha nem a hora em que ela
 * foi gravada: o hash é do conteúdo, para a mesma coleta repetida dar o mesmo hash.
 */
export const camposHash = {
  entidade: (e: Entidade) => ({ tipo: e.tipo, nome: e.nome, chave_natural: e.chave_natural, identificadores: e.identificadores ?? {}, atributos: e.atributos ?? {}, fonte: e.fonte }),
  lugar: (l: Lugar) => ({ tipo: l.tipo, nome: l.nome, uf: l.uf ?? null, codigo_ibge: l.codigo_ibge ?? null, latitude: l.latitude ?? null, longitude: l.longitude ?? null, geometria: l.geometria ?? null, identificadores: l.identificadores ?? {}, fonte: l.fonte }),
  evento: (v: Evento) => ({ tipo: v.tipo, subtipo: v.subtipo ?? null, titulo: v.titulo ?? null, ocorrido_em: v.ocorrido_em, lugar_id: v.lugar_id ?? null, latitude: v.latitude ?? null, longitude: v.longitude ?? null, valor: v.valor ?? null, unidade: v.unidade ?? null, bruto: v.bruto ?? {}, fonte: v.fonte }),
  aresta: (a: Aresta) => ({ origem_id: a.origem_id, destino_id: a.destino_id, tipo: a.tipo, peso: a.peso ?? null, valido_de: a.valido_de, valido_ate: a.valido_ate ?? null, atributos: a.atributos ?? {}, fonte: a.fonte }),
}

/**
 * `observado_em` menos `ocorrido_em`, em horas. É o atraso da informação.
 * Pode ser negativo quando a fonte noticia hoje algo marcado para depois.
 */
export const atrasoHoras = (e: Pick<Evento, 'ocorrido_em' | 'observado_em'>): number =>
  (new Date(e.observado_em).getTime() - new Date(e.ocorrido_em).getTime()) / 3600000

// --- Gravação e leitura ----------------------------------------------------

/** O pouco que usamos do cliente Supabase, escrito aqui para o módulo não depender de tipos gerados. */
interface Consulta<T> extends PromiseLike<{ data: T[] | null; error: unknown }> {
  eq(coluna: string, valor: unknown): Consulta<T>
  gte(coluna: string, valor: unknown): Consulta<T>
  lte(coluna: string, valor: unknown): Consulta<T>
  or(filtro: string): Consulta<T>
  order(coluna: string, opcoes?: { ascending?: boolean }): Consulta<T>
}
interface Tabela<T> {
  insert(linhas: unknown): Consulta<T> & { select(): Consulta<T> }
  select(colunas?: string): Consulta<T>
}

function tabela<T>(nome: string): Tabela<T> {
  const cliente = supabase as unknown as { schema?: (s: string) => { from: (t: string) => Tabela<T> }; from: (t: string) => Tabela<T> }
  return typeof cliente.schema === 'function' ? cliente.schema(ESQUEMA).from(nome) : cliente.from(nome)
}

function erro(r: { error: unknown }): void {
  if (!r.error) return
  throw r.error instanceof Error ? r.error : new Error(String((r.error as { message?: string })?.message ?? r.error))
}

async function inserirUm<T extends object>(nome: string, linha: T): Promise<T> {
  const r = await tabela<T>(nome).insert(linha).select()
  erro(r)
  return (r.data ?? [])[0] ?? linha
}

/** Grava a entidade com o hash do próprio conteúdo. */
export async function inserirEntidade(e: Entidade): Promise<Entidade> {
  return inserirUm('entidades', { ...e, identificadores: e.identificadores ?? {}, atributos: e.atributos ?? {}, conteudo_hash: await hashConteudo(camposHash.entidade(e)) })
}

/** Grava o lugar com o hash do próprio conteúdo. */
export async function inserirLugar(l: Lugar): Promise<Lugar> {
  return inserirUm('lugares', { ...l, identificadores: l.identificadores ?? {}, conteudo_hash: await hashConteudo(camposHash.lugar(l)) })
}

/** Grava a aresta com o hash do próprio conteúdo. */
export async function inserirAresta(a: Aresta): Promise<Aresta> {
  return inserirUm('arestas', { ...a, atributos: a.atributos ?? {}, conteudo_hash: await hashConteudo(camposHash.aresta(a)) })
}

/**
 * Grava o evento e, se houver, quem participou dele e em que papel.
 * `ocorrido_em` e `observado_em` entram como vieram, sem serem igualadas.
 */
export async function inserirEvento(v: Evento, participantes: { entidade_id: string; papel?: PapelEntidade }[] = []): Promise<Evento> {
  const gravado = await inserirUm('eventos', { ...v, bruto: v.bruto ?? {}, conteudo_hash: await hashConteudo(camposHash.evento(v)) })
  if (gravado.id && participantes.length) {
    const r = await tabela<EventoEntidade>('evento_entidades')
      .insert(participantes.map(p => ({ evento_id: gravado.id, entidade_id: p.entidade_id, papel: p.papel ?? 'envolvido' })))
    erro(r)
  }
  return gravado
}

function lista<T>(r: { data: T[] | null; error: unknown }): T[] { erro(r); return r.data ?? [] }

/** Eventos de um lugar numa janela de tempo, pelo que aconteceu (índice eventos_lugar_tempo_idx). */
export async function eventosPorLugar(lugarId: string, de: string, ate: string): Promise<Evento[]> {
  return lista(await tabela<Evento>('eventos').select('*')
    .eq('lugar_id', lugarId).gte('ocorrido_em', de).lte('ocorrido_em', ate)
    .order('ocorrido_em', { ascending: false }))
}

/** Eventos em que uma entidade aparece (índice evento_entidades_entidade_idx). */
export async function eventosPorEntidade(entidadeId: string): Promise<Evento[]> {
  const linhas = lista(await tabela<{ papel: PapelEntidade; eventos: Evento | Evento[] | null }>('evento_entidades')
    .select('papel, eventos(*)').eq('entidade_id', entidadeId))
  return linhas.flatMap(l => l.eventos ? ([] as Evento[]).concat(l.eventos) : [])
}

/** Arestas de uma entidade vigentes numa data, por qualquer das duas pontas. */
export async function arestasDaEntidade(entidadeId: string, em: string = new Date().toISOString()): Promise<Aresta[]> {
  const linhas = lista(await tabela<Aresta>('arestas').select('*')
    .or(`origem_id.eq.${entidadeId},destino_id.eq.${entidadeId}`))
  return linhas.filter(a => a.valido_de <= em && (!a.valido_ate || a.valido_ate > em))
}

/** Sem Supabase configurado a plataforma roda com dados fictícios; a ontologia não grava nada. */
export const podeGravar = () => supabaseConfigurado
