// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import CompararVersoes from './CompararVersoes'
import type { Contrato } from '@/lib/repositorio'

vi.mock('@/lib/arquivos', () => ({ urlAssinada: async () => 'https://x/pdf' }))
const baixar = vi.fn()
vi.mock('@/lib/ancoragem', () => ({ baixarArquivo: (...a: unknown[]) => baixar(...a) }))
const base: Contrato = { id: 'c1', imovelId: 'i1', tipo: 'locacao_comercial', parte: 'Loja Centro', dataInicio: '2025-01-01', dataVencimento: '2027-12-31', valor: 5000, periodicidade: 'mensal', indice: 'igpm', garantia: 'caucao', dataUltimoReajuste: null, notas: '', criadoEm: '2025-01-01', documentos: [], textoExtraido: 'Aluguel mensal de R$ 5.000,00 reajustado pelo IGP-M' }
const aditivo: Contrato = { ...base, id: 'c2', contratoPaiId: 'c1', natureza: 'aditivo', valor: 5500, indice: 'ipca', dataInicio: '2026-01-01', textoExtraido: 'Aluguel mensal de R$ 5.500,00 reajustado pelo IPCA' }

describe('CompararVersoes (D17)', () => {
  it('não aparece sem aditivos', () => { cleanup(); const { container } = render(<CompararVersoes contrato={base} vinculados={[]} />); expect(container.innerHTML).toBe('') })
  it('compara campos e texto, marca o que saiu e entrou e baixa o PDF', async () => {
    cleanup()
    render(<CompararVersoes contrato={base} vinculados={[aditivo]} />)
    const campos = screen.getByTestId('comparar-campos')
    expect(within(campos).getAllByTestId('campo-mudou').map(r => r.firstChild?.textContent)).toEqual(['Valor combinado', 'Início', 'Índice de reajuste'])
    fireEvent.click(screen.getByTestId('comparar-executar'))
    expect((await screen.findByTestId('comparar-resumo')).textContent).toContain('4 trecho(s) alterado(s)')
    expect(screen.getAllByTestId('seg-removido').map(e => e.textContent?.trim())).toEqual(['5.000,00', 'IGP-M'])
    expect(screen.getAllByTestId('seg-inserido').map(e => e.textContent?.trim())).toEqual(['5.500,00', 'IPCA'])
    fireEvent.click(screen.getByTestId('comparar-pdf'))
    expect(baixar).toHaveBeenCalledWith('comparacao-loja-centro.pdf', expect.any(Uint8Array), 'application/pdf')
  })
  it('sem PDF em nenhuma versão: avisa e mantém a comparação dos campos', async () => {
    cleanup()
    render(<CompararVersoes contrato={{ ...base, textoExtraido: undefined }} vinculados={[{ ...aditivo, textoExtraido: undefined }]} obterTexto={async () => ''} />)
    fireEvent.click(screen.getByTestId('comparar-executar'))
    expect((await screen.findByTestId('comparar-aviso')).textContent).toContain('Nenhuma das versões tem PDF')
    expect(screen.queryByTestId('comparar-resumo')).toBeNull()
    expect(screen.getAllByTestId('campo-mudou')).toHaveLength(3)
  })
})
