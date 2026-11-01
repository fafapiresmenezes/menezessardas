// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

// Servidor simulado: a função indice-reajuste responde o que o teste mandar.
const invoke = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: true, supabase: { functions: { invoke } } }))
const { default: Reajuste } = await import('./Reajuste')
type Contrato = import('@/lib/repositorio').Contrato

const contrato = { id: 'c1', indice: 'igpm', valor: 1000, parte: 'Loja X', tipo: 'locacao_comercial' } as unknown as Contrato

describe('Reajuste anual', () => {
  beforeEach(() => { cleanup(); invoke.mockReset() })

  it('não aparece para contrato sem reajuste ou com valor fixo', () => {
    const { container } = render(<Reajuste contrato={{ ...contrato, indice: 'sem_reajuste' } as Contrato} imovel="Rua A" />)
    expect(container.innerHTML).toBe('')
  })

  it('marca o índice do contrato como escolhido e calcula o novo valor com o acumulado do Banco Central', async () => {
    invoke.mockResolvedValue({ data: { indice: 'igpm', acumulado12m: 4.5, de: '01/10/2025', ate: '01/09/2026', fonte: 'BCB' }, error: null })
    render(<Reajuste contrato={contrato} imovel="Rua A, 10" />)
    const botao = screen.getByTestId('indice-igpm')
    expect(botao.getAttribute('aria-checked')).toBe('true')
    expect(botao.textContent).toContain('(do contrato)')
    fireEvent.click(botao)
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('indice-reajuste', { body: { indice: 'igpm' } }))
    await waitFor(() => expect(document.body.textContent).toContain('1.045,00'))
    expect(document.body.textContent).toContain('Loja X')
  })

  it('mostra o motivo quando o servidor recusa', async () => {
    invoke.mockResolvedValue({ data: { erro: 'Série indisponível' }, error: null })
    render(<Reajuste contrato={contrato} imovel="Rua A" />)
    fireEvent.click(screen.getByTestId('indice-ipca'))
    await waitFor(() => expect(document.body.textContent).toContain('Série indisponível'))
  })
})
