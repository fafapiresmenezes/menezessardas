import { VERTENTES } from '@/data/vertentes'

/**
 * Para onde a pessoa vai depois de digitar a senha.
 *
 * O quadradinho da porta manda para a entrada com o destino escrito no endereço (`?ir=/engenharia`).
 * Endereço é coisa que qualquer um escreve, então o destino só vale se estiver NESTA lista: sem
 * isso, alguém mandaria um link nosso que, depois da senha, levaria a pessoa para onde ele quisesse.
 */
export const DESTINOS_PERMITIDOS: readonly string[] = [...VERTENTES.map(v => v.rota), '/caderno-de-produtos', '/instituto']

export const DESTINO_PADRAO = '/inicio'

/** O destino pedido, se for um dos permitidos; senão, a tela de início. */
export function destinoSeguro(pedido: string | null | undefined): string {
  return pedido && DESTINOS_PERMITIDOS.includes(pedido) ? pedido : DESTINO_PADRAO
}

/** O endereço da entrada que lembra o destino. */
export function entradaPara(rota: string): string {
  // Todo destino permitido vai escrito no endereço, inclusive a tela de início: é o endereço que
  // faz a entrada virar a entrada DAQUELE segmento. Sem ele o clique caía na mesma tela e parecia
  // que o botão não funcionava (M, 13/11/2026 23:11).
  return DESTINOS_PERMITIDOS.includes(rota) ? `/login?ir=${encodeURIComponent(rota)}` : '/login'
}

/**
 * Motivo para voltar (passo V13): quem entrou por uma frente é recebido, na próxima vez, com
 * "você volta para onde parou". A lembrança fica só no aparelho da pessoa, nunca no banco, e some
 * quando ela escolhe a tela de início.
 */
const CHAVE_ULTIMA = 'theye-ultima-frente'

export function lembrarUltimaFrente(rota: string): void {
  try {
    if (rota !== DESTINO_PADRAO && DESTINOS_PERMITIDOS.includes(rota)) localStorage.setItem(CHAVE_ULTIMA, rota)
  } catch { /* sem localStorage, a pessoa só não é lembrada */ }
}

export function ultimaFrente(): string | null {
  try {
    const v = localStorage.getItem(CHAVE_ULTIMA)
    return v && v !== DESTINO_PADRAO && DESTINOS_PERMITIDOS.includes(v) ? v : null
  } catch { return null }
}

export function esquecerUltimaFrente(): void {
  try { localStorage.removeItem(CHAVE_ULTIMA) } catch { /* nada a esquecer */ }
}
