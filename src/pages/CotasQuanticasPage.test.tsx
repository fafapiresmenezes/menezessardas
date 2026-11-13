// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CotasQuanticasPage from './CotasQuanticasPage'
import { PLANOS, RECARGAS, precoFinalUSD, ACRESCIMO, FONTE_PRECO, CONSULTADO_EM } from '@/data/cotas-quanticas'

/**
 * O que estes testes prendem: que o acréscimo é exatamente 30% sobre o preço da IBM, que todo
 * preço mostrado carrega fonte e data, e que a lista do que a máquina NÃO faz continua na tela.
 * O que eles NÃO conferem: se o preço da IBM continua o mesmo hoje — isso é consulta à internet,
 * e por isso a tela mostra a data da consulta em vez de fingir que o número é de agora.
 */
afterEach(cleanup)

describe('cotas de computação quântica', () => {
  it('o acréscimo é 40% e nada mais', () => {
    expect(ACRESCIMO).toBe(0.4)
    expect(precoFinalUSD(96)).toBe(134.4)
    expect(precoFinalUSD(72)).toBe(100.8)
    expect(precoFinalUSD(48)).toBe(67.2)
  })

  it('todo plano pago tem preço positivo e mínimo escrito', () => {
    const pagos = PLANOS.filter(p => p.custoMinutoUSD !== null)
    expect(pagos.length).toBeGreaterThanOrEqual(3)
    for (const p of pagos) {
      expect(p.custoMinutoUSD).toBeGreaterThan(0)
      expect(p.minimo.length).toBeGreaterThan(0)
      expect(p.paraQueServe.length).toBeGreaterThan(20)
    }
  })

  it('a tela mostra a fonte, a data da consulta e os dois preços', () => {
    render(<MemoryRouter><CotasQuanticasPage /></MemoryRouter>)
    expect(document.body.textContent).toContain(CONSULTADO_EM)
    expect(document.querySelector(`a[href="${FONTE_PRECO}"]`)).toBeTruthy()
    expect(screen.getByText('US$ 96,00')).toBeTruthy()
    expect(screen.getByText('US$ 134,40')).toBeTruthy()
  })

  it('toda recarga diz para que serve, o que acontece se acabar e como é medida', () => {
    expect(RECARGAS.length).toBeGreaterThanOrEqual(7)
    for (const r of RECARGAS) {
      expect(r.paraQueServe.length).toBeGreaterThan(40)
      expect(r.seAcabar.length).toBeGreaterThan(20)
      expect(r.comoEMedido.length).toBeGreaterThan(10)
      expect(r.fornecedor.length).toBeGreaterThan(2)
    }
  })

  it('a tela lista todas as recargas e diz que o acréscimo vale para todas', () => {
    render(<MemoryRouter><CotasQuanticasPage /></MemoryRouter>)
    for (const r of RECARGAS) expect(screen.getByText(r.nome)).toBeTruthy()
    expect(document.body.textContent).toMatch(/mesmo acréscimo de\s*40% sobre o custo do fornecedor/i)
  })

  it('a tela diz o que a máquina quântica não faz melhor', () => {
    render(<MemoryRouter><CotasQuanticasPage /></MemoryRouter>)
    expect(screen.getByText(/não faz/i)).toBeTruthy()
    expect(screen.getByText(/não quebra a criptografia/i)).toBeTruthy()
  })
})
