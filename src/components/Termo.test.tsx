// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Termo, TextoComTermos } from './Termo'
import Vazio from './Vazio'
import FaixaConexao from './FaixaConexao'
import { avisarRede } from '@/lib/rede'

describe('Termo jurídico com explicação', () => {
  beforeEach(cleanup)

  it('termo do glossário ganha explicação ao focar e some com Esc; palavra comum fica como texto', () => {
    render(<p><Termo>comodato</Termo> e <Termo>xyzw</Termo></p>)
    const botao = screen.getByTestId('termo')
    expect(botao.textContent).toBe('comodato')
    expect(screen.queryByRole('tooltip')).toBeNull()
    fireEvent.focus(botao)
    expect(screen.getByRole('tooltip').textContent?.length).toBeGreaterThan(10)
    expect(botao.getAttribute('aria-describedby')).toBe(screen.getByRole('tooltip').id)
    fireEvent.keyDown(botao, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(screen.getAllByTestId('termo')).toHaveLength(1)
  })

  it('TextoComTermos sublinha só os termos do glossário dentro de uma frase', () => {
    render(<TextoComTermos texto="Contrato de comodato com fiador." />)
    expect(screen.getAllByTestId('termo').map(b => b.textContent)).toContain('comodato')
    expect(document.body.textContent).toBe('Contrato de comodato com fiador.')
  })
})

describe('Vazio (estado vazio padrão)', () => {
  beforeEach(cleanup)
  it('mostra título, texto e a ação como link ou botão', () => {
    const { rerender } = render(<MemoryRouter><Vazio titulo="Nenhum imóvel" texto="Cadastre o primeiro." acao={{ rotulo: 'Cadastrar', para: '/imoveis/novo' }} /></MemoryRouter>)
    expect(screen.getByText('Nenhum imóvel')).toBeTruthy()
    expect(screen.getByText('Cadastrar').getAttribute('href')).toBe('/imoveis/novo')
    let clicou = false
    rerender(<MemoryRouter><Vazio titulo="Nada" acao={{ rotulo: 'Limpar', onClick: () => { clicou = true } }} testid="v2" /></MemoryRouter>)
    fireEvent.click(screen.getByText('Limpar'))
    expect(clicou).toBe(true)
    expect(screen.getByTestId('v2')).toBeTruthy()
  })
})

describe('FaixaConexao', () => {
  beforeEach(cleanup)
  it('fica escondida com conexão e aparece quando o aparelho fica offline ou as chamadas falham', () => {
    render(<FaixaConexao />)
    expect(screen.queryByTestId('sem-conexao')).toBeNull()
    fireEvent(window, new Event('offline'))
    expect(screen.getByRole('alert').textContent).toContain('Sem conexão.')
    fireEvent(window, new Event('online'))
    expect(screen.queryByTestId('sem-conexao')).toBeNull()
    act(() => avisarRede(false))
    expect(screen.getByTestId('sem-conexao')).toBeTruthy()
    act(() => avisarRede(true))
    expect(screen.queryByTestId('sem-conexao')).toBeNull()
  })
})
