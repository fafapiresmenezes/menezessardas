// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const emDias = (n: number) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const nb = (s: string | null | undefined) => (s ?? '').replace(/ /g, ' ')
let imoveis = [
  { id: 'i1', endereco: 'Rua A', cidade: 'Rio', uf: 'RJ', tipo: 'apartamento', uso: 'locado', proprietario: 'X', matricula: '1', notas: '', documentos: [{ id: 'd1', tipo: 'iptu', nome: 'IPTU', enviadoEm: '2026-01-01', dataVencimento: emDias(200) }, { id: 'd2', tipo: 'avcb', nome: 'AVCB', enviadoEm: '2026-01-01', dataVencimento: emDias(-3) }] },
  { id: 'i2', endereco: 'Rua B', cidade: 'Rio', uf: 'RJ', tipo: 'apartamento', uso: 'locado', proprietario: 'X', matricula: '2', notas: '', documentos: [] },
  { id: 'i3', endereco: 'Rua C', cidade: 'Rio', uf: 'RJ', tipo: 'loja', uso: 'uso_proprio', proprietario: 'X', matricula: '3', notas: '', documentos: [] },
]
let alertas = [
  { id: 'a1', imovelId: 'i1', imovel: 'Rua A', tipo: 'vencimento', titulo: 'Vencimento de contrato', dataEvento: emDias(10), diasRestantes: 10 },
  { id: 'a2', imovelId: 'i1', imovel: 'Rua A', tipo: 'reajuste', titulo: 'Reajuste', dataEvento: emDias(50), diasRestantes: 50 },
  { id: 'a3', imovelId: 'i2', imovel: 'Rua B', tipo: 'documento', titulo: 'Doc', dataEvento: emDias(200), diasRestantes: 200 },
  { id: 'a4', imovelId: 'i1', imovel: 'Rua A', tipo: 'documento', titulo: 'AVCB', dataEvento: emDias(-3), diasRestantes: -3 },
]
const base = { indice: 'fixo', garantia: 'caucao', dataUltimoReajuste: null, notas: '', criadoEm: '2025-01-01', documentos: [] as unknown[], dataInicio: '2025-01-01' }
const contratos = [
  { ...base, id: 'c1', imovelId: 'i1', tipo: 'locacao_residencial', parte: 'A', dataVencimento: emDias(200), valor: 3000, periodicidade: 'mensal' },
  { ...base, id: 'c2', imovelId: 'i2', tipo: 'locacao_comercial', parte: 'B', dataVencimento: emDias(30), valor: 12000, periodicidade: 'trimestral' },
  { ...base, id: 'c3', imovelId: 'i3', tipo: 'locacao_comercial', parte: 'C', dataVencimento: emDias(-10), valor: 5000, periodicidade: 'mensal' },
]
let carregando = false
let ultimo: object | null = { mes: '2026-10-01', enviado_em: '2026-11-01T11:00:00Z', destinatarios: 2, sha256: 'abc' }
const invoke = vi.fn(async (_n: string, _o: object): Promise<{ data?: Record<string, unknown>; error: { message: string } | null }> => ({ data: { enviado: true, mes: '2026-10-01', sha256: 'abcdef1234567890' }, error: null }))
let horasLanc: Record<string, unknown>[] = []
let casosHon: Record<string, unknown>[] = []
const from = (t: string) => { const o: Record<string, unknown> = {}; for (const m of ['select', 'order', 'limit', 'maybeSingle', 'eq']) o[m] = () => o; o.then = (f: (v: unknown) => unknown) => Promise.resolve({ data: t === 'relatorios_mensais' ? ultimo : t === 'lancamentos_horas' ? horasLanc : t === 'tarefas' ? casosHon : null }).then(f); return o }
vi.mock('@/lib/equipe', () => ({ listarPessoas: async () => [{ id: 'u1', nome: 'Letícia', email: 'l@x' }] }))
// Privacidade por advogado: a tela precisa saber quem está logado (aqui, a própria Letícia) para mostrar as horas e os casos dela.
vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: true, supabase: { from, functions: { invoke: (n: string, o: object) => invoke(n, o) }, auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } } }))
vi.mock('@/hooks/useImoveis', () => ({ useImoveis: () => ({ imoveis, loading: carregando }) }))
vi.mock('@/hooks/useAlertas', () => ({ useAlertas: () => ({ alertas, loading: false }) }))
vi.mock('@/lib/repositorio', () => ({ repositorio: { listarContratos: async () => contratos } }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: RelatoriosPage } = await import('./RelatóriosPage')
const montar = () => render(<MemoryRouter><RelatoriosPage /></MemoryRouter>)
const cartao = (r: string) => nb(screen.getByText(r).nextElementSibling!.textContent)
const valorDe = (secao: string, r: string) => within(document.querySelector(`section[aria-labelledby="${secao}"]`) as HTMLElement).getByText(r).nextElementSibling!.textContent

describe('Relatórios', () => {
  beforeEach(() => { cleanup(); localStorage.clear(); invoke.mockReset().mockImplementation(async () => ({ data: { enviado: true, mes: '2026-10-01', sha256: 'abcdef1234567890' }, error: null })); carregando = false; ultimo = { mes: '2026-10-01', enviado_em: '2026-11-01T11:00:00Z', destinatarios: 2, sha256: 'abc' } })

  it('mostra preparação, depois os indicadores do trimestre: compromissos, vencidos, receita no período e mensal, contratos, documentos e carteira; horizonte lembrado', async () => {
    montar()
    expect(screen.getByText('Preparando relatórios…')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Compromissos no período')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Próximo trimestre' }).getAttribute('aria-pressed')).toBe('true')
    expect(cartao('Compromissos no período')).toBe('2'); expect(cartao('Pendências vencidas')).toBe('1')
    expect(cartao('Receita contratada no período')).toBe('R$ 21.000'); expect(cartao('Receita mensal contratada')).toBe('R$ 7.000')
    expect(valorDe('t-contratos', 'Ativos')).toBe('1'); expect(valorDe('t-contratos', 'A renovar (até 60 dias)')).toBe('1'); expect(valorDe('t-contratos', 'Vencidos')).toBe('1')
    expect(valorDe('t-docs', 'Documentos válidos')).toBe('1'); expect(valorDe('t-docs', 'A renovar')).toBe('0'); expect(valorDe('t-docs', 'Vencidos')).toBe('1')
    const comp = document.querySelector('section[aria-labelledby="t-compromissos"]') as HTMLElement
    expect(within(comp).getByText('Vencimento de contrato').parentElement!.textContent).toContain('1')
    expect(within(comp).getByText('Reajuste contratual')).toBeTruthy()
    expect(within(comp).queryByText('Vencimento de documento')).toBeNull()
    const cart = document.querySelector('section[aria-labelledby="t-imoveis"]') as HTMLElement
    expect(within(cart).getByText('Apartamento').parentElement!.textContent).toContain('2'); expect(within(cart).getByText('Loja').parentElement!.textContent).toContain('1')
    await waitFor(() => expect(screen.getByTestId('relatorio-mensal').textContent).toContain('Último enviado: 10/2026 em 01/11/2026 a 2 pessoa(s).'))
    fireEvent.click(screen.getByRole('button', { name: 'Próximos 30 dias' }))
    expect(cartao('Compromissos no período')).toBe('1'); expect(cartao('Receita contratada no período')).toBe('R$ 7.000')
    expect(localStorage.getItem('lsm-relatorio-periodo')).toBe('30')
    fireEvent.click(screen.getByRole('button', { name: 'Próximo ano' }))
    expect(cartao('Compromissos no período')).toBe('3'); expect(cartao('Receita contratada no período')).toBe('R$ 85.167')
    expect(within(comp).getByText('Vencimento de documento')).toBeTruthy()
    cleanup(); montar()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Próximo ano' }).getAttribute('aria-pressed')).toBe('true'))
  })

  it('copiar resumo do período, copiar link, imprimir e baixar CSV; relatório mensal de teste por e-mail e PDF, com erros explicados', async () => {
    const write = vi.fn(async (_t: string) => undefined); Object.assign(navigator, { clipboard: { writeText: write } })
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() }); window.print = vi.fn()
    montar()
    await waitFor(() => expect(screen.getByText('Compromissos no período')).toBeTruthy())
    fireEvent.click(screen.getByTestId('copiar-periodo'))
    expect(screen.getByTestId('copiar-periodo').textContent).toBe('Resumo copiado')
    const resumo = nb(write.mock.calls[0][0]).split('\n')
    expect(resumo[0]).toContain('(90 dias)'); expect(resumo[1]).toBe('Imóveis: 3 · Contratos: 3'); expect(resumo[2]).toBe('Alertas no período: 2 · Vencidos em aberto: 1')
    expect(resumo[3]).toBe('Receita estimada no período: R$ 21.000,00'); expect(resumo.slice(4)).toEqual(['  Vencimento de contrato: 1', '  Reajuste contratual: 1'])
    fireEvent.click(screen.getByTestId('copiar-link-relatorios'))
    await waitFor(() => expect(screen.getByTestId('copiar-link-relatorios').textContent).toBe('Link copiado'))
    fireEvent.click(screen.getByTestId('imprimir-periodo')); expect(window.print).toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('baixar-relatorio'))
    expect(screen.getByTestId('baixar-relatorio').textContent).toBe('Baixado'); expect(clique).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('datas-periodo').textContent).toContain('Este relatório cobre de')
    fireEvent.click(screen.getByTestId('testar-mensal'))
    expect(screen.getByTestId('msg-mensal').textContent).toBe('Gerando o PDF e enviando para o seu e-mail…')
    expect((screen.getByTestId('baixar-mensal') as HTMLButtonElement).disabled).toBe(true)
    await waitFor(() => expect(screen.getByTestId('msg-mensal').textContent).toContain('Relatório de 2026-10 enviado para o seu e-mail (SHA-256 abcdef123456…)'))
    expect(invoke).toHaveBeenCalledWith('relatorio-mensal', { body: { teste: true } })
    invoke.mockResolvedValueOnce({ data: { enviado: false, motivo: 'sem destinatários' }, error: null })
    fireEvent.click(screen.getByTestId('testar-mensal'))
    await waitFor(() => expect(screen.getByTestId('msg-mensal').textContent).toBe('Não enviado: sem destinatários.'))
    invoke.mockResolvedValueOnce({ error: { message: 'função indisponível' } })
    fireEvent.click(screen.getByTestId('testar-mensal'))
    await waitFor(() => expect(screen.getByTestId('msg-mensal').textContent).toBe('Não foi possível enviar: função indisponível'))
    invoke.mockResolvedValueOnce({ data: { pdf_base64: btoa('%PDF-1.4 teste'), arquivo: 'relatorio-2026-10.pdf', sha256: '0123456789abcdef' }, error: null })
    fireEvent.click(screen.getByTestId('baixar-mensal'))
    await waitFor(() => expect(screen.getByTestId('msg-mensal').textContent).toBe('PDF gerado (SHA-256 0123456789ab…).'))
    expect(invoke).toHaveBeenLastCalledWith('relatorio-mensal', { body: { teste: true, baixar: true } })
    expect(clique).toHaveBeenCalledTimes(2)
    invoke.mockResolvedValueOnce({ data: { erro: 'sem dados' }, error: null })
    fireEvent.click(screen.getByTestId('baixar-mensal'))
    await waitFor(() => expect(screen.getByTestId('msg-mensal').textContent).toBe('Não foi possível gerar: sem dados'))
    clique.mockRestore()
  })

  it('sem compromissos no horizonte mostra o vazio e sem relatório anterior avisa que o primeiro vai no dia 1', async () => {
    alertas = []; ultimo = null
    montar()
    await waitFor(() => expect(screen.getByText('Nenhum compromisso neste horizonte')).toBeTruthy())
    expect(cartao('Compromissos no período')).toBe('0'); expect(cartao('Pendências vencidas')).toBe('0')
    expect(screen.getByText(/Escolha um horizonte maior/)).toBeTruthy()
    expect(screen.getByTestId('relatorio-mensal').textContent).toContain('O primeiro vai no próximo dia 1.')
  })

  it('D10: por cliente e por sócio consolida horas e honorários; vazio explica; CSV', async () => {
    horasLanc = [{ usuario_id: 'u1', cliente: 'Ana', minutos: 120, valor_hora: 200, faturavel: true }]
    casosHon = [{ cliente: 'Ana', responsavel_id: 'u1', honorario_previsto: 5000, honorario_recebido: 1500 }]
    render(<RelatoriosPage />)
    const sec = await screen.findByTestId('por-cliente-socio')
    await waitFor(() => expect(sec.textContent).toContain('Letícia'))
    expect(sec.textContent).toContain('Ana'); expect(sec.textContent).toContain('100%')
    expect(sec.textContent).toMatch(/1\.100/)
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    fireEvent.click(screen.getByTestId('baixar-clientes-socios'))
    expect(clique).toHaveBeenCalled(); expect(screen.getByTestId('baixar-clientes-socios').textContent).toBe('Baixado')
    clique.mockRestore(); horasLanc = []; casosHon = []
  })
})
