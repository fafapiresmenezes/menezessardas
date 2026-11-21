import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import FerramentasEngenharia, { FERRAMENTAS_PLANO } from './FerramentasEngenharia'

describe('aba Ferramentas', () => {
  afterEach(cleanup)
  it('mostra as 8 ferramentas do plano, 6 no ar e 2 em desenvolvimento', () => {
    render(<FerramentasEngenharia />)
    expect(FERRAMENTAS_PLANO).toHaveLength(8)
    expect(FERRAMENTAS_PLANO.filter(f => f.estado === 'no ar')).toHaveLength(6)
    expect(screen.getByTestId('ferramentas-mapa').textContent).toContain('em desenvolvimento')
  })

  it('pórtico: o exemplo biapoiado dá reações de 30 kN e a memória abre', () => {
    render(<FerramentasEngenharia />)
    fireEvent.click(screen.getByRole('tab', { name: 'Pórticos e vigas' }))
    const reacoes = screen.getByTestId('fem-reacoes').textContent!
    expect(reacoes).toContain('30,00')
    fireEvent.click(screen.getByText('Ver memória de cálculo'))
    expect(screen.getByTestId('fem-memoria').textContent).toContain('MEMÓRIA DE CÁLCULO')
  })

  it('pórtico: texto inválido mostra erro em vez de quebrar', () => {
    render(<FerramentasEngenharia />)
    fireEvent.click(screen.getByRole('tab', { name: 'Pórticos e vigas' }))
    fireEvent.change(screen.getByTestId('fem-texto'), { target: { value: 'XPTO 1 2' } })
    expect(screen.getByRole('alert').textContent).toContain('desconhecido')
  })

  it('treliça, IFC, conflitos e custo abrem com o exemplo', () => {
    render(<FerramentasEngenharia />)
    fireEvent.click(screen.getByRole('tab', { name: 'Treliça paramétrica' }))
    expect(screen.getByTestId('trelica-lista').textContent).toContain('banzo inferior')
    fireEvent.click(screen.getByRole('tab', { name: 'Arquivo IFC' }))
    expect(screen.getByTestId('ifc-resumo').textContent).toContain('IFC4')
    expect(screen.getByTestId('ifc-problemas').textContent).toContain('não existem')
    fireEvent.click(screen.getByRole('tab', { name: 'Conflitos entre disciplinas' }))
    expect(screen.getByTestId('conflitos-total').textContent).toMatch(/\d+ cruzamento/)
    fireEvent.click(screen.getByRole('tab', { name: 'Estimativa de custo' }))
    expect(screen.getByTestId('custo-resumo').textContent).toContain('Total base')
  })
})
