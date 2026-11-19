/** Data de referência dos dados de exemplo da casa de fundos: os prazos e "dias até" contam-se a partir dela.
 * Fica visível nos ecrãs para ninguém ler um número envelhecido como se fosse de hoje. */
export const DATA_REFERENCIA = '2026-11-18'
export const DATA_REFERENCIA_LEGIVEL = '18/11/2026'
export const diasAte = (s: string) => Math.round((new Date(s + 'T00:00:00').getTime() - new Date(DATA_REFERENCIA + 'T00:00:00').getTime()) / 86400000)
