// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

const linhas = [
  ...Array.from({ length: 12 }, (_, i) => ({ previsto: { risco: 20, renovacao: 80 }, desfecho: { inadimplente: i === 0, renovou: i < 10 } })),
  { previsto: { risco: 30 }, desfecho: { por: 'x' } },
]
const cadeia = { eq: () => cadeia, not: () => cadeia, limit: async () => ({ data: linhas }) }
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    rpc: async () => ({ data: { contratos_com_desfecho: 12, previsoes_registradas: 138, brier_inadimplencia: 0.08, n_inadimplencia: 12, acerto_inadimplencia_pct: 92, brier_renovacao: 0.15, n_renovacao: 12, acerto_renovacao_pct: 83 } }),
    from: () => ({ select: () => cadeia }),
  },
}))
const { default: CalibracaoPrevisoes, lerPares } = await import('./CalibracaoPrevisoes')

describe('meta de calibragem 1 a 5% (B08)', () => {
  it('lê só pares válidos', async () => {
    const p = await lerPares()
    expect(p.inad.length).toBe(12)
    expect(p.renov.length).toBe(12)
    expect(p.inad[0]).toEqual({ p: 0.2, y: 1 })
  })
  it('com poucos desfechos mostra o erro e diz que a amostra é pequena', async () => {
    render(<CalibracaoPrevisoes />)
    await waitFor(() => expect(screen.getByTestId('meta-inadimplência').textContent).toContain('amostra pequena'))
    expect(screen.getByTestId('meta-inadimplência').textContent).toContain('com 12 desfecho(s)')
    expect(screen.getByTestId('meta-calibragem').textContent).toContain('385 desfechos por faixa')
  })
})
