// M (21/11/2026): a entrada jurídica fica SÓ no nicho jurídico. Quem é de outro quadradinho
// nunca é mandado para o Início jurídico nem para a entrada jurídica.
import { describe, it, expect, beforeEach } from 'vitest'
import { casaDaPessoa, entradaDaPessoa, lembrarUltimaFrente, esquecerUltimaFrente } from './destino'

describe('casa de quem já entrou', () => {
  beforeEach(() => esquecerUltimaFrente())

  it('o quadradinho pedido no link vale primeiro', () => {
    expect(casaDaPessoa('/engenharia')).toBe('/engenharia')
    expect(entradaDaPessoa('/engenharia')).toBe('/login?ir=%2Fengenharia')
  })

  it('sem pedido, vale o último quadradinho usado neste aparelho', () => {
    lembrarUltimaFrente('/aguas')
    expect(casaDaPessoa()).toBe('/aguas')
    expect(entradaDaPessoa()).toBe('/login?ir=%2Faguas')
  })

  it('pedido inventado ou da administração não vira casa', () => {
    lembrarUltimaFrente('/saude')
    expect(casaDaPessoa('/qualquer-coisa')).toBe('/saude')
    expect(casaDaPessoa('/gestao-instituto')).toBe('/saude')
  })

  it('sem nada lembrado, a entrada é a vitrine geral, nunca a jurídica', () => {
    expect(entradaDaPessoa()).toBe('/login')
    expect(entradaDaPessoa(null)).not.toContain('inicio')
  })
})
