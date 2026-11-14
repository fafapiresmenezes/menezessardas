import { supabase } from '@/lib/supabase'

/**
 * Contagem de visitas da porta (passo V10), sem identificar ninguém.
 *
 * A tela dispara e esquece: manda só o tipo e, quando for o caso, a chave (código da língua ou id da
 * frente). Nunca trava a porta — se não houver rede, a visita só não é contada. Quem soma é a função
 * de servidor `contar-visita`, e o banco guarda apenas contadores por dia (ver migração 140).
 */
export type TipoVisita = 'visita' | 'idioma' | 'quadradinho'

export function contarVisita(tipo: TipoVisita, chave = ''): void {
  try {
    void supabase.functions.invoke('contar-visita', { body: { tipo, chave } }).catch(() => {})
  } catch {
    /* sem rede, a porta segue igual */
  }
}

export interface LinhaVisita {
  dia: string
  tipo: TipoVisita
  chave: string
  n: number
}

/** Administração do Instituto: lê os contadores dos últimos dias. */
export async function listarVisitas(dias = 30): Promise<LinhaVisita[]> {
  const { data, error } = await supabase.rpc('visitas_porta_listar', { p_dias: dias })
  if (error) throw error
  return (data ?? []) as LinhaVisita[]
}
