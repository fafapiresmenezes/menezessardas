// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import EscolhaAvisos, { OPCOES_AVISO } from './EscolhaAvisos'
import PerguntarTela, { resumoDaTela } from './PerguntarTela'

describe('EscolhaAvisos (dias de antecedência)', () => {
  beforeEach(cleanup)

  it('marca e desmarca dias, devolvendo a lista em ordem decrescente, e nunca deixa a lista vazia', () => {
    const onChange = vi.fn()
    const { rerender } = render(<EscolhaAvisos id="a" valor={[7]} onChange={onChange} />)
    expect(screen.getAllByRole('button')).toHaveLength(OPCOES_AVISO.length)
    expect(screen.getByText('7 dias').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('1 dia').getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(screen.getByText('30 dias'))
    expect(onChange).toHaveBeenLastCalledWith([30, 7])
    rerender(<EscolhaAvisos id="a" valor={[30, 7]} onChange={onChange} />)
    fireEvent.click(screen.getByText('30 dias'))
    expect(onChange).toHaveBeenLastCalledWith([7])
    rerender(<EscolhaAvisos id="a" valor={[7]} onChange={onChange} />)
    onChange.mockClear()
    fireEvent.click(screen.getByText('7 dias'))
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('PerguntarTela (perguntar ao Assistente sobre a tela)', () => {
  beforeEach(cleanup)
  const Destino = () => { const l = useLocation(); return <p data-testid="destino">{l.pathname}{l.search}</p> }

  it('resume títulos e itens visíveis da tela', () => {
    render(<main><h2>Imóveis</h2><dt>Total</dt><dd>12</dd></main>)
    const r = resumoDaTela()
    expect(r).toContain('Seções: Imóveis')
    expect(r).toContain('Itens visíveis: Total · 12')
  })

  it('leva ao Assistente com a pergunta pronta e o contexto da tela; some dentro do próprio Assistente', () => {
    render(
      <MemoryRouter initialEntries={['/imoveis/abc']}>
        <Routes>
          <Route path="/imoveis/:id" element={<><h2>Imóvel X</h2><PerguntarTela /></>} />
          <Route path="/assistente" element={<Destino />} />
        </Routes>
      </MemoryRouter>,
    )
    const botao = screen.getByTestId('perguntar-tela')
    expect(botao.getAttribute('aria-label')).toContain('Perguntar ao Assistente sobre a tela')
    fireEvent.click(botao)
    const destino = decodeURIComponent(screen.getByTestId('destino').textContent ?? '')
    expect(destino).toContain('/assistente?pedido=Estou na tela')
    expect(destino).toContain('Registro aberto: abc')
    cleanup()
    render(<MemoryRouter initialEntries={['/assistente']}><PerguntarTela /></MemoryRouter>)
    expect(screen.queryByTestId('perguntar-tela')).toBeNull()
  })
})
