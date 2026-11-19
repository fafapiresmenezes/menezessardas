import { describe, it, expect } from 'vitest'
import { problemaDaSenha } from './senha'
import { mensagemAmigavel } from './erros'

describe('regra da senha', () => {
  it('aceita senha com 12 caracteres, maiúscula, minúscula e número', () => {
    expect(problemaDaSenha('Abcdefghijk1')).toBeNull()
  })
  it('diz o que falta, uma coisa de cada vez ou todas juntas', () => {
    expect(problemaDaSenha('Abcdefg1')).toMatch(/12 caracteres \(tem 8\)/)
    expect(problemaDaSenha('abcdefghijklmnop')).toBe('A senha precisa ter uma letra maiúscula e ter um número.')
    expect(problemaDaSenha('ABCDEFGHIJKL1')).toMatch(/minúscula/)
  })
  it('a recusa de senha do servidor não vira "problema do servidor"', () => {
    const m = mensagemAmigavel(new Error('Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789.'))
    expect(m).not.toMatch(/servidor/)
    expect(m).toMatch(/maiúscula/)
    expect(mensagemAmigavel(new Error('Password should be at least 12 characters.'))).toMatch(/12 caracteres/)
    expect(mensagemAmigavel(new Error('New password should be different from the old password.'))).toMatch(/diferente/)
    expect(mensagemAmigavel(new Error('captcha protection: request disallowed (no captcha_token found)'))).toMatch(/robô/)
  })
})
