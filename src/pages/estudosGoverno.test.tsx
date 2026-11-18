// @vitest-environment jsdom
// Plano v5, fase S: prova da aba "Estudos para o governo".
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))

import EstudosGovernoPage from './EstudosGovernoPage'
import { TIPOS_ESTUDO, ESTUDOS_DEMO } from '@/data/estudosGovernoDemo'
import { escolherPessoa } from '@/lib/visaoFundos'

const montar = () => render(<MemoryRouter><EstudosGovernoPage /></MemoryRouter>)
beforeEach(() => { localStorage.clear() })
afterEach(cleanup)

describe('estudos para o governo (fase S)', () => {
  it('mostra os tipos, com a predição fechada até calibração provada', () => {
    montar()
    expect(screen.getByTestId('tipos-estudo').children.length).toBe(TIPOS_ESTUDO.length)
    expect(screen.getByTestId('tipo-fechado')).toBeTruthy()
    expect(document.body.textContent).toContain('calibração provada')
  })

  it('os estudos de exemplo abrem com o molde completo: pergunta, método, limites e fontes', () => {
    montar()
    expect(screen.getByTestId('estudos').children.length).toBe(ESTUDOS_DEMO.length)
    const botao = screen.getAllByRole('button').find(b => (b.textContent ?? '').includes('Impacto económico da Estrada'))!
    fireEvent.click(botao)
    const t = document.body.textContent ?? ''
    for (const s of ['Pergunta', 'Método', 'Limites', 'Fontes']) expect(t).toContain(s)
    expect(botao.getAttribute('aria-expanded')).toBe('true')
    expect(t.toLowerCase()).toContain('demonstra')
  })

  it('nenhum estudo de exemplo traz número real sem fonte: todos se declaram exemplo e citam fontes', () => {
    for (const e of ESTUDOS_DEMO) {
      expect(e.estado).toBe('exemplo')
      expect(e.fontes.length).toBeGreaterThan(0)
      expect(e.seccoes.some(s => s.titulo === 'Limites')).toBe(true)
    }
  })

  it('recorte por nível: a directora financeira não tem estudos no seu recorte; o furo pelo endereço fecha ao gestor', () => {
    escolherPessoa('dir-fin')
    montar()
    expect(screen.getByTestId('vazio').textContent).toContain('Nada no seu recorte')
    cleanup()
    escolherPessoa('gestor')
    montar()
    expect(screen.getByTestId('sem-acesso')).toBeTruthy()
  })
})
