// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'

const rpc = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: true, supabase: { rpc } }))
const { default: ComparacaoJustica, JEN_SEGMENTOS } = await import('./ComparacaoJustica')
const { default: CalibracaoPrevisoes } = await import('./CalibracaoPrevisoes')

describe('Escritório lado a lado com o Justiça em Números', () => {
  beforeEach(() => { cleanup(); rpc.mockReset() })

  it('mostra tempo médio com margem, casos por área, os dois segmentos do CNJ e a leitura comparativa', async () => {
    rpc.mockResolvedValue({ data: { casos_total: 12, casos_abertos: 7, casos_encerrados: 5, tempo_medio_dias: 182, margem_dias: 40, consultado_em: '2026-11-01', por_area: [{ area: 'Locação', n: 8, abertos: 5, tempo_medio_dias: 30 }] }, error: null })
    render(<ComparacaoJustica />)
    await waitFor(() => expect(screen.getByTestId('tempo-medio-escritorio').textContent).toBe('6.0 meses'))
    const esc = screen.getByTestId('comparacao-escritorio')
    expect(esc.textContent).toContain('± 40 dia(s) (95%)')
    expect(esc.textContent).toContain('12 caso(s): 7 aberto(s), 5 encerrado(s).')
    expect(screen.getByTestId('casos-por-area').textContent).toContain('Locação: 8 caso(s), 30 dia(s) em média')
    expect(esc.textContent).toContain('amostra pequena')
    for (const s of JEN_SEGMENTOS) expect(screen.getByTestId(`comparacao-${s.tribunal.toLowerCase()}`).textContent).toContain(`${s.congestionamento.toLocaleString('pt-BR')}%`)
    expect(screen.getByTestId('leitura-tjrj').textContent).toContain('mais rápido que a média')
    expect(screen.getByTestId('leitura-trt1').textContent).toContain('mais rápido que a média')
  })

  it('escritório mais lento que a fase de conhecimento do TRT1 recebe o aviso de revisar prazos; erro vira alerta', async () => {
    rpc.mockResolvedValueOnce({ data: { casos_total: 1, casos_abertos: 0, casos_encerrados: 1, tempo_medio_dias: 400, margem_dias: null, consultado_em: '', por_area: [] }, error: null })
    render(<ComparacaoJustica />)
    await waitFor(() => expect(screen.getByTestId('leitura-trt1').textContent).toContain('vale revisar os prazos internos'))
    expect(screen.getByTestId('leitura-tjrj').textContent).toContain('mais rápido que a média')
    expect(screen.getByTestId('casos-por-area').textContent).toContain('Nenhum caso cadastrado ainda')
    cleanup(); rpc.mockResolvedValueOnce({ data: null, error: { message: 'falhou' } })
    render(<ComparacaoJustica />)
    expect((await screen.findByRole('alert')).textContent).toBe('falhou')
  })
})

describe('Calibração das previsões (Brier)', () => {
  beforeEach(() => { cleanup(); rpc.mockReset() })

  it('classifica a qualidade pelo Brier e mostra acerto e casos por previsão', async () => {
    rpc.mockResolvedValue({ data: { contratos_com_desfecho: 4, previsoes_registradas: 10, brier_inadimplencia: 0.08, n_inadimplencia: 4, acerto_inadimplencia_pct: 100, brier_renovacao: 0.3, n_renovacao: 2, acerto_renovacao_pct: 50 }, error: null })
    render(<CalibracaoPrevisoes />)
    const secao = await screen.findByTestId('calibracao')
    expect(secao.textContent).toContain('4 de 10 contratos previstos já têm desfecho')
    expect(screen.getByTestId('calib-inadimplência').textContent).toContain('excelente')
    expect(screen.getByTestId('calib-inadimplência').textContent).toContain('100%')
    expect(screen.getByTestId('calib-renovação').textContent).toContain('pior que chute')
  })

  it('sem desfecho registrado orienta a registrar; sem Brier mostra traço', async () => {
    rpc.mockResolvedValue({ data: { contratos_com_desfecho: 0, previsoes_registradas: 3, brier_inadimplencia: null, n_inadimplencia: 0, acerto_inadimplencia_pct: null, brier_renovacao: null, n_renovacao: 0, acerto_renovacao_pct: null }, error: null })
    render(<CalibracaoPrevisoes compacto />)
    const secao = await screen.findByTestId('calibracao')
    expect(secao.textContent).toContain('Registre em Previsões o que aconteceu de fato')
    expect(screen.getByTestId('calib-renovação').textContent).toContain('—')
  })
})
