// @vitest-environment jsdom
// Passo D22: a marca do parceiro substitui o lockup Theye Suporte Jurídico quando há white-label.
import { describe, it, expect } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import Marca from './Marca'

describe('Marca (white-label)', () => {
  it('sem marca: lockup THEYE Institute; com marca sem logo: nome; com logo: imagem com alt', () => {
    render(<Marca />)
    expect(screen.getByTestId('marca-theye').textContent).toContain('Theye.club'); expect(screen.getByTestId('marca-theye').textContent).toContain('Ontologia'); expect(screen.queryByTestId('marca-parceiro')).toBeNull()
    // M (21/11/2026): "Suporte Jurídico" só aparece onde a tela é do nicho jurídico e o pede.
    expect(screen.getByTestId('marca-theye').textContent).not.toContain('Jurídico')
    cleanup()
    render(<Marca subtitulo="Suporte Jurídico" />)
    expect(screen.getByTestId('marca-theye').textContent).toContain('Suporte Jurídico')
    cleanup()
    render(<Marca marca={{ nome: 'Alfa Advocacia', cor: '#AA0000', logo_url: null, sede: false }} />)
    expect(screen.getByTestId('marca-parceiro').textContent).toContain('Alfa Advocacia')
    expect(screen.getByText('Theye.club')).toBeTruthy()
    cleanup()
    render(<Marca tamanho="grande" marca={{ nome: 'Beta', cor: '#AA0000', logo_url: 'https://b/logo.png', sede: false }} />)
    expect((screen.getByAltText('Beta') as HTMLImageElement).src).toBe('https://b/logo.png')
  })

  // Pedido de M (14/11/2026): a logo do olho tinha sumido. Este teste prende que ela está nos dois
  // lockups próprios do Instituto (THEYE e Instituto THEYE), para nunca mais sumir sem alguém ver.
  it('mostra a logo do olho no lockup da plataforma e no do Instituto', () => {
    render(<Marca />)
    expect(screen.getByTestId('marca-theye').querySelector('[data-testid="marca-olho"]')).toBeTruthy()
    cleanup()
    render(<Marca tipo="instituto" />)
    expect(screen.getByTestId('marca-instituto').querySelector('[data-testid="marca-olho"]')).toBeTruthy()
  })
})
