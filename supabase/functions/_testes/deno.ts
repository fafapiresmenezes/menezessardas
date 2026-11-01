// Apoio dos testes das Edge Functions no vitest (Node): finge o Deno.serve e o fetch.
// A função registra o handler em vez de abrir servidor; o teste chama `handler(new Request(...))`.
import { vi } from 'vitest'

export type Handler = (req: Request) => Promise<Response> | Response

export function fingirDeno(env: Record<string, string> = {}) {
  const caixa: { handler: Handler | null } = { handler: null }
  ;(globalThis as { Deno?: unknown }).Deno = {
    serve: (h: Handler) => { caixa.handler = h },
    env: { get: (k: string) => env[k] },
  }
  return caixa
}

/** Substitui o fetch global por uma função que decide pela URL. */
export function fingirFetch(resolver: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const f = vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => resolver(String(entrada), init))
  ;(globalThis as { fetch: unknown }).fetch = f
  return f
}

export const jsonResp = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } })
