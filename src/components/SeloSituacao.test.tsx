// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SeloSituacao from './SeloSituacao'

describe('SeloSituacao', () => {
  it('escreve a situação em texto, nunca só por cor (WCAG 1.4.1)', () => {
    render(<SeloSituacao situacao="vencido" />)
    const selo = screen.getByText('Vencido')
    expect(selo.className).toContain('text-critico')
  })

  it('aceita texto próprio e muda a cor conforme a situação', () => {
    const { rerender } = render(<SeloSituacao situacao="regular" texto="Em dia" />)
    expect(screen.getByText('Em dia').className).toContain('text-regular')
    rerender(<SeloSituacao situacao="atencao" texto="Em dia" />)
    expect(screen.getByText('Em dia').className).toContain('text-atencao')
  })
})
