/** Situação da conexão da plataforma com o CNJ, a partir do registro que a função "intimacoes" grava a cada consulta. */
export interface RegistroCnj { em: string; ok: boolean; novas?: number; falhas?: string[]; origem?: string }
export type SituacaoCnj = 'ok' | 'atrasada' | 'falha' | 'sem_dados'

/** Robô a cada 4 h: até 6 h é normal; até 24 h é atraso; além disso (ou com falha) precisa de atenção. */
export function situacaoCnj(valor: string | null | undefined, agora: Date = new Date()): { situacao: SituacaoCnj; texto: string; horas: number | null; registro: RegistroCnj | null } {
  let r: RegistroCnj | null = null
  try { const x = JSON.parse(String(valor ?? '')); if (x && typeof x.em === 'string' && !Number.isNaN(Date.parse(x.em))) r = x } catch { /* sem registro */ }
  if (!r) return { situacao: 'sem_dados', texto: 'Ainda não há registro de consulta ao CNJ. Clique em "Buscar agora" ou "Testar conexão".', horas: null, registro: null }
  const horas = Math.max(0, (agora.getTime() - Date.parse(r.em)) / 3600000)
  const quando = horas < 1 ? 'há menos de 1 hora' : horas < 48 ? `há ${Math.round(horas)} hora(s)` : `há ${Math.round(horas / 24)} dia(s)`
  if (!r.ok) return { situacao: 'falha', texto: `A última consulta ao CNJ (${quando}) falhou${r.falhas?.length ? `: ${r.falhas.join('; ')}` : ''}. Ela é repetida sozinha a cada 4 horas.`, horas, registro: r }
  if (horas > 24) return { situacao: 'falha', texto: `Sem consulta ao CNJ ${quando}. O robô automático parece parado: avise o administrador técnico.`, horas, registro: r }
  if (horas > 6) return { situacao: 'atrasada', texto: `Última consulta ao CNJ ${quando}, mais antiga que o normal (a cada 4 horas).`, horas, registro: r }
  return { situacao: 'ok', texto: `Conectado ao CNJ. Última consulta ${quando}${r.origem === 'automatica' ? ' (automática)' : ''}.`, horas, registro: r }
}
