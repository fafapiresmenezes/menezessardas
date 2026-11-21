// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import DiagnosticoAguas from './DiagnosticoAguas'
import { GUANDU, LUANDA } from '@/data/aguasDiagnostico'

afterEach(cleanup)

describe('diagnóstico de Águas', () => {
  it('mostra os dois casos com rótulo e sem a palavra previsto como resultado', () => {
    render(<DiagnosticoAguas />)
    expect(screen.getByTestId('caso-guandu').textContent).toContain('Nova Iguaçu')
    expect(screen.getByTestId('caso-luanda').textContent).toContain('Quilonga Grande')
    expect(screen.getAllByText('ESTIMADO').length).toBeGreaterThan(0)
    expect(screen.getAllByText('MEDIDO').length).toBeGreaterThan(0)
    expect(screen.getByTestId('aguas-diagnostico').textContent).not.toMatch(/PREVISTO/)
  })
  it('dados coerentes com o trilho', () => {
    expect(GUANDU.dboCentral).toBeLessThan(GUANDU.dboAlta)
    expect(GUANDU.iqa.find(e => e.estacao === 'PO290')?.classe).toBe('RUIM')
    expect(LUANDA.etas.filter(e => e.confirmada).map(e => e.nome).join()).toContain('Quilonga')
  })
  it('não traz nome de cliente', () => {
    render(<DiagnosticoAguas />)
    expect(screen.getByTestId('aguas-diagnostico').textContent).not.toMatch(/imbono|gemcorp/i)
  })
})
