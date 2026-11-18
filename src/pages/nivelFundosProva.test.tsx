// @vitest-environment jsdom
// Plano v5, fase R: prova da separação por nível — menu, acesso pelo endereço e recorte de dados.
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))

import VisaoPresidentePage from './VisaoPresidentePage'
import ContratosPage from './ContratosPage'
import PagamentosPage from './PagamentosPage'
import CarteiraProjectosPage from './CarteiraProjectosPage'
import { veEcra, ECRAS_POR_NIVEL, escolherPessoa, pessoaActual, VISTAS } from '@/lib/visaoFundos'
import { PESSOAS_DEMO } from '@/data/demoObraAngola'

const montar = (el: React.ReactElement) => render(<MemoryRouter>{el}</MemoryRouter>)
const por = (id: string) => { escolherPessoa(id) }

beforeEach(() => { localStorage.clear() })
afterEach(cleanup)

describe('separação por nível (fase R)', () => {
  it('a matriz cobre todos os ecrãs da casa e nenhum nível vê a Visão do presidente abaixo de N2', () => {
    expect(Object.keys(ECRAS_POR_NIVEL).length).toBe(11)
    for (const p of PESSOAS_DEMO) {
      const ve = veEcra(p, '/visao-presidente')
      expect(ve, `${p.id} (${p.nivel})`).toBe(p.nivel === 'N1' || p.nivel === 'N2')
    }
  })

  it('o técnico (N5) só abre o assistente e a medição; o externo (N6) nada', () => {
    const tecnico = PESSOAS_DEMO.find(p => p.id === 'medidor')!
    const fiscal = PESSOAS_DEMO.find(p => p.id === 'fiscal')!
    const rotas = Object.keys(ECRAS_POR_NIVEL)
    expect(rotas.filter(r => veEcra(tecnico, r)).sort()).toEqual(['/assistente-fundos', '/demonstracao-obra'])
    expect(rotas.filter(r => veEcra(fiscal, r))).toEqual([])
  })

  it('prova de furo: o gestor (N4) a abrir a Visão do presidente pelo endereço leva "sem acesso"', () => {
    por('gestor')
    montar(<VisaoPresidentePage />)
    expect(screen.getByTestId('sem-acesso')).toBeTruthy()
    expect(screen.queryByTestId('lista-projectos')).toBeNull()
  })

  it('recorte do gestor (N4): só o contrato do seu projecto', () => {
    por('gestor')
    montar(<ContratosPage />)
    const t = document.body.textContent ?? ''
    expect(t).toContain('Estrada do Planalto, lote 2')
    expect(t).not.toContain('Walvis Bay')
    expect(t).not.toContain('Estação de tratamento')
  })

  it('recorte da directora financeira (N3): pagamentos do país todo, mas contratos fora da sua área', () => {
    por('dir-fin')
    const a = montar(<PagamentosPage />)
    const tp = document.body.textContent ?? ''
    expect(tp).toContain('Medição n.º 7')
    expect(tp).not.toContain('Walvis Bay') // Namíbia fica fora: ela é de Angola
    a.unmount()
    montar(<ContratosPage />)
    expect(screen.getByTestId('vazio').textContent).toContain('Nada no seu recorte')
  })

  it('a carteira da directora de engenharia (N3) é a do seu país inteiro', () => {
    por('dir-obra')
    montar(<CarteiraProjectosPage />)
    const t = document.body.textContent ?? ''
    expect(t).toContain('Estrada do Planalto')
    expect(t).toContain('Estação de tratamento')
    expect(t).not.toContain('Walvis Bay')
  })

  it('o selector "ver como" guarda a escolha e não oferece o externo', () => {
    expect(VISTAS.some(v => v.id === 'fiscal')).toBe(false)
    por('grupo')
    expect(pessoaActual().id).toBe('grupo')
  })
})
