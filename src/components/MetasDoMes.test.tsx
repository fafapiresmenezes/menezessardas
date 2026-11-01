// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

const rpc = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: true, supabase: { rpc } }))
const { default: MetasDoMes, corDesvio, pctRitmo } = await import('./MetasDoMes')

describe('Metas do mês por função', () => {
  beforeEach(() => { cleanup(); rpc.mockReset() })

  it('ritmo e cor pelo desvio: no ritmo ≥95%, atenção ≥70%, abaixo <70%, sem meta', () => {
    expect(pctRitmo(50, 100)).toBe(50)
    expect(pctRitmo(10, 0)).toBeNull()
    expect(corDesvio(100).rotulo).toBe('no ritmo')
    expect(corDesvio(80).rotulo).toBe('atenção')
    expect(corDesvio(40).rotulo).toBe('abaixo')
    expect(corDesvio(null)).toEqual({ classe: 'bg-grafite-claro', rotulo: 'sem meta' })
  })

  it('mostra cada função com horas, situação e honorários do mês', async () => {
    rpc.mockResolvedValue({ data: {
      mes: '2026-11', dias_uteis_mes: 20, dias_uteis_ate_hoje: 10, honorarios_previstos: 10000, honorarios_recebidos: 4000, casos_concluidos_total: 2, casos_abertos_total: 7,
      por_funcao: [
        { papel: 'advogada', meta_horas: 100, pessoas: 2, horas: 48, esperado_hoje: 50, casos_concluidos: 1, tarefas_feitas: 5, prazos_vencidos: 1 },
        { papel: 'estagiario', meta_horas: 0, pessoas: 0, horas: 0, esperado_hoje: 0, casos_concluidos: 0, tarefas_feitas: 0, prazos_vencidos: 0 },
      ],
    }, error: null })
    render(<MetasDoMes />)
    const secao = await screen.findByTestId('metas-do-mes')
    expect(secao.textContent).toContain('10 de 20 dias úteis')
    const funcoes = screen.getAllByTestId('meta-funcao')
    expect(funcoes[0].textContent).toContain('Advogada')
    expect(funcoes[0].textContent).toContain('48h de 100h')
    expect(funcoes[0].textContent).toContain('96% do ritmo')
    expect(funcoes[0].textContent).toContain('1 prazo(s) vencido(s)')
    expect(screen.getAllByTestId('meta-situacao')[0].textContent).toBe('no ritmo')
    expect(funcoes[1].textContent).toContain('ninguém escolheu esta função')
    expect(screen.getAllByTestId('meta-situacao')[1].textContent).toBe('sem meta')
    const hon = screen.getByTestId('meta-honorarios')
    const t = (hon.textContent ?? '').replace(/\u00a0/g, ' ')
    expect(t).toContain('R$ 4.000 recebidos de R$ 10.000 previstos (40%)')
    expect(hon.textContent).toContain('abaixo')
  })

  it('erro do servidor vira alerta', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'sem permissão' } })
    render(<MetasDoMes />)
    expect((await screen.findByRole('alert')).textContent).toBe('sem permissão')
  })
})
