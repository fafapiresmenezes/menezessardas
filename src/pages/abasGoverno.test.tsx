// @vitest-environment jsdom
// Provas das abas novas: Biblioteca e especialistas, Criador de projectos e Robôs de projectos para o governo.
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))

import BibliotecaTesesPage from './BibliotecaTesesPage'
import CriadorProjectosGovernoPage from './CriadorProjectosGovernoPage'
import RobosProjectosGovernoPage from './RobosProjectosGovernoPage'
import { REPOSITORIOS_TESES, CURSOS_ABERTOS } from '@/data/bibliotecaDemo'
import { ESPECIALISTAS_FUNDOS } from '@/data/especialistasFundos'
import { escolherPessoa } from '@/lib/visaoFundos'

const montar = (el: React.ReactElement) => render(<MemoryRouter>{el}</MemoryRouter>)
beforeEach(() => { localStorage.clear() })
afterEach(cleanup)

describe('biblioteca e especialistas', () => {
  it('lista os repositórios e cursos com ligação oficial e licença, e os 200+ especialistas com estante', () => {
    montar(<BibliotecaTesesPage />)
    expect(screen.getByTestId('repositorios').children.length).toBe(REPOSITORIOS_TESES.length)
    expect(screen.getByTestId('cursos').children.length).toBe(CURSOS_ABERTOS.length)
    expect(ESPECIALISTAS_FUNDOS.length).toBeGreaterThanOrEqual(200)
    expect(screen.getByTestId('especialistas').children.length).toBe(ESPECIALISTAS_FUNDOS.length)
    for (const r of REPOSITORIOS_TESES) { expect(r.url).toMatch(/^https:\/\//); expect(r.licenca.length).toBeGreaterThan(0) }
    for (const e of ESPECIALISTAS_FUNDOS) expect(e.estante.length, e.id).toBeGreaterThan(10)
    expect(document.body.textContent).toContain('nunca copiar')
  })

  it('a busca filtra o catálogo', () => {
    montar(<BibliotecaTesesPage />)
    fireEvent.change(screen.getByTitle('Procurar especialistas por nome, disciplina ou âmbito'), { target: { value: 'FIDIC' } })
    const n = screen.getByTestId('especialistas').children.length
    expect(n).toBeGreaterThan(0)
    expect(n).toBeLessThan(ESPECIALISTAS_FUNDOS.length)
  })

  it('o gestor (N4) abre a biblioteca; o técnico (N5) não', () => {
    escolherPessoa('gestor')
    montar(<BibliotecaTesesPage />)
    expect(screen.getByTestId('repositorios')).toBeTruthy()
    cleanup(); escolherPessoa('medidor')
    montar(<BibliotecaTesesPage />)
    expect(screen.getByTestId('sem-acesso')).toBeTruthy()
  })
})

describe('criador de projectos para o governo', () => {
  it('monta o dossiê-rascunho com selo de aprovação humana e muda com o tipo e o país', () => {
    montar(<CriadorProjectosGovernoPage />)
    expect(screen.getByTestId('selo-rascunho').textContent).toContain('aprovação humana')
    expect(document.body.textContent).toContain('Estrada ou ponte · Angola')
    fireEvent.change(screen.getByTitle('Escolher o tipo de projecto do dossiê'), { target: { value: 'agua' } })
    fireEvent.change(screen.getByTitle('Escolher o país do dossiê'), { target: { value: 'NA' } })
    expect(document.body.textContent).toContain('Água e saneamento · Namíbia')
    expect(screen.getByTestId('dossie-estudos').children.length).toBeGreaterThan(0)
    expect(screen.getByTestId('dossie-agentes').children.length).toBeGreaterThan(0)
    expect(document.body.textContent).toContain('Sem predição até calibração provada')
  })

  it('fecha ao gestor (N4) pelo endereço', () => {
    escolherPessoa('gestor')
    montar(<CriadorProjectosGovernoPage />)
    expect(screen.getByTestId('sem-acesso')).toBeTruthy()
  })
})

describe('robôs de projectos para o governo', () => {
  it('mostra os robôs e a esteira, com a regra de que quem decide é uma pessoa', () => {
    montar(<RobosProjectosGovernoPage />)
    expect(screen.getByTestId('robos').children.length).toBe(3)
    expect(screen.getByTestId('propostas').children.length).toBeGreaterThan(0)
    const t = document.body.textContent ?? ''
    expect(t).toContain('quem decide e quem entrega é sempre uma pessoa')
    expect(t).toContain('Em revisão humana')
    expect(t).toContain('calibração provada')
  })

  it('o recorte vale na esteira: a directora de engenharia não vê a proposta da Namíbia', () => {
    escolherPessoa('dir-obra')
    montar(<RobosProjectosGovernoPage />)
    const t = document.body.textContent ?? ''
    expect(t).toContain('Corredor rodoviário do Planalto')
    expect(t).not.toContain('Plataforma logística')
  })
})
