// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import PerguntarTela, { resumoDaTela } from './PerguntarTela'

const Onde = () => { const l = useLocation(); return <p data-testid="onde">{l.pathname}{l.search}</p> }
const montar = (rota: string, conteudo?: React.ReactNode) => render(<MemoryRouter initialEntries={[rota]}><Routes><Route path="*" element={<><main>{conteudo}</main><PerguntarTela /><Onde /></>} /></Routes></MemoryRouter>)

describe('PerguntarTela', () => {
  beforeEach(cleanup)

  it('resumoDaTela junta títulos e itens visíveis curtos do <main>', () => {
    render(<main><h1>Painel</h1><h2>Alertas</h2><dl><dt>Contratos</dt><dd>12</dd></dl><p data-testid="x">{'x'.repeat(80)}</p></main>)
    const r = resumoDaTela()
    expect(r).toBe('Seções: Painel · Alertas\nItens visíveis: Contratos · 12')
  })

  it('não aparece no Assistente; em outra tela leva ao Assistente com pedido e contexto (nome da tela, rota, registro aberto, resumo)', () => {
    montar('/assistente')
    expect(screen.queryByTestId('perguntar-tela')).toBeNull()
    cleanup()
    montar('/agenda', <h2>Compromissos de novembro</h2>)
    const b = screen.getByTestId('perguntar-tela')
    expect(b.getAttribute('aria-label')).toBe('Perguntar ao Assistente sobre a tela Agenda')
    fireEvent.click(b)
    const destino = decodeURIComponent(screen.getByTestId('onde').textContent!)
    expect(destino).toContain('/assistente?pedido=Estou na tela "Agenda". Explique em linguagem simples')
    expect(destino).toContain('Tela: Agenda (/agenda)')
    expect(destino).toContain('Seções: Compromissos de novembro')
    expect(destino).not.toContain('Registro aberto')
    cleanup()
    montar('/contrato/abc-123')
    fireEvent.click(screen.getByTestId('perguntar-tela'))
    const d2 = decodeURIComponent(screen.getByTestId('onde').textContent!)
    expect(d2).toContain('Tela: /contrato/abc-123 (/contrato/abc-123)')
    expect(d2).toContain('Registro aberto: abc-123')
    cleanup()
    montar('/imoveis/novo')
    expect(screen.getByTestId('perguntar-tela').getAttribute('aria-label')).toBe('Perguntar ao Assistente sobre a tela Novo imóvel')
    fireEvent.click(screen.getByTestId('perguntar-tela'))
    expect(decodeURIComponent(screen.getByTestId('onde').textContent!)).not.toContain('Registro aberto')
  })
})
