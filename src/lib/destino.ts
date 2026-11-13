import { VERTENTES } from '@/data/vertentes'

/**
 * Para onde a pessoa vai depois de digitar a senha.
 *
 * O quadradinho da porta manda para a entrada com o destino escrito no endereço (`?ir=/engenharia`).
 * Endereço é coisa que qualquer um escreve, então o destino só vale se estiver NESTA lista: sem
 * isso, alguém mandaria um link nosso que, depois da senha, levaria a pessoa para onde ele quisesse.
 */
export const DESTINOS_PERMITIDOS: readonly string[] = [...VERTENTES.map(v => v.rota), '/caderno-de-produtos']

export const DESTINO_PADRAO = '/inicio'

/** O destino pedido, se for um dos permitidos; senão, a tela de início. */
export function destinoSeguro(pedido: string | null | undefined): string {
  return pedido && DESTINOS_PERMITIDOS.includes(pedido) ? pedido : DESTINO_PADRAO
}

/** O endereço da entrada que lembra o destino. */
export function entradaPara(rota: string): string {
  return DESTINOS_PERMITIDOS.includes(rota) && rota !== DESTINO_PADRAO ? `/login?ir=${encodeURIComponent(rota)}` : '/login'
}
