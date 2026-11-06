// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'

let historico: object[] = []
const inserts: object[] = []
const insertTarefa = vi.fn(async (r: object): Promise<{ data?: unknown; error: { message: string } | null }> => { inserts.push(r); return { error: null } })
const insertDiag = vi.fn(async (_r: object): Promise<{ error: { message: string } | null }> => ({ error: null }))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: { from: (t: string) => t === 'tarefas'
    ? { insert: (r: object) => ({ select: () => ({ single: async () => ({ data: { id: 'caso1' }, error: (await insertTarefa(r)).error }) }), then: (f: (v: unknown) => unknown) => insertTarefa(r).then(f) }) }
    : { select: () => ({ order: async () => ({ data: historico }) }), insert: (r: object) => insertDiag(r) } },
}))
const gerar = vi.fn(async (_d: object) => ({ pdf: new Uint8Array([1]), sha256: 'c'.repeat(64), ots: new Uint8Array([2]), calendario: 'https://alice.btc.calendar.opentimestamps.org', nomeBase: 'compliance-x-2026-11-06' }))
vi.mock('@/lib/relatorioCompliance', () => ({ gerarRelatorioSelado: (d: object) => gerar(d) }))
const baixar = vi.fn((_n: string, _c: unknown, _t?: string) => undefined)
vi.mock('@/lib/ancoragem', () => ({ baixarArquivo: (n: string, c: unknown, t?: string) => baixar(n, c, t) }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: CompliancePage } = await import('./CompliancePage')

describe('Compliance: diagnóstico de integridade', () => {
  beforeEach(() => { cleanup(); localStorage.clear(); historico = []; inserts.length = 0; insertTarefa.mockClear(); insertDiag.mockClear() })

  it('18 perguntas em 6 pilares; nota por pilar e geral, nível e plano de ação ordenado por prioridade; empresa lembrada; código de integridade', async () => {
    render(<CompliancePage />)
    expect(screen.getAllByRole('radiogroup').length).toBe(18)
    expect(screen.queryByTestId('nota-geral')).toBeNull()
    fireEvent.change(screen.getByLabelText('Empresa avaliada'), { target: { value: 'Loja Centro' } })
    expect(localStorage.getItem('lsm-compliance-empresa')).toBe('Loja Centro')
    fireEvent.click(screen.getByTestId('resp-0-0-2')) // sim
    fireEvent.click(screen.getByTestId('resp-0-1-0')) // não
    fireEvent.click(screen.getByTestId('resp-1-0-1')) // em parte
    expect(screen.getByText('Alta direção e governança').textContent).toContain('· 50%')
    expect(screen.getByTestId('nota-geral').textContent).toBe('Nota geral: 50% (em desenvolvimento)')
    expect(screen.getByText(/3 de 18 perguntas respondidas · Loja Centro/)).toBeTruthy()
    const plano = screen.getByText('Plano de ação (2 lacunas)').nextElementSibling!
    const itens = within(plano as HTMLElement).getAllByRole('listitem')
    expect(itens[0].textContent).toContain('Alta direção e governança: Nomear um responsável'); expect(itens[0].textContent).toContain('prioridade alta')
    expect(itens[1].textContent).toContain('Regras e treinamento: Redigir o código de conduta'); expect(itens[1].textContent).toContain('prioridade média')
    await waitFor(() => expect(screen.getByTestId('codigo-integridade').textContent).toMatch(/[0-9a-f]{64}/))
    const codigo = screen.getByTestId('codigo-integridade').textContent!.match(/[0-9a-f]{64}/)![0]
    fireEvent.click(screen.getByTestId('resp-0-1-2'))
    expect(screen.getByTestId('nota-geral').textContent).toBe('Nota geral: 83% (maduro)')
    await waitFor(() => expect(screen.getByTestId('codigo-integridade').textContent).not.toContain(codigo))
  })

  it('gravar diagnóstico cria o caso, as tarefas por prioridade (30/60 dias) e o registro; erro ao criar o caso vira aviso', async () => {
    render(<CompliancePage />)
    fireEvent.change(screen.getByLabelText('Empresa avaliada'), { target: { value: 'Loja Centro' } })
    fireEvent.click(screen.getByTestId('resp-0-0-0')); fireEvent.click(screen.getByTestId('resp-5-0-1'))
    fireEvent.click(screen.getByTestId('salvar-plano'))
    await waitFor(() => expect(screen.getByTestId('msg-plano').textContent).toContain('Diagnóstico gravado e plano de ação criado em Casos e projetos com 2 tarefa(s)'))
    expect(inserts[0]).toEqual(expect.objectContaining({ titulo: 'Plano de ação de compliance · Loja Centro', nivel: 'projeto', cliente: 'Loja Centro', area: 'Compliance' }))
    const tarefas = inserts[1] as { titulo: string; prioridade: string; prazo: string; pai_id: string }[]
    expect(tarefas.length).toBe(2)
    expect(tarefas[0]).toEqual(expect.objectContaining({ prioridade: 'alta', pai_id: 'caso1' })); expect(tarefas[0].titulo).toContain('Alta direção e governança: Aprovar o programa')
    expect(tarefas[1]).toEqual(expect.objectContaining({ prioridade: 'media' })); expect(tarefas[1].titulo).toContain('Proteção de dados (LGPD): Nomear o encarregado')
    const dias = (p: string) => Math.round((new Date(p + 'T12:00').getTime() - new Date(new Date().toISOString().slice(0, 10) + 'T12:00').getTime()) / 86400000)
    expect(dias(tarefas[0].prazo)).toBe(30); expect(dias(tarefas[1].prazo)).toBe(60)
    expect(insertDiag).toHaveBeenCalledWith(expect.objectContaining({ empresa: 'Loja Centro', nota: 25, lacunas: 2, caso_id: 'caso1' }))
    insertTarefa.mockResolvedValueOnce({ error: { message: 'sem permissão' } })
    fireEvent.click(screen.getByTestId('salvar-plano'))
    await waitFor(() => expect(screen.getByTestId('msg-plano').textContent).toBe('Não deu para criar o caso: sem permissão'))
  })

  it('evolução trimestral filtra pela empresa e mostra a última nota do trimestre; copiar diagnóstico e código; baixar', async () => {
    const write = vi.fn(async (_t: string) => undefined); Object.assign(navigator, { clipboard: { writeText: write } })
    URL.createObjectURL = vi.fn(() => 'blob:x'); URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    historico = [
      { id: 'h1', empresa: 'Loja Centro', nota: 40, lacunas: 9, caso_id: 'k1', criado_em: '2026-02-10T12:00:00Z' },
      { id: 'h2', empresa: 'Loja Centro', nota: 55, lacunas: 6, caso_id: null, criado_em: '2026-03-10T12:00:00Z' },
      { id: 'h3', empresa: 'Outra', nota: 90, lacunas: 1, caso_id: null, criado_em: '2026-05-10T12:00:00Z' },
      { id: 'h4', empresa: 'Loja Centro', nota: 70, lacunas: 3, caso_id: 'k4', criado_em: '2026-08-10T12:00:00Z' },
    ]
    render(<CompliancePage />)
    await waitFor(() => expect(screen.getAllByTestId('trimestre').length).toBe(3))
    fireEvent.change(screen.getByLabelText('Empresa avaliada'), { target: { value: 'loja centro' } })
    expect(screen.getAllByTestId('trimestre').map(t => t.textContent)).toEqual(['55%1T/2026', '70%3T/2026'])
    fireEvent.click(screen.getByTestId('resp-0-0-2'))
    await waitFor(() => expect(screen.getByTestId('codigo-integridade')).toBeTruthy())
    fireEvent.click(screen.getByTestId('copiar-diagnostico'))
    await waitFor(() => expect(screen.getByTestId('copiar-diagnostico').textContent).toBe('Diagnóstico copiado'))
    expect(write.mock.calls[0][0]).toContain('Diagnóstico de compliance — loja centro —')
    expect(write.mock.calls[0][0]).toContain('Nota geral: 100% (maduro) · 1 de 18 perguntas')
    fireEvent.click(screen.getByTestId('copiar-codigo'))
    await waitFor(() => expect(screen.getByTestId('copiar-codigo').textContent).toBe('código copiado'))
    expect(write.mock.calls[1][0]).toMatch(/código de integridade SHA-256 [0-9a-f]{64}$/)
    fireEvent.click(screen.getByTestId('baixar-diagnostico'))
    expect(click).toHaveBeenCalled()
    expect(screen.getByTestId('baixar-diagnostico').textContent).toBe('Baixado')
    click.mockRestore()
  })

  it('D08: Baixar PDF selado só com resposta; gera o relatório com pilares, lacunas e código; baixa .pdf e .ots e explica', async () => {
    render(<CompliancePage />)
    expect(screen.queryByTestId('baixar-pdf-selado')).toBeNull()
    fireEvent.click(screen.getAllByText('Não')[0])
    expect((screen.getByTestId('baixar-pdf-selado') as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(screen.getByTestId('baixar-pdf-selado'))
    await waitFor(() => expect(screen.getByTestId('msg-selo').textContent).toContain('PDF baixado (SHA-256 cccccccccccc…) com o selo .ots via alice'))
    expect(gerar).toHaveBeenCalledWith(expect.objectContaining({ geral: 0, lacunas: [expect.objectContaining({ v: 0 })] }))
    expect(baixar.mock.calls.map(c => c[0])).toEqual(['compliance-x-2026-11-06.pdf', 'compliance-x-2026-11-06.pdf.ots'])
  })
})
