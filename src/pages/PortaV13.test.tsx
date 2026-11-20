// @vitest-environment jsdom
// Redesenho da porta no passo V13 (M, 13/11/2026 23:04): promessa antes do nome, prova logo abaixo,
// um botão forte por tela e, para quem volta, retomar de onde parou — lembrança só no aparelho.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { reiniciarIdioma } from '@/lib/i18n'

const contarVisita = vi.fn()
vi.mock('@/lib/visitas', () => ({ contarVisita: (...a: unknown[]) => contarVisita(...a) }))

import BoasVindasPage from './BoasVindasPage'
import Vertentes from '@/components/Vertentes'

const montar = () => render(<MemoryRouter><BoasVindasPage /></MemoryRouter>)

describe('porta redesenhada (V13)', () => {
  beforeEach(() => {
    cleanup(); localStorage.clear(); reiniciarIdioma()
    // jsdom não tem scrollIntoView; os botões de "descer até" chamam ele.
    Element.prototype.scrollIntoView = vi.fn()
  })
  afterEach(() => { localStorage.clear(); reiniciarIdioma() })

  it('mostra a promessa grande, a faixa de prova e um botão forte de conhecer', () => {
    montar()
    const h1 = screen.getByRole('heading', { level: 1 })
    // Primeira faixa (M, 20/11/2026): Instituto THEYE em tela cheia, o nome oficial e o lema.
    expect(h1.textContent).toBe('INSTITUTOTHEYE')
    expect(screen.getByTestId('porta-nome-oficial').textContent).toBe('Instituto especializado em Ontologia oferecendo soluções multidisciplinares')
    expect(screen.getByTestId('estrela-na-pupila')).toBeTruthy()
    expect(screen.getByTestId('porta-historia').textContent).toContain('ontologia')
    // Temas centrais em tópicos, na ordem pedida por M (20/11/2026): superinteligência primeiro.
    expect(screen.getByTestId('porta-temas').textContent).toContain('Superinteligência')
    expect(screen.getByTestId('porta-chamada').textContent).toContain('margem de erro')
    // Só o número de frentes; os outros números saíram.
    expect(screen.queryByTestId('prova-materias')).toBeNull()
    expect(screen.queryByTestId('prova-especialidades')).toBeNull()
    expect(screen.getByTestId('prova-da-porta')).toBeTruthy()
    expect(screen.getByTestId('porta-conhecer').textContent).toContain('Quero conhecer')
    // O bloco de senha saiu do começo: o login só aparece ao clicar numa área, lá embaixo.
    expect(screen.queryByTestId('escolha-idioma')).toBeNull()
    expect(screen.queryByTestId('porta-ja-tenho-acesso')).toBeNull()
  })

  it('sem frente guardada, não aparece a faixa de retomar', () => {
    montar()
    expect(screen.queryByTestId('porta-retomar')).toBeNull()
  })

  it('com uma frente guardada no aparelho, recebe a pessoa com "continuar em" e o link certo', () => {
    localStorage.setItem('theye-ultima-frente', '/engenharia')
    montar()
    const link = screen.getByTestId('porta-retomar-link')
    expect(link.textContent).toContain('Continuar em')
    expect(link.textContent).toContain('Engenharia')
    expect(link.getAttribute('href')).toBe('/login?ir=%2Fengenharia')
  })

  it('"começar do zero" esquece a frente e tira a faixa', () => {
    localStorage.setItem('theye-ultima-frente', '/saude')
    montar()
    expect(screen.getByTestId('porta-retomar')).toBeTruthy()
    fireEvent.click(screen.getByTestId('porta-esquecer'))
    expect(screen.queryByTestId('porta-retomar')).toBeNull()
    expect(localStorage.getItem('theye-ultima-frente')).toBeNull()
  })

  it('clicar num quadradinho de frente guarda a última frente no aparelho', () => {
    render(<MemoryRouter><Vertentes /></MemoryRouter>)
    fireEvent.click(screen.getByTestId('vertente-engenharia'))
    expect(localStorage.getItem('theye-ultima-frente')).toBe('/engenharia')
  })
})

describe('contagem de visitas na porta (V10)', () => {
  beforeEach(() => {
    cleanup(); localStorage.clear(); reiniciarIdioma(); contarVisita.mockReset()
    Element.prototype.scrollIntoView = vi.fn()
  })
  afterEach(() => { localStorage.clear(); reiniciarIdioma() })

  it('a porta diz que conta visitas e não segue pessoas', () => {
    montar()
    expect(screen.getByTestId('porta-sem-rastreio').textContent).toContain('não seguimos pessoas')
  })

  it('abrir a porta conta uma visita', () => {
    montar()
    expect(contarVisita).toHaveBeenCalledWith('visita')
  })

  it('clicar num quadradinho conta aquele quadradinho', () => {
    render(<MemoryRouter><Vertentes /></MemoryRouter>)
    fireEvent.click(screen.getByTestId('vertente-saude'))
    expect(contarVisita).toHaveBeenCalledWith('quadradinho', 'saude')
  })
})
