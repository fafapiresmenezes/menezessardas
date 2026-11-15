/**
 * Meu jeito de trabalhar (pedido de M, 12/11/2026): cada pessoa ajusta a plataforma ao seu modo de operar.
 * Ela escolhe o que aparece no próprio menu e em que ordem, as matérias do direito que usa e o tamanho da letra.
 * Fica guardado na conta da pessoa (preferencias_usuario.uso.jeito), para valer em qualquer aparelho, e também
 * no aparelho, para abrir na hora. Se a conta não puder gravar, vale só neste aparelho e a tela diz isso.
 */
import { supabase, supabaseConfigurado } from './supabase'

export type Letra = 'normal' | 'grande' | 'maior'
export interface MeuJeito { atalhos?: string[]; materias?: string[]; letra?: Letra }

const CHAVE = 'theye-meu-jeito'
export const EVENTO_JEITO = 'theye-meu-jeito'
export const LETRAS: { valor: Letra; rotulo: string; dica: string }[] = [
  { valor: 'normal', rotulo: 'Normal', dica: 'O tamanho de letra padrão da plataforma' },
  { valor: 'grande', rotulo: 'Grande', dica: 'Letras e botões um pouco maiores em todas as telas' },
  { valor: 'maior', rotulo: 'Muito grande', dica: 'Letras e botões bem maiores, para ler sem esforço' },
]

const lista = (bruto: unknown, formato: RegExp, maximo: number): string[] | undefined => {
  if (!Array.isArray(bruto)) return undefined
  const saida: string[] = []
  for (const x of bruto) if (typeof x === 'string' && formato.test(x) && !saida.includes(x) && saida.length < maximo) saida.push(x)
  return saida.length ? saida : undefined
}

/** Só passa o que tem formato conhecido: o que vier estranho da conta ou do aparelho é ignorado. */
export function limparJeito(bruto: unknown): MeuJeito {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return {}
  const b = bruto as Record<string, unknown>
  const saida: MeuJeito = {}
  const atalhos = lista(b.atalhos, /^\/[a-z0-9/_-]{1,60}$/, 14)
  const materias = lista(b.materias, /^[a-z_]{2,40}$/, 12)
  if (atalhos) saida.atalhos = atalhos
  if (materias) saida.materias = materias
  if (b.letra === 'grande' || b.letra === 'maior') saida.letra = b.letra
  return saida
}

export function lerMeuJeito(): MeuJeito {
  try { return limparJeito(JSON.parse(localStorage.getItem(CHAVE) || '{}')) } catch { return {} }
}

/** A letra maior vale para a plataforma inteira: o tamanho base da página cresce e tudo acompanha. */
export function aplicarLetra(letra?: Letra): void {
  if (typeof document === 'undefined') return
  if (letra === 'grande' || letra === 'maior') document.documentElement.setAttribute('data-letra', letra)
  else document.documentElement.removeAttribute('data-letra')
}

function guardar(j: MeuJeito): void {
  try { localStorage.setItem(CHAVE, JSON.stringify(j)) } catch { /* sem armazenamento */ }
  aplicarLetra(j.letra)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_JEITO))
}

const objeto = (x: unknown): Record<string, unknown> => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : {})

/** Busca o jeito guardado na conta (vale o da conta, quando existe) e deixa pronto no aparelho. */
export async function carregarMeuJeito(): Promise<MeuJeito> {
  if (!supabaseConfigurado) return lerMeuJeito()
  try {
    const { data, error } = await supabase.from('preferencias_usuario').select('uso').maybeSingle()
    const naConta = objeto(data?.uso).jeito
    if (!error && naConta && typeof naConta === 'object') guardar(limparJeito(naConta))
  } catch { /* fica o do aparelho */ }
  return lerMeuJeito()
}

/** Grava o jeito da pessoa. Devolve onde ficou guardado: na conta (todo aparelho) ou só neste aparelho. */
export async function gravarMeuJeito(j: MeuJeito): Promise<'conta' | 'aparelho'> {
  const limpo = limparJeito(j)
  guardar(limpo)
  if (!supabaseConfigurado) return 'aparelho'
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'aparelho'
    const { data } = await supabase.from('preferencias_usuario').select('uso').maybeSingle()
    const { error } = await supabase.from('preferencias_usuario').upsert({ usuario_id: user.id, uso: { ...objeto(data?.uso), jeito: limpo }, atualizado_em: new Date().toISOString() })
    return error ? 'aparelho' : 'conta'
  } catch { return 'aparelho' }
}

/** Ao sair, o aparelho esquece o jeito de quem saiu: a próxima pessoa não herda o menu de ninguém. */
export function esquecerMeuJeito(): void {
  try { localStorage.removeItem(CHAVE) } catch { /* sem armazenamento */ }
  aplicarLetra()
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_JEITO))
}
