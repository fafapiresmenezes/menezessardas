// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import EngenhariaInternacional from './EngenhariaInternacional'

describe('aba Mundo da engenharia', () => {
  afterEach(cleanup)
  it('mostra a mesma viga nas três normas, com material e custo', () => {
    render(<EngenhariaInternacional />)
    const t = screen.getByTestId('tabela-tres-normas').textContent ?? ''
    expect(t).toContain('NBR 6118'); expect(t).toContain('Eurocódigo 2'); expect(t).toContain('ACI 318-19')
    expect(t).toContain('CAPEX'); expect(t).toContain('126,00') // NBR: 1,4·20·36/8
  })
  it('troca de país e mostra as normas de Angola ao lado das do Brasil', () => {
    render(<EngenhariaInternacional />)
    fireEvent.click(screen.getByRole('tab', { name: 'Normas por país' }))
    const t = screen.getByTestId('tabela-normas-pais').textContent ?? ''
    expect(t).toContain('Lei 41/20'); expect(t).toContain('NBR 6118')
  })
  it('lista os 500 agentes e filtra por trabalho', () => {
    render(<EngenhariaInternacional />)
    fireEvent.click(screen.getByRole('tab', { name: '500 agentes de produção' }))
    expect(screen.getByTestId('total-agentes-500').textContent).toBe('500 agentes')
    fireEvent.change(screen.getByLabelText('Trabalho'), { target: { value: 'projeto-detalhado' } })
    expect(screen.getByTestId('total-agentes-500').textContent).toBe('25 agentes')
  })
})
