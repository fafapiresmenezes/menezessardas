import { VERTENTES } from '@/data/vertentes'

/**
 * Para onde a pessoa vai depois de digitar a senha.
 *
 * O quadradinho da porta manda para a entrada com o destino escrito no endereço (`?ir=/engenharia`).
 * Endereço é coisa que qualquer um escreve, então o destino só vale se estiver NESTA lista: sem
 * isso, alguém mandaria um link nosso que, depois da senha, levaria a pessoa para onde ele quisesse.
 */
/** A plataforma de gestão do Instituto inteiro, aberta pelo símbolo do ouro (M, 21/11/2026). */
export const ROTA_ADMIN = '/gestao-instituto'

export const DESTINOS_PERMITIDOS: readonly string[] = [...VERTENTES.map(v => v.rota), '/caderno-de-produtos', '/instituto', ROTA_ADMIN]

/** Entrada administrativa: só quem administra o Instituto passa dela. */
export function ehEntradaAdmin(rota: string): boolean {
  return rota === ROTA_ADMIN || rota === '/instituto'
}

// Depois da senha, sem frente escolhida, a pessoa cai na área do Instituto (governança), não no jurídico (M, 19/11/2026).
export const DESTINO_PADRAO = '/instituto'

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

/**
 * A "casa" de quem já entrou e não está pedindo tela nenhuma (M, 21/11/2026: a entrada jurídica
 * fica SÓ no nicho jurídico). Vale, nesta ordem: o quadradinho pedido no endereço (?ir=), o último
 * quadradinho que a pessoa usou neste aparelho e, só sem nenhum dos dois, o Início jurídico — que
 * hoje é a casa dos únicos clientes de fora do Instituto (Sardas e Menezes).
 */
export function casaDaPessoa(pedido?: string | null): string {
  if (pedido && pedido !== DESTINO_PADRAO && DESTINOS_PERMITIDOS.includes(pedido) && !ehEntradaAdmin(pedido)) return pedido
  return ultimaFrente() ?? '/inicio'
}

/** A entrada (e-mail e senha) do quadradinho da pessoa, ou a vitrine geral quando não se sabe qual é. */
export function entradaDaPessoa(pedido?: string | null): string {
  const ok = (r: string | null | undefined) => !!r && r !== DESTINO_PADRAO && DESTINOS_PERMITIDOS.includes(r) && !ehEntradaAdmin(r)
  const rota = ok(pedido) ? pedido! : ultimaFrente()
  return rota && ok(rota) ? entradaPara(rota) : '/login'
}
