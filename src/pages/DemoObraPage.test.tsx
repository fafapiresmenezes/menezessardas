import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

afterEach(cleanup)
import DemoObraPage from './DemoObraPage'

vi.mock('@/components/Layout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
vi.mock('@/components/LayoutFundos', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))

describe('Medição de obra por nível (demonstração)', () => {
  it('avisa que os dados são fictícios e abre na visão do presidente executivo, com os três projectos', () => {
    render(<DemoObraPage />)
    expect(screen.getByTestId('aviso-ficticio').textContent).toMatch(/fictícios/)
    expect(screen.getByTestId('alcance').textContent).toMatch(/Vê 12 de 12 documentos e 3 de 3 projectos/)
    expect(screen.getByTestId('liquido').textContent).toMatch(/Kz/)
  })

  it('o técnico de medição vê só o que é dele e é recusado ao tentar fiscalizar a própria medição', () => {
    render(<DemoObraPage />)
    fireEvent.click(screen.getByTestId('pessoa-medidor'))
    expect(screen.getByTestId('alcance').textContent).toMatch(/Vê 2 de 12 documentos e 1 de 3 projectos/)
    expect(screen.getByTestId('ocultos').textContent).toMatch(/Outros 10 documentos/)
    fireEvent.click(screen.getByTestId('assinar'))
    expect(screen.getByTestId('resultado-assinatura').textContent).toMatch(/Recusado\. Sem alçada para Fiscalização/)
  })

  it('o boletim anda entre sectores: gestor fiscaliza, engenharia aprova, jurídico valida, finanças paga', () => {
    render(<DemoObraPage />)
    for (const [pessoa, estacao] of [['gestor', 'Fiscalização'], ['dir-obra', 'Aprovação técnica']] as const) {
      fireEvent.click(screen.getByTestId(`pessoa-${pessoa}`))
      fireEvent.click(screen.getByTestId('assinar'))
      expect(screen.getByTestId('resultado-assinatura').textContent).toContain(`${estacao} registada`)
    }
    // O jurídico e as finanças não vêem o boletim de obra: a validação e o pagamento sobem ao nível do país.
    fireEvent.click(screen.getByTestId('pessoa-dir-fin'))
    expect(screen.queryByTestId('assinar')).toBeNull()
    fireEvent.click(screen.getByTestId('pessoa-ceo'))
    fireEvent.click(screen.getByTestId('assinar'))
    expect(screen.getByTestId('resultado-assinatura').textContent).toContain('Validação contratual registada')
    fireEvent.click(screen.getByTestId('assinar'))
    expect(screen.getByTestId('resultado-assinatura').textContent).toContain('Liberação de pagamento registada')
    expect(screen.getByTestId('assinar').textContent).toBe('Boletim concluído')
  })

  it('as leis vêm por país, como dados: Angola abre primeiro e a Namíbia troca a lista', () => {
    render(<DemoObraPage />)
    expect(screen.getByTestId('normas').textContent).toContain('Lei n.º 41/20')
    fireEvent.click(screen.getByTestId('pais-NA'))
    expect(screen.getByTestId('normas').textContent).toContain('Public Procurement Act')
    fireEvent.click(screen.getByTestId('pais-GLOBAL'))
    expect(screen.getByTestId('normas').textContent).toContain('FIDIC')
  })
})
