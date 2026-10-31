import { describe, expect, it } from 'vitest'
import { mensagemAmigavel } from '@/lib/erros'

describe('mensagens de erro em português simples', () => {
  it('traduz os erros técnicos mais comuns', () => {
    expect(mensagemAmigavel(new Error('TypeError: Failed to fetch'))).toMatch(/Sem conexão/)
    expect(mensagemAmigavel({ message: 'JWT expired' })).toMatch(/sessão expirou/)
    expect(mensagemAmigavel('new row violates row-level security policy')).toMatch(/permissão/)
    expect(mensagemAmigavel('duplicate key value violates unique constraint')).toMatch(/Já existe/)
    expect(mensagemAmigavel('Invalid login credentials')).toBe('E-mail ou senha incorretos.')
  })
  it('mantém mensagens já amigáveis e embrulha o resto', () => {
    expect(mensagemAmigavel('Falta o número do processo.')).toBe('Falta o número do processo.')
    expect(mensagemAmigavel('relation "x" does not exist')).toMatch(/^Não foi possível concluir.*detalhe técnico/)
    expect(mensagemAmigavel(null)).toBe('Não foi possível concluir. Tente de novo.')
  })
})
