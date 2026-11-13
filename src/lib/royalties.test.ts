import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import {
  PERCENTUAL, parteDoInstituto, parteDoEscritorio, podeEntregar, porQueTravado,
  type Venda, type Repasse,
} from './royalties'

/**
 * O que estes testes prendem: que o percentual é 5%, que venda de processo não paga nada, que a
 * soma das duas partes dá exatamente o total (centavo não some), e que a entrega fica travada até
 * o Instituto confirmar — inclusive quando o pagamento foi em dinheiro.
 * O que eles NÃO conferem: o gatilho e a trava dentro do banco, que são da migração 132. Por isso
 * o último teste lê o arquivo da migração e exige que a trava esteja lá, e não só na tela: filtro
 * só no navegador não é trava.
 */
const venda = (v: Partial<Venda> = {}): Venda => ({
  id: 'v1', descricao: 'Estudo de viabilidade', tipo: 'estudo', processual: false,
  valor_total: 10000, moeda: 'BRL', forma_pagamento: 'pix',
  recebido_em: null, entregue_em: null, ...v,
})
const repasse = (r: Partial<Repasse> = {}): Repasse => ({
  id: 'r1', venda_id: 'v1', percentual: 0.05, valor: 500, status: 'pendente',
  confirmado_em: null, ...r,
})

describe('royalties do Instituto', () => {
  it('são 5%, e só sobre o que não é processo', () => {
    expect(PERCENTUAL).toBe(0.05)
    expect(parteDoInstituto(10000, false)).toBe(500)
    expect(parteDoInstituto(10000, true)).toBe(0)
    expect(parteDoInstituto(0, false)).toBe(0)
  })

  it('as duas partes somam o total, sem centavo perdido', () => {
    for (const total of [1, 33.33, 99.99, 1234.56, 10000, 7777.77]) {
      const soma = parteDoInstituto(total, false) + parteDoEscritorio(total, false)
      expect(Math.abs(soma - total)).toBeLessThan(0.005)
    }
  })

  it('a entrega fica travada até o Instituto confirmar, inclusive em dinheiro', () => {
    const emDinheiro = venda({ forma_pagamento: 'dinheiro' })
    expect(podeEntregar(emDinheiro, null)).toBe(false)
    expect(podeEntregar(emDinheiro, repasse({ status: 'pendente' }))).toBe(false)
    expect(podeEntregar(emDinheiro, repasse({ status: 'enviado' }))).toBe(false)
    expect(podeEntregar(emDinheiro, repasse({ status: 'confirmado' }))).toBe(true)
    expect(porQueTravado(emDinheiro, repasse({ status: 'enviado' }))).toMatch(/ainda não confirmou/i)
  })

  it('venda de processo não trava nada', () => {
    expect(podeEntregar(venda({ processual: true }), null)).toBe(true)
    expect(porQueTravado(venda({ processual: true }), null)).toBe('')
  })

  it('a trava e a divisão também estão no banco, não só na tela', () => {
    const sql = readFileSync('database/migrations/132_royalties_instituto.sql', 'utf8')
    expect(sql).toMatch(/create trigger vendas_servico_divide/i)
    expect(sql).toMatch(/create trigger vendas_servico_trava/i)
    expect(sql).toMatch(/0\.0500/)
    expect(sql).toMatch(/venda_liberada/)
  })
})
