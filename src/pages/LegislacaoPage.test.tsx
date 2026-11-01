// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CATALOGO, ROTULO_STATUS, type Norma, type NovidadePortal } from '@/lib/legislacao'

const imoveis = [
  { id: 'i1', endereco: 'Rua das Flores 123', cidade: 'Rio', uf: 'RJ', tipo: 'apartamento', uso: 'locado', proprietario: 'X', matricula: '1', notas: '', documentos: [] },
  { id: 'i2', endereco: 'Av. Atlântica 500', cidade: 'Rio', uf: 'RJ', tipo: 'loja', uso: 'uso_proprio', proprietario: 'Y', matricula: '2', notas: '', documentos: [] },
]
const novidade: Norma = { id: 'nov-1', catalogo: false, titulo: 'Lei nº 15.000/2026 — altera a Lei do Inquilinato', ementa: 'Muda o prazo da renovatória.', fonte: 'LexML', link: 'https://lexml/15000', alcanceTexto: 'Todos os imóveis', acao: 'Revisar as cláusulas de renovação.', publicadaEm: '2026-10-20' }
let configurado = true
let acompanhamento: Record<string, string> = {}
let radar: NovidadePortal[] = []
let area = 'imobiliario'
const buscar = vi.fn(async () => ({ novidades: [novidade], consultadoEm: '2026-11-02T08:30:00Z', situacao: 'LexML respondeu com 1 norma.' }))
const definir = vi.fn(async (_n: Norma, _s: string) => undefined)
const radarPortais = vi.fn(async (_a?: string) => radar)
const gravarArea = vi.fn(async (_a: string) => undefined)
const invoke = vi.fn(async (_n: string) => ({ data: { leis: [{ numero: '8.245/1991', titulo: 'Lei de Locações Urbanas', dataPublicacao: '18/10/1991', ementas: ['Disciplina a locação dos imóveis urbanos.'], relevancia: 'alta', url: 'https://planalto/l8245' }, { numero: '10.406/2002', titulo: 'Código Civil', dataPublicacao: '10/01/2002', ementas: [], relevancia: 'media', url: 'https://planalto/cc' }] } }))
vi.mock('@/lib/supabase', () => ({ get supabaseConfigurado() { return configurado }, supabase: { functions: { invoke: (n: string) => invoke(n) } } }))
vi.mock('@/hooks/useImoveis', () => ({ useImoveis: () => ({ imoveis, loading: false }) }))
vi.mock('@/lib/legislacao', async (orig) => ({ ...(await orig() as object), buscarNovidades: () => buscar(), definirStatus: (n: Norma, s: string) => definir(n, s), lerAcompanhamento: async () => acompanhamento, radarPortais: (a?: string) => radarPortais(a) }))
vi.mock('@/lib/assistente', async (orig) => ({ ...(await orig() as object), lerAreaAtual: async () => area, gravarAreaAtual: (a: string) => gravarArea(a) }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: LegislacaoPage } = await import('./LegislacaoPage')
const montar = () => render(<MemoryRouter><LegislacaoPage /></MemoryRouter>)
const linhas = () => within(screen.getByRole('region', { name: 'Matriz de legislação' })).getAllByRole('row').slice(1)
const secaoRadar = () => document.querySelector('section[aria-labelledby="titulo-radar"]') as HTMLElement

describe('Legislação', () => {
  const write = vi.fn(async (_t: string) => undefined)
  beforeEach(() => { cleanup(); localStorage.clear(); configurado = true; acompanhamento = {}; radar = []; area = 'imobiliario'; buscar.mockClear(); definir.mockClear(); radarPortais.mockClear(); gravarArea.mockClear(); invoke.mockClear(); write.mockClear(); Object.assign(navigator, { clipboard: { writeText: write } }) })

  it('busca novidades ao abrir e monta a matriz: novidade marcada, catálogo, imóveis afetados com links, acompanhamento carregado e alterável; erro e nova busca', async () => {
    acompanhamento = { 'lei-8245-1991': 'em_analise' }
    montar()
    expect(screen.getByText('Consultando…')).toBeTruthy()
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('LexML respondeu com 1 norma.'))
    expect(screen.getByRole('status').textContent).toContain('Última consulta:')
    const l = linhas()
    expect(l.length).toBe(CATALOGO.length + 1)
    expect(l[0].textContent).toContain('Lei nº 15.000/2026 — altera a Lei do Inquilinato'); expect(l[0].textContent).toContain('Novidade'); expect(l[0].textContent).toContain('20/10/2026'); expect(l[0].textContent).toContain('2 de 2 imóveis'); expect(l[0].textContent).toContain('Revisar as cláusulas de renovação.')
    expect(within(l[0]).getByText('LexML').getAttribute('href')).toBe('https://lexml/15000')
    expect(within(l[0]).getByText('Rua das Flores 123').getAttribute('href')).toBe('/contrato/i1')
    const inquilinato = l.find(r => r.textContent!.includes('Lei do Inquilinato') && r.textContent!.includes('art. 37'))!
    expect(inquilinato.textContent).toContain('1 de 2 imóveis'); expect(within(inquilinato).getByText('Rua das Flores 123')).toBeTruthy(); expect(within(inquilinato).queryByText('Av. Atlântica 500')).toBeNull()
    expect(inquilinato.textContent).toContain(ROTULO_STATUS.em_analise)
    const sel = within(inquilinato).getByLabelText(/Alterar acompanhamento de Lei nº 8.245/) as HTMLSelectElement
    expect(sel.value).toBe('em_analise')
    fireEvent.change(sel, { target: { value: 'concluida' } })
    expect(definir).toHaveBeenCalledWith(expect.objectContaining({ id: 'lei-8245-1991' }), 'concluida')
    expect(inquilinato.textContent).toContain(ROTULO_STATUS.concluida)
    expect(l[0].textContent).toContain(ROTULO_STATUS.nova)
    buscar.mockRejectedValueOnce(new Error('LexML fora do ar'))
    fireEvent.click(screen.getByText('Buscar novidades'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Não foi possível consultar o LexML agora:'))
    expect(buscar).toHaveBeenCalledTimes(2)
    window.print = vi.fn(); fireEvent.click(screen.getByText('Exportar PDF')); expect(window.print).toHaveBeenCalled()
  })

  it('radar dos portais pela área guardada: estado da varredura, filtro lembrado, afetados, copiar radar, imprimir, link e CSV; trocar de área grava; vazio', async () => {
    const hoje = new Date().toISOString()
    radar = [
      { id: 'r1', fonte: 'Câmara dos Deputados', tipo: 'Projeto', titulo: 'PL 3925/2026 muda a Lei do Inquilinato', resumo: 'Altera garantias.', link: 'https://camara/pl', data: '2026-10-28', termo: 'locação', vistoEm: hoje, afetados: [{ tipo: 'contrato', id: 'c1', nome: 'Ana Locatária', palavras: 3 }, { tipo: 'caso', id: 'p1', nome: 'Despejo Loja 3', palavras: 1 }] },
      { id: 'r2', fonte: 'STJ', tipo: 'Notícia', titulo: 'STJ decide sobre fiança', link: 'https://stj/n', vistoEm: hoje },
    ]
    localStorage.setItem('lsm-radar-filtro', 'Projeto')
    montar()
    await waitFor(() => expect(radarPortais).toHaveBeenCalledWith('imobiliario'))
    await waitFor(() => expect(screen.getByTestId('estado-radar')).toBeTruthy())
    expect(screen.getByTestId('estado-radar').textContent).toBe('2 novidades captadas hoje; última varredura há menos de 1 hora.')
    expect((screen.getByTestId('radar-area') as HTMLSelectElement).value).toBe('imobiliario')
    expect(screen.getByRole('radio', { name: 'Projetos de lei' }).getAttribute('aria-checked')).toBe('true')
    const itens = () => within(secaoRadar()).queryAllByRole('listitem')
    expect(itens().length).toBe(1); expect(itens()[0].textContent).toContain('PL 3925/2026 muda a Lei do Inquilinato'); expect(itens()[0].textContent).toContain('Altera garantias.'); expect(itens()[0].textContent).toContain('Câmara dos Deputados · 28/10/2026 · tema: locação')
    const afetados = within(itens()[0]).getByTestId('radar-afetados')
    expect(within(afetados).getByText('contrato Ana Locatária (3 palavras em comum)').getAttribute('href')).toBe('/contrato/c1')
    expect(within(afetados).getByText('caso Despejo Loja 3 (1 palavra em comum)').getAttribute('href')).toBe('/projetos')
    fireEvent.click(screen.getByRole('radio', { name: 'Tudo' }))
    expect(itens().length).toBe(2); expect(localStorage.getItem('lsm-radar-filtro')).toBe('todos')
    fireEvent.click(screen.getByRole('radio', { name: 'Notícias' }))
    expect(itens().length).toBe(1); expect(itens()[0].textContent).toContain('STJ decide sobre fiança')
    fireEvent.click(screen.getByTestId('copiar-radar'))
    await waitFor(() => expect(write).toHaveBeenCalled())
    const texto = write.mock.calls[0][0].split('\n')
    expect(texto[0]).toContain('Radar de legislação ·'); expect(texto[0]).toContain('· 2 novidade(s)')
    expect(texto[1]).toBe('Projeto · PL 3925/2026 muda a Lei do Inquilinato · Câmara dos Deputados · 28/10/2026'); expect(texto[2]).toBe('  https://camara/pl')
    window.print = vi.fn(); fireEvent.click(screen.getByTestId('imprimir-radar')); expect(window.print).toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('copiar-link-radar'))
    await waitFor(() => expect(screen.getByTestId('copiar-link-radar').textContent).toBe('Link copiado'))
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined); Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() })
    fireEvent.click(screen.getByTestId('baixar-radar'))
    expect(screen.getByTestId('baixar-radar').textContent).toBe('Baixado'); expect(clique).toHaveBeenCalledTimes(1)
    clique.mockRestore()
    radar = []
    fireEvent.change(screen.getByTestId('radar-area'), { target: { value: 'todas' } })
    await waitFor(() => expect(radarPortais).toHaveBeenLastCalledWith(undefined))
    expect(gravarArea).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByTestId('radar-vazio')).toBeTruthy())
    expect(screen.queryByTestId('estado-radar')).toBeNull(); expect(screen.queryByTestId('copiar-radar')).toBeNull()
    fireEvent.change(screen.getByTestId('radar-area'), { target: { value: 'civel' } })
    await waitFor(() => expect(radarPortais).toHaveBeenLastCalledWith('civel'))
    expect(gravarArea).toHaveBeenCalledWith('civel')
    cleanup()
    radar = [{ id: 'r3', fonte: 'TJRJ', tipo: 'Notícia', titulo: 'Antiga', link: 'https://x', vistoEm: new Date(Date.now() - 50 * 3600000).toISOString() }]
    montar()
    await waitFor(() => expect(screen.getByTestId('estado-radar').textContent).toBe('Nada novo hoje; última varredura há 2 dias (atrasada: o esperado é todo dia às 8h30).'))
    expect(screen.getByTestId('estado-radar').className).toContain('border-atencao')
  })

  it('busca de leis: botão só com termo, Enter consulta a função com o termo, lista resultados com ementa e citação copiável; sem banco mostra o exemplo', async () => {
    montar()
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
    const botao = () => screen.getByRole('button', { name: 'Buscar' }) as HTMLButtonElement
    expect(botao().disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Termo de busca de legislação'), { target: { value: 'locação' } })
    expect(botao().disabled).toBe(false)
    fireEvent.keyDown(screen.getByLabelText('Termo de busca de legislação'), { key: 'Enter' })
    expect(screen.getByText('Buscando…')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('2 resultado(s)')).toBeTruthy())
    expect(invoke).toHaveBeenCalledWith('buscar-legislacao?q=loca%C3%A7%C3%A3o')
    expect(screen.getByText('Lei de Locações Urbanas').closest('a')!.getAttribute('href')).toBe('https://planalto/l8245')
    expect(screen.getByText('Disciplina a locação dos imóveis urbanos.')).toBeTruthy()
    expect(screen.getByText(/Lei 10.406\/2002/)).toBeTruthy()
    fireEvent.click(screen.getAllByTestId('copiar-citacao')[0])
    await waitFor(() => expect(screen.getAllByTestId('copiar-citacao')[0].textContent).toBe('citação copiada'))
    expect(write.mock.calls[0][0]).toContain('BRASIL. Lei nº 8.245/1991. Lei de Locações Urbanas. Disciplina a locação dos imóveis urbanos. Disponível em: https://planalto/l8245. Acesso em:')
    fireEvent.click(screen.getAllByTestId('copiar-citacao')[1])
    await waitFor(() => expect(write.mock.calls[1][0]).toBe(`BRASIL. Lei nº 10.406/2002. Código Civil. Disponível em: https://planalto/cc. Acesso em: ${new Date().toLocaleDateString('pt-BR')}.`))
    cleanup(); configurado = false; invoke.mockClear()
    montar()
    fireEvent.change(screen.getByLabelText('Termo de busca de legislação'), { target: { value: 'inquilino' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(screen.getByText('1 resultado(s)')).toBeTruthy())
    expect(invoke).not.toHaveBeenCalled()
    expect(screen.getByText('Lei de Locações Urbanas')).toBeTruthy()
  })
})
