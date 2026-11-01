// Passo 424: termos de uso e aviso LGPD — versão e impressão digital; sessão de demonstração.
import { describe, it, expect, beforeEach } from 'vitest'
import { TERMOS_TEXTO, TERMOS_VERSAO, hashTermos } from './termos'
import { CREDENCIAIS_DEMO, entrarDemo, sairDemo, sessaoDemoAtiva } from './authDemo'

describe('termos', () => {
  it('citam a versão, a LGPD e preveem novo aceite a cada versão', () => {
    expect(TERMOS_TEXTO).toContain(TERMOS_VERSAO)
    expect(TERMOS_TEXTO).toMatch(/LGPD|13\.709/)
    expect(TERMOS_TEXTO).toContain('novo aceite')
  })
  it('hash SHA-256 hexadecimal e estável', async () => {
    const h = await hashTermos()
    expect(h).toMatch(/^[0-9a-f]{64}$/)
    expect(await hashTermos()).toBe(h)
  })
})

describe('sessão de demonstração', () => {
  // Ambiente node: um localStorage mínimo em memória, como o do navegador.
  const mem = new Map<string, string>()
  ;(globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => { mem.set(k, v) },
    removeItem: (k: string) => { mem.delete(k) },
  }
  beforeEach(() => sairDemo())
  it('entra só com as credenciais de demonstração (e-mail sem distinção de maiúsculas) e sai limpando a sessão', () => {
    expect(sessaoDemoAtiva()).toBe(false)
    expect(entrarDemo('x@y.com', CREDENCIAIS_DEMO.senha)).toBe(false)
    expect(entrarDemo(CREDENCIAIS_DEMO.email, 'errada')).toBe(false)
    expect(sessaoDemoAtiva()).toBe(false)
    expect(entrarDemo('  ' + CREDENCIAIS_DEMO.email.toUpperCase() + ' ', CREDENCIAIS_DEMO.senha)).toBe(true)
    expect(sessaoDemoAtiva()).toBe(true)
    sairDemo()
    expect(sessaoDemoAtiva()).toBe(false)
  })
})
