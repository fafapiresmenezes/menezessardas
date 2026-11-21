import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import FerramentasEngenharia, { FERRAMENTAS_PLANO } from './FerramentasEngenharia'

describe('aba Ferramentas', () => {
  afterEach(cleanup)
  it('mostra as 8 ferramentas do plano, todas no ar', () => {
    render(<FerramentasEngenharia />)
    expect(FERRAMENTAS_PLANO).toHaveLength(8)
    expect(FERRAMENTAS_PLANO.filter(f => f.estado === 'no ar')).toHaveLength(8)
    expect(FERRAMENTAS_PLANO.every(f => f.sub)).toBe(true)
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

  it('inspeção: cria, marca itens, exige descrição da NC e guarda no aparelho', () => {
    localStorage.clear()
    render(<FerramentasEngenharia />)
    fireEvent.click(screen.getByRole('tab', { name: 'Inspeção de obra' }))
    fireEvent.click(screen.getByText('Começar inspeção'))
    const radios = screen.getAllByRole('radio', { name: 'Não conforme' })
    fireEvent.click(radios[0])
    expect(screen.getByTestId('inspecao-resumo').textContent).toContain('1 NC')
    expect((screen.getByText('Fechar inspeção') as HTMLButtonElement).disabled).toBe(true)
    expect(JSON.parse(localStorage.getItem('theye-engenharia-inspecoes-v1')!)).toHaveLength(1)
  })

  it('mesa de coordenação: entra na sala em modo local e adiciona apontamento', () => {
    localStorage.clear()
    render(<FerramentasEngenharia />)
    fireEvent.click(screen.getByRole('tab', { name: 'Mesa de coordenação' }))
    fireEvent.change(screen.getByTestId('coord-nome'), { target: { value: 'Ana' } })
    fireEvent.click(screen.getByText('Entrar na sala'))
    fireEvent.change(screen.getByTestId('coord-titulo'), { target: { value: 'Tubo cruza viga' } })
    fireEvent.click(screen.getByText('Adicionar'))
    expect(screen.getByTestId('coord-tabela').textContent).toContain('Tubo cruza viga')
    fireEvent.click(screen.getByText('Trazer os conflitos do exemplo'))
    expect(screen.getByTestId('coord-painel').textContent).toMatch(/Abertos\d+/)
  })
})
