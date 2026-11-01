// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { SkeletonCard, SkeletonTable, SkeletonIndicator, SkeletonForm } from './Skeleton'
import Vazio from './Vazio'
import Marca from './Marca'

describe('Skeleton, Vazio e Marca', () => {
  beforeEach(cleanup)

  it('esqueletos: quantidade de cartões, classe extra, 5 linhas na tabela, indicadores por contagem e formulário pulsando', () => {
    const { container } = render(<div data-testid="c"><SkeletonCard count={3} className="mb-6" /></div>)
    const cartoes = container.querySelectorAll('[data-testid="c"] > div')
    expect(cartoes).toHaveLength(3)
    expect(cartoes[0]!.className).toContain('animate-pulse')
    expect(cartoes[0]!.className).toContain('mb-6')
    cleanup()
    const t = render(<SkeletonTable />).container
    expect(t.querySelectorAll('.border-b')).toHaveLength(5)
    cleanup()
    const i = render(<SkeletonIndicator count={2} />).container
    expect(i.firstElementChild!.className).toContain('lg:grid-cols-2')
    expect(i.firstElementChild!.children).toHaveLength(2)
    cleanup()
    expect(render(<SkeletonIndicator />).container.firstElementChild!.children).toHaveLength(4)
    cleanup()
    expect(render(<SkeletonForm />).container.firstElementChild!.className).toContain('animate-pulse')
  })

  it('Vazio: título, texto opcional, ícone padrão, ação como link ou botão e testid próprio', () => {
    const Onde = () => <p data-testid="onde">{useLocation().pathname}</p>
    render(<MemoryRouter initialEntries={['/x']}><Routes><Route path="/x" element={<><Vazio titulo="Nenhum imóvel" texto="Cadastre o primeiro." acao={{ rotulo: 'Novo imóvel', para: '/imoveis/novo' }} /><Onde /></>} /><Route path="*" element={<Onde />} /></Routes></MemoryRouter>)
    expect(screen.getByTestId('vazio').textContent).toContain('Nenhum imóvel')
    expect(screen.getByText('Cadastre o primeiro.')).toBeTruthy()
    expect(screen.getByTestId('vazio').querySelector('svg')).toBeTruthy()
    const link = screen.getByText('Novo imóvel') as HTMLAnchorElement
    expect(link.tagName).toBe('A')
    fireEvent.click(link)
    expect(screen.getByTestId('onde').textContent).toBe('/imoveis/novo')
    cleanup()
    let cliques = 0
    render(<Vazio titulo="Sem alertas" acao={{ rotulo: 'Atualizar', onClick: () => { cliques++ } }} icone={<span data-testid="icone-x" />} testid="vazio-alertas" />)
    expect(screen.getByTestId('vazio-alertas')).toBeTruthy()
    expect(screen.queryByTestId('vazio')).toBeNull()
    expect(screen.getByTestId('icone-x')).toBeTruthy()
    const botao = screen.getByText('Atualizar') as HTMLButtonElement
    expect(botao.tagName).toBe('BUTTON')
    botao.click()
    expect(cliques).toBe(1)
    expect(screen.getByTestId('vazio-alertas').querySelectorAll('p')).toHaveLength(1)
  })

  it('Marca: monograma GM oculto para leitores de tela, nome do escritório, subtítulo opcional e tamanho grande', () => {
    const { container } = render(<Marca />)
    const gm = screen.getByText('GM')
    expect(gm.getAttribute('aria-hidden')).toBe('true')
    expect(gm.className).toContain('text-xl')
    expect(container.textContent).toContain('GMenezes')
    expect(screen.getByText('Advogados Associados')).toBeTruthy()
    cleanup()
    const g = render(<Marca tamanho="grande" comSubtitulo={false} className="mt-8" />)
    expect(screen.getByText('GM').className).toContain('text-4xl')
    expect(screen.queryByText('Advogados Associados')).toBeNull()
    expect(g.container.firstElementChild!.className).toContain('mt-8')
  })
})
