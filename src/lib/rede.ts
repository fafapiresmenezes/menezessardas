// Passo 63: chamadas ao Supabase e às funções repetem sozinhas quando a rede falha
// (até 3 tentativas, espera crescente 0,5 s → 1 s → 2 s). Só GET/HEAD e falhas de rede ou 502/503/504
// são repetidas, para nunca gravar duas vezes.
export const esperas = [500, 1000, 2000]

export function deveRepetir(metodo: string, status: number | null): boolean {
  const leitura = /^(GET|HEAD)$/i.test(metodo || 'GET')
  if (status === null) return leitura
  return leitura && [502, 503, 504].includes(status)
}

type Fetch = typeof fetch
export function fetchComRepeticao(base: Fetch = fetch, dormir = (ms: number) => new Promise(r => setTimeout(r, ms))): Fetch {
  return async (input, init) => {
    const metodo = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    for (let tentativa = 0; ; tentativa++) {
      try {
        const r = await base(input, init)
        if (tentativa < esperas.length && deveRepetir(metodo, r.status)) { await dormir(esperas[tentativa]); continue }
        avisarRede(true)
        return r
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') throw e
        if (tentativa < esperas.length && deveRepetir(metodo, null)) { await dormir(esperas[tentativa]); continue }
        avisarRede(false)
        throw e
      }
    }
  }
}

// Estado da rede visto pelas chamadas (além do navigator.onLine), para a faixa "Sem conexão".
const ouvintes = new Set<(ok: boolean) => void>()
let ultimo = true
export function avisarRede(ok: boolean) { if (ok !== ultimo) { ultimo = ok; ouvintes.forEach(f => f(ok)) } }
export function ouvirRede(f: (ok: boolean) => void) { ouvintes.add(f); return () => { ouvintes.delete(f) } }
