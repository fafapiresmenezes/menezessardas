// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react'

const nb = (s: string | null | undefined) => (s ?? '').replace(/ /g, ' ')
let configurado = true
let carregandoImoveis = false
const imoveis = [{ id: 'i1', endereco: 'Rua das Flores 123' }]
const alertas = [{ id: 'a1', imovelId: 'i1', imovel: 'Rua das Flores 123', tipo: 'vencimento', titulo: 'Vencimento de contrato', dataEvento: '2026-11-20', diasRestantes: 18 }]
const kpis = { imoveis: 12, vacancia: 25, receitaContratadaMensal: 48000, documentacaoEmDia: 88, prazoMedioDias: 210, contratosVencidos: 2 }
const okrs = [{ titulo: 'Carteira saudável', keyResults: [{ descricao: 'Imóveis sem pendência vencida', atual: 92, meta: 90, unidade: '%' }, { descricao: 'Vacância', atual: 25, meta: 10, unidade: '%', menorMelhor: true }, { descricao: 'Contratos vencidos', atual: 2, meta: 0, unidade: 'un' }] }]
const risco = [{ imovelId: 'i1', rotulo: 'Rua das Flores 123', probabilidade: 'alto', impacto: 'alto' }, { imovelId: 'i2', rotulo: 'Av. Atlântica 500', probabilidade: 'baixo', impacto: 'medio' }]
const pendencias = [{ id: 'a1', rotulo: 'Vencimento de contrato', urgencia: 'alto', importancia: 'alto' }]
let revisoes: Record<string, unknown>[] = []
let aderencia: Record<string, unknown>[] = []
let taxaUtil: Record<string, unknown>[] = []
const invoke = vi.fn(async (_n: string): Promise<{ data?: unknown; error: { message: string } | null }> => ({ data: { data: '2026-11-02', periodo: '30 dias', vencimentos: 3, reajustes: 2, documentos: 1, receitaEmRisco: 22000, proximosPassos: ['3 contratos vencem nos próximos 30 dias.', 'Renovar o AVCB da loja.'] }, error: null }))
const rpc = vi.fn(async (nome: string) => ({ data: nome === 'aderencia_consultores' ? aderencia : taxaUtil }))
const insert = vi.fn(async (_v: Record<string, unknown>): Promise<{ error: { message: string } | null }> => ({ error: null }))
let metasGuardadas: string | null = null
const upsert = vi.fn(async (_v: Record<string, unknown>) => ({ error: null }))
const from = (t: string) => ({ select: () => ({ order: () => ({ limit: () => ({ then: (f: (v: unknown) => unknown) => Promise.resolve({ data: t === 'revisoes_okr' ? revisoes : [] }).then(f) }) }), eq: () => ({ maybeSingle: () => ({ then: (f: (v: unknown) => unknown) => Promise.resolve({ data: metasGuardadas ? { valor: metasGuardadas } : null }).then(f) }) }) }), insert: (v: Record<string, unknown>) => insert(v), upsert: (v: Record<string, unknown>) => upsert(v) })
vi.mock('@/lib/config', () => ({
  lerConfig: async () => (metasGuardadas ? { metas_okr: metasGuardadas } : {}),
  gravarConfig: async (itens: Record<string, string>) => { await upsert({ chave: 'metas_okr', valor: itens.metas_okr }) },
}))
const calcularOKRs = vi.fn((..._a: unknown[]) => okrs)
const selar = vi.fn(async (_h: string) => ({ ots: new Uint8Array([1, 2]), calendario: 'https://alice.btc.calendar.opentimestamps.org' }))
const baixar = vi.fn((_n: string, _c: unknown) => undefined)
vi.mock('@/lib/supabase', () => ({ get supabaseConfigurado() { return configurado }, supabase: { functions: { invoke: (n: string) => invoke(n) }, rpc: (n: string) => rpc(n), from, auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } } }))
vi.mock('@/hooks/useImoveis', () => ({ useImoveis: () => ({ imoveis, loading: carregandoImoveis }) }))
vi.mock('@/hooks/useAlertas', () => ({ useAlertas: () => ({ alertas, loading: false }) }))
vi.mock('@/lib/repositorio', () => ({ repositorio: { listarContratos: async () => [] } }))
vi.mock('@/lib/indicadores', () => ({ calcularKPIs: () => kpis, calcularOKRs: (...a: unknown[]) => calcularOKRs(...a), matrizRisco: () => risco, matrizPendencias: () => pendencias, tendencia12Meses: () => [{ mes: '2026-11' }, { mes: '2026-12' }] }))
vi.mock('@/lib/exportarTrilha', () => ({ selarDigest: (h: string) => selar(h) }))
vi.mock('@/lib/ancoragem', () => ({ baixarArquivo: (n: string, c: unknown) => baixar(n, c) }))
vi.mock('@/components/CalibracaoPrevisoes', () => ({ default: () => <div data-testid="calibracao-stub" /> }))
vi.mock('@/components/GraficoTendencia', () => ({ default: ({ pontos }: { pontos: unknown[] }) => <div data-testid="grafico-stub">{pontos.length} meses</div> }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: IndicadoresPage } = await import('./IndicadoresPage')
const tiles = () => screen.getByRole('region', { name: 'Indicadores-chave' }) as HTMLElement
const tile = (r: string) => nb(within(tiles()).getByText(r).nextElementSibling!.textContent)
const celulas = (nome: string) => Array.from((screen.getByRole('region', { name: nome }) as HTMLElement).querySelectorAll('div.min-h-\\[70px\\]')).map(c => c.textContent)

describe('Indicadores', () => {
  const write = vi.fn(async (_t: string) => undefined)
  beforeEach(() => { cleanup(); configurado = true; carregandoImoveis = false; revisoes = []; aderencia = []; taxaUtil = []; invoke.mockClear(); rpc.mockClear(); insert.mockClear(); selar.mockClear(); baixar.mockClear(); write.mockClear(); Object.assign(navigator, { clipboard: { writeText: write } }) })

  it('calcula e mostra os KPIs com explicação e atalho, OKRs com barras e metas-teto, matrizes de risco e pendências, tendência e resumo do Agente Guardião; copiar, link, CSV e imprimir', async () => {
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() }); window.print = vi.fn()
    render(<IndicadoresPage />)
    expect(screen.getByText('Calculando indicadores…')).toBeTruthy()
    await waitFor(() => expect(screen.getAllByTestId('kpi-tile').length).toBe(6))
    expect(tile('Imóveis na carteira')).toBe('12'); expect(tile('Taxa de vacância')).toBe('25%'); expect(tile('Receita contratada / mês')).toBe('R$ 48.000'); expect(tile('Documentação em dia')).toBe('88%'); expect(tile('Prazo médio de vencimento')).toBe('210 dias'); expect(tile('Contratos vencidos')).toBe('2')
    expect(within(tiles()).getByText('Documentação em dia').nextElementSibling!.className).toContain('text-atencao'); expect(within(tiles()).getByText('Contratos vencidos').nextElementSibling!.className).toContain('text-critico')
    expect(screen.getAllByTestId('kpi-tile')[2].getAttribute('href')).toBe('#/honorarios')
    expect(screen.getAllByTestId('kpi-explica')[1].textContent).toBe('Parte dos imóveis sem contrato ativo. Quanto menor, melhor.')
    const okr = document.querySelector('section[aria-labelledby="t-okr"]') as HTMLElement
    expect(within(okr).getByText('Carteira saudável')).toBeTruthy()
    expect(within(okr).getByText('Imóveis sem pendência vencida').nextElementSibling!.textContent).toBe('92% / meta 90%')
    expect(within(okr).getByText('Imóveis sem pendência vencida').nextElementSibling!.className).toContain('text-regular')
    expect(within(okr).getByText('Vacância').nextElementSibling!.textContent).toBe('25% / meta ≤ 10%'); expect(within(okr).getByText('Vacância').nextElementSibling!.className).toContain('text-atencao')
    expect(within(okr).getByText('Contratos vencidos').nextElementSibling!.textContent).toBe('2 / meta 0')
    const r = celulas('Matriz de risco dos contratos')
    expect(r.length).toBe(9); expect(r[2]).toBe('Rua das Flores 123'); expect(r[7]).toBe('Av. Atlântica 500')
    expect(celulas('Matriz de pendências')[2]).toBe('Vencimento de contrato')
    expect(screen.getByTestId('grafico-stub').textContent).toBe('2 meses'); expect(screen.getByTestId('calibracao-stub')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Vencimentos').nextElementSibling!.textContent).toBe('3'))
    expect(invoke).toHaveBeenCalledWith('agente-guardiao')
    expect(nb(screen.getByText('Receita em risco').nextElementSibling!.textContent)).toBe('R$ 22.000')
    expect(screen.getByText('Renovar o AVCB da loja.')).toBeTruthy(); expect(screen.getByText('Período: próximos 30 dias')).toBeTruthy()
    invoke.mockResolvedValueOnce({ error: { message: 'Function not found' } })
    fireEvent.click(screen.getByTitle('Atualizar resumo do Agente Guardião'))
    await waitFor(() => expect(document.querySelector('section[aria-labelledby="t-resumo"] p.text-critico')).toBeTruthy())
    fireEvent.click(screen.getByTestId('copiar-indicadores'))
    await waitFor(() => expect(screen.getByTestId('copiar-indicadores').textContent).toBe('Indicadores copiados'))
    const linhas = nb(write.mock.calls[0][0]).split('\n')
    expect(linhas[0]).toContain('Indicadores ·'); expect(linhas[1]).toBe('Imóveis na carteira: 12 — Quantos imóveis o escritório administra hoje.'); expect(linhas[3]).toBe('Receita contratada / mês: R$ 48.000 — Soma dos aluguéis dos contratos ativos. Não é o valor recebido.')
    fireEvent.click(screen.getByTestId('copiar-link-indicadores'))
    await waitFor(() => expect(screen.getByTestId('copiar-link-indicadores').textContent).toBe('link copiado'))
    fireEvent.click(screen.getByTestId('baixar-indicadores'))
    expect(screen.getByTestId('baixar-indicadores').textContent).toBe('Baixado'); expect(clique).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByTestId('imprimir-indicadores')); fireEvent.click(screen.getByText('Exportar PDF')); expect(window.print).toHaveBeenCalledTimes(2)
    clique.mockRestore()
  })

  it('ciclo trimestral de OKR: trimestre e prazos, ata curta recusada, ata gravada com SHA-256 e selo, revisões listadas com prova .ots copiáveis; erro ao gravar', async () => {
    revisoes = [{ id: 'r1', trimestre: '2026-T3', ata: 'Carteira regular em 92%.', sha256: 'c'.repeat(64), ots_b64: btoa('ots'), calendario: 'https://alice', criado_em: '2026-09-30T12:00:00Z' }, { id: 'r2', trimestre: '2026-T2', ata: 'x'.repeat(450), sha256: 'd'.repeat(64), ots_b64: null, calendario: null, criado_em: '2026-06-30T12:00:00Z' }]
    render(<IndicadoresPage />)
    await waitFor(() => expect(screen.getByTestId('ciclo-okr')).toBeTruthy())
    const hoje = new Date(); const tri = `${hoje.getFullYear()}-T${Math.floor(hoje.getMonth() / 3) + 1}`
    expect(screen.getByTestId('okr-trimestre').textContent).toBe(tri)
    expect(screen.getByTestId('ciclo-okr').textContent).toContain('(15 dias antes)')
    await waitFor(() => expect(screen.getAllByTestId('okr-revisao').length).toBe(2))
    const [r1, r2] = screen.getAllByTestId('okr-revisao')
    expect(r1.textContent).toContain('2026-T3'); expect(r1.textContent).toContain('cccccccccccccccccccc…'); expect(within(r1).getByText('prova de data (.ots)')).toBeTruthy()
    expect(within(r2).queryByText('prova de data (.ots)')).toBeNull(); expect(r2.textContent).toContain('x'.repeat(400) + '…')
    fireEvent.click(within(r1).getByText('prova de data (.ots)'))
    expect(baixar).toHaveBeenCalledWith('ata-okr-2026-T3.ots', new Uint8Array([111, 116, 115]))
    fireEvent.click(screen.getByTestId('copiar-revisoes'))
    await waitFor(() => expect(write).toHaveBeenCalled())
    const linhas = write.mock.calls[0][0].split('\n')
    expect(linhas[0]).toBe('Revisões de OKR — THEYE Institute'); expect(linhas[1]).toContain(`2026-T3 ·`); expect(linhas[1]).toContain(`SHA-256 ${'c'.repeat(64)} · OTS`); expect(linhas[2].endsWith('d'.repeat(64))).toBe(true)
    fireEvent.click(screen.getByTestId('okr-gravar'))
    expect(screen.getByTestId('okr-msg').textContent).toBe('Escreva a ata da revisão (pelo menos 20 caracteres).')
    expect(insert).not.toHaveBeenCalled()
    fireEvent.change(screen.getByTestId('okr-ata'), { target: { value: '  Carteira regular ficou em 92% (meta 90%). Vacância alta.  ' } })
    fireEvent.click(screen.getByTestId('okr-gravar'))
    expect(screen.getByText('Gravando…')).toBeTruthy()
    await waitFor(() => expect(screen.getByTestId('okr-msg').textContent).toContain(`Ata do ${tri} gravada. SHA-256 `))
    expect(screen.getByTestId('okr-msg').textContent).toContain('· selo enviado a alice.btc.calendar.opentimestamps.org')
    const gravado = insert.mock.calls[0][0]
    expect(gravado).toMatchObject({ trimestre: tri, ata: 'Carteira regular ficou em 92% (meta 90%). Vacância alta.', calendario: 'https://alice.btc.calendar.opentimestamps.org', ots_b64: btoa('\x01\x02'), criado_por: 'u1' })
    expect(String(gravado.sha256)).toMatch(/^[0-9a-f]{64}$/); expect(selar).toHaveBeenCalledWith(gravado.sha256)
    expect((gravado.okrs as { titulo: string; keyResults: unknown[] }[])[0]).toEqual({ titulo: 'Carteira saudável', keyResults: [{ descricao: 'Imóveis sem pendência vencida', atual: 92, meta: 90, unidade: '%' }, { descricao: 'Vacância', atual: 25, meta: 10, unidade: '%' }, { descricao: 'Contratos vencidos', atual: 2, meta: 0, unidade: 'un' }] })
    expect((screen.getByTestId('okr-ata') as HTMLTextAreaElement).value).toBe('')
    selar.mockResolvedValueOnce(null as never)
    fireEvent.change(screen.getByTestId('okr-ata'), { target: { value: 'Segunda ata do trimestre, sem selo disponível.' } })
    fireEvent.click(screen.getByTestId('okr-gravar'))
    await waitFor(() => expect(screen.getByTestId('okr-msg').textContent).toContain('· selo não obtido agora'))
    expect(insert.mock.calls[1][0]).toMatchObject({ ots_b64: null, calendario: null })
    insert.mockResolvedValueOnce({ error: { message: 'permission denied for table revisoes_okr' } })
    fireEvent.change(screen.getByTestId('okr-ata'), { target: { value: 'Terceira ata do trimestre para testar o erro.' } })
    fireEvent.click(screen.getByTestId('okr-gravar'))
    await waitFor(() => expect(screen.getByTestId('okr-msg').textContent).toContain('Não foi possível gravar:'))
  })

  it('aderência aos consultores por nível com barra e vazio; utilidade mensal do assistente com taxa colorida; sem banco usa o resumo de exemplo e esconde as seções', async () => {
    aderencia = [{ nivel: 'nivel_socio_gestor', total: 5, feitas: 4, aderencia: 80, gerado_em: '2026-10-27T09:00:00Z' }, { nivel: 'nivel_junior', total: 3, feitas: 1, aderencia: 33, gerado_em: '2026-10-27T09:00:00Z' }, { nivel: 'nivel_ti', total: 0, feitas: 0, aderencia: null, gerado_em: '2026-10-27T09:00:00Z' }]
    taxaUtil = [{ mes: '2026-10', respostas: 40, avaliadas: 10, uteis: 8, pct: 80 }, { mes: '2026-09', respostas: 12, avaliadas: 5, uteis: 2, pct: 40 }, { mes: '2026-08', respostas: 3, avaliadas: 0, uteis: 0, pct: null }]
    render(<IndicadoresPage />)
    await waitFor(() => expect(screen.getByTestId('aderencia-nivel_socio_gestor')).toBeTruthy())
    const sg = screen.getByTestId('aderencia-nivel_socio_gestor')
    expect(sg.textContent).toContain('Sócia gestora'); expect(within(sg).getByTestId('aderencia-pct').textContent).toBe('80%'); expect(sg.textContent).toContain('4 de 5 ações · diagnóstico de 27/10/2026')
    expect(within(sg).getByRole('progressbar', { name: 'Aderência Sócia gestora' }).getAttribute('aria-valuenow')).toBe('80')
    expect(within(sg).getByRole('progressbar').firstElementChild!.className).toContain('bg-regular')
    expect(within(screen.getByTestId('aderencia-nivel_junior')).getByRole('progressbar').firstElementChild!.className).toContain('bg-critico')
    expect(within(screen.getByTestId('aderencia-nivel_ti')).getByTestId('aderencia-pct').textContent).toBe('sem ações abertas')
    expect(within(screen.getByTestId('util-2026-10')).getByTestId('util-pct').textContent).toBe('80%'); expect(within(screen.getByTestId('util-2026-10')).getByTestId('util-pct').className).toContain('text-regular')
    expect(within(screen.getByTestId('util-2026-09')).getByTestId('util-pct').className).toContain('text-atencao')
    expect(within(screen.getByTestId('util-2026-08')).getByTestId('util-pct').textContent).toBe('sem avaliações')
    expect(screen.getByTestId('util-2026-10').textContent).toContain('40'); expect(screen.getByTestId('util-2026-10').textContent).toContain('out')
    cleanup(); aderencia = []
    render(<IndicadoresPage />)
    await waitFor(() => expect(screen.getByTestId('aderencia-vazia')).toBeTruthy())
    cleanup(); configurado = false; invoke.mockClear(); rpc.mockClear()
    render(<IndicadoresPage />)
    await waitFor(() => expect(screen.getByText('Vencimentos').nextElementSibling!.textContent).toBe('2'))
    expect(invoke).not.toHaveBeenCalled(); expect(rpc).not.toHaveBeenCalled()
    expect(screen.getByText('2 contratos vencem nos próximos 30 dias.')).toBeTruthy()
    expect(screen.queryByTestId('ciclo-okr')).toBeNull(); expect(screen.queryByTestId('aderencia-consultores')).toBeNull(); expect(screen.queryByTestId('utilidade-assistente')).toBeNull()
  })

  it('D04: Editar metas mostra um campo por resultado-chave, salva nas configurações do escritório (metas_okr) e recalcula os OKRs com as metas', async () => {
    configurado = true; metasGuardadas = JSON.stringify({ 'Documentação em dia': 97 })
    render(<IndicadoresPage />)
    await waitFor(() => expect(calcularOKRs).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), expect.anything(), { 'Documentação em dia': 97 }))
    fireEvent.click(screen.getByTestId('editar-metas'))
    const campo = screen.getAllByLabelText(/^Meta: /)[0] as HTMLInputElement
    fireEvent.change(campo, { target: { value: '85' } })
    fireEvent.click(screen.getByTestId('salvar-metas'))
    await waitFor(() => expect(upsert).toHaveBeenCalled())
    const salvo = JSON.parse(upsert.mock.calls[0][0].valor as string)
    expect(salvo['Documentação em dia']).toBe(97)
    expect(Object.values(salvo)).toContain(85)
    expect(screen.getByRole('status').textContent).toContain('Metas salvas')
    metasGuardadas = null
  })
})
