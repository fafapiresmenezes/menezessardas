import { describe, it, expect } from 'vitest'
import { fetchComRepeticao, deveRepetir } from './rede'

describe('repetição de rede', () => {
  it('só repete leitura', () => {
    expect(deveRepetir('GET', null)).toBe(true)
    expect(deveRepetir('POST', null)).toBe(false)
    expect(deveRepetir('GET', 503)).toBe(true)
    expect(deveRepetir('GET', 400)).toBe(false)
  })
  it('tenta de novo após falha de rede e devolve a resposta', async () => {
    let n = 0
    const base = (async () => { n++; if (n < 3) throw new TypeError('Failed to fetch'); return new Response('ok') }) as typeof fetch
    const r = await fetchComRepeticao(base, async () => {})('https://x', { method: 'GET' })
    expect(await r.text()).toBe('ok'); expect(n).toBe(3)
  })
  it('não repete gravação', async () => {
    let n = 0
    const base = (async () => { n++; throw new TypeError('Failed to fetch') }) as typeof fetch
    await expect(fetchComRepeticao(base, async () => {})('https://x', { method: 'POST' })).rejects.toThrow()
    expect(n).toBe(1)
  })
})
