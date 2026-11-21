import { describe, it, expect, vi } from 'vitest'

vi.stubGlobal('Deno', { env: { get: () => 'x' }, serve: () => undefined })
vi.mock('jsr:@supabase/supabase-js@2', () => ({ createClient: () => ({}) }))
const { corpoDoEmail, emailValido } = await import('./index.ts')

describe('acesso-email', () => {
  it('aceita e-mail bem formado e recusa o resto', () => {
    expect(emailValido('ana@lsm.law')).toBe(true)
    expect(emailValido('ana@@lsm.law')).toBe(false)
    expect(emailValido('sem-arroba')).toBe(false)
  })
  it('o e-mail de senha e o de conta levam o link do theye.club e dizem que vale uma vez', () => {
    const s = corpoDoEmail('senha', 'https://theye.club/?redefinir=1&th=abc')
    expect(s.assunto).toContain('senha')
    expect(s.html).toContain('https://theye.club/?redefinir=1&th=abc')
    expect(s.html).toContain('só funciona uma vez')
    const c = corpoDoEmail('conta', 'https://theye.club/?confirmar=1&th=xyz')
    expect(c.html).toContain('Confirmar e entrar')
    expect(c.html).not.toContain('localhost')
  })
})
