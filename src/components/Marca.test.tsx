// @vitest-environment jsdom
// Passo D22: a marca do parceiro substitui o lockup Theye Suporte Jurídico quando há white-label.
import { describe, it, expect } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import Marca from './Marca'

describe('Marca (white-label)', () => {
  it('sem marca: lockup THEYE Institute; com marca sem logo: nome; com logo: imagem com alt', () => {
    render(<Marca />)
    expect(screen.getByTestId('marca-theye').textContent).toContain('THEYE Institute'); expect(screen.getByTestId('marca-theye').textContent).toContain('Suporte Jurídico'); expect(screen.queryByTestId('marca-parceiro')).toBeNull()
    cleanup()
    render(<Marca marca={{ nome: 'Alfa Advocacia', cor: '#AA0000', logo_url: null, sede: false }} />)
    expect(screen.getByTestId('marca-parceiro').textContent).toContain('Alfa Advocacia')
    expect(screen.getByText('THEYE Institute')).toBeTruthy()
    cleanup()
    render(<Marca tamanho="grande" marca={{ nome: 'Beta', cor: '#AA0000', logo_url: 'https://b/logo.png', sede: false }} />)
    expect((screen.getByAltText('Beta') as HTMLImageElement).src).toBe('https://b/logo.png')
  })
})
