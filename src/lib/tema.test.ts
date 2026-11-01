import { describe, it, expect } from 'vitest'

// Documento e armazenamento mínimos para o módulo de tema.
const classes = new Set<string>()
const mem = new Map<string, string>()
;(globalThis as { document?: unknown }).document = {
  documentElement: { classList: {
    contains: (c: string) => classes.has(c),
    toggle: (c: string, on: boolean) => { on ? classes.add(c) : classes.delete(c) },
  } },
}
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v) },
  removeItem: (k: string) => { mem.delete(k) },
}
const { temaAtual, aplicarTema } = await import('./tema')

describe('tema claro/escuro', () => {
  it('começa claro e alterna pela classe dark, lembrando a escolha', () => {
    expect(temaAtual()).toBe('claro')
    aplicarTema('escuro')
    expect(temaAtual()).toBe('escuro')
    expect(mem.get('lsm-tema')).toBe('escuro')
    aplicarTema('claro')
    expect(temaAtual()).toBe('claro')
    expect(mem.get('lsm-tema')).toBe('claro')
  })

  it('não quebra quando o armazenamento recusa gravar', () => {
    ;(globalThis as { localStorage: { setItem: unknown } }).localStorage.setItem = () => { throw new Error('privado') }
    expect(() => aplicarTema('escuro')).not.toThrow()
    expect(temaAtual()).toBe('escuro')
  })
})
