// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'fs'
import PortalInstitutoPage from './PortalInstitutoPage'
import PortaisInstitutoPage from './PortaisInstitutoPage'
import { PORTAIS_INSTITUTO, ROTULO_ESTADO } from '@/data/portais-instituto'

// Passo B7: cada porta do Instituto em desenvolvimento tem endereço próprio, com escopo e estado.
// O critério de aceite do passo é "as páginas no ar e ligadas". Este teste tranca as três partes
// que dão para medir: o endereço existe no App.tsx, a página abre naquele endereço com o nome e o
// estado certos, e nenhuma delas promete prazo.

const abrir = (rota: string) =>
  render(<MemoryRouter initialEntries={[rota]}><PortalInstitutoPage /></MemoryRouter>)

describe('portas do Instituto em desenvolvimento', () => {
  it('todo endereço da lista está ligado no App.tsx', () => {
    const app = readFileSync('src/App.tsx', 'utf8')
    for (const p of PORTAIS_INSTITUTO) {
      expect(app, `${p.rota} não está no App.tsx`).toContain(`path="${p.rota}" element={<PortalInstitutoPage />}`)
    }
    expect(app).toContain('path="/portais" element={<PortaisInstitutoPage />}')
  })

  it('cada endereço abre a sua porta, com nome, resumo, estado e escopo', () => {
    for (const p of PORTAIS_INSTITUTO) {
      const tela = abrir(p.rota)
      expect(screen.getByRole('heading', { level: 1 }).textContent, p.rota).toBe(p.nome)
      expect(screen.getByText(p.resumo), p.rota).toBeTruthy()
      expect(screen.getByTestId('estado-portal').textContent, p.rota).toBe(ROTULO_ESTADO[p.estado])
      expect(screen.getByTestId('escopo-portal').children.length, p.rota).toBe(p.escopo.length)
      tela.unmount()
    }
  })

  it('nenhuma porta promete prazo: nada de mês, trimestre, semestre ou ano', () => {
    const proibido = /\b(em \d+ (dias|semanas|meses)|primeiro (trimestre|semestre)|até (janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)|20\d\d)\b/i
    for (const p of PORTAIS_INSTITUTO) {
      const texto = [p.resumo, p.comoEsta, ...p.escopo].join(' ')
      expect(proibido.test(texto), `${p.rota} promete prazo: "${texto.match(proibido)?.[0]}"`).toBe(false)
    }
  })

  it('a porta de geolocalização não está aqui: aquela frente anda em conversa própria', () => {
    expect(PORTAIS_INSTITUTO.some(p => p.rota === '/geolocalizacao')).toBe(false)
    expect(readFileSync('src/data/portais-instituto.ts', 'utf8')).toContain('/geolocalizacao de propósito NÃO está aqui')
  })

  it('endereço desconhecido não quebra a página: ela diz onde está a lista', () => {
    abrir('/porta-que-nao-existe')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Esta porta não existe')
  })

  it('a lista mostra as oito portas, cada uma com o seu estado', () => {
    render(<MemoryRouter><PortaisInstitutoPage /></MemoryRouter>)
    expect(screen.getByTestId('lista-portais').children.length).toBe(PORTAIS_INSTITUTO.length)
    expect(PORTAIS_INSTITUTO.length).toBe(8)
    for (const p of PORTAIS_INSTITUTO) expect(screen.getByText(p.nome), p.rota).toBeTruthy()
  })
})
