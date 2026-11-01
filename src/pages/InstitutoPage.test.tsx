// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MEDICOES, PLANO_M31 } from '@/data/medicoes'

const hoje = new Date(); const ontem = new Date(hoje.getTime() - 86400000 * 3).toISOString().slice(0, 10)
const imoveis = [
  { id: 'i1', endereco: 'Galpão industrial km 12', cidade: 'Duque de Caxias', uf: 'RJ', tipo: 'galpao', uso: 'industrial', proprietario: 'X', matricula: '1', notas: '', documentos: [] },
  { id: 'i2', endereco: 'Rua das Flores 123', cidade: 'Rio', uf: 'RJ', tipo: 'apartamento', uso: 'locado', proprietario: 'Y', matricula: '2', notas: '', documentos: [
    { id: 'd1', tipo: 'avcb', nome: 'AVCB', enviadoEm: '2026-01-01', dataVencimento: ontem }, { id: 'd2', tipo: 'habite_se', nome: 'Habite-se', enviadoEm: '2026-01-01' }, { id: 'd3', tipo: 'alvara', nome: 'Alvará', enviadoEm: '2026-01-01' }, { id: 'd4', tipo: 'iptu', nome: 'IPTU', enviadoEm: '2026-01-01' },
  ] },
]
let radar: { id: string; fonte: string; tipo: string; titulo: string; resumo?: string; link: string; data?: string }[] = []
vi.mock('@/hooks/useImoveis', () => ({ useImoveis: () => ({ imoveis, loading: false }) }))
vi.mock('@/lib/legislacao', () => ({ radarPortais: async () => radar }))
vi.mock('@/components/PerfilJulgador', () => ({ default: () => <div data-testid="perfil-julgador-stub">perfil</div> }))
vi.mock('@/components/PesquisaDireito', () => ({ default: () => <div data-testid="pesquisa-stub">pesquisa</div> }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: InstitutoPage } = await import('./InstitutoPage')
const montar = () => render(<MemoryRouter><InstitutoPage /></MemoryRouter>)
const ult = MEDICOES[MEDICOES.length - 1], prim = MEDICOES[0]
const nota = (n: number) => n.toFixed(2).replace('.', ',')
const aba = (nome: RegExp) => fireEvent.click(screen.getByRole('tab', { name: nome }))

describe('Instituto THEYE (página)', () => {
  const write = vi.fn(async (_t: string) => undefined)
  beforeEach(() => { cleanup(); localStorage.clear(); write.mockClear(); Object.assign(navigator, { clipboard: { writeText: write } }); radar = [] })

  it('cabeçalho com a última medição e hash copiável; aba de inovação lista os 5 sandboxes e filtra o radar; aba escolhida é lembrada', async () => {
    radar = [
      { id: 'r1', fonte: 'Câmara', tipo: 'Projeto', titulo: 'PL cria sandbox regulatório para proptechs', link: 'https://x/1', data: '01/11/2026' },
      { id: 'r2', fonte: 'Conjur', tipo: 'Notícia', titulo: 'STJ decide sobre fiança', link: 'https://x/2' },
      { id: 'r3', fonte: 'Conjur', tipo: 'Notícia', titulo: 'Novo marco', resumo: 'tokenização de imóveis', link: 'https://x/3' },
    ]
    montar()
    const estado = screen.getByTestId('estado-medicao').textContent!
    expect(estado).toContain(`M${ult.n}`); expect(estado).toContain(nota(ult.nota)); expect(estado).toContain('selada em blockchain')
    fireEvent.click(screen.getByTestId('copiar-hash'))
    await waitFor(() => expect(write).toHaveBeenCalledWith(`${ult.arquivo} SHA-256 ${ult.sha256}`))
    expect(screen.getByTestId('copiar-hash').textContent).toBe('hash copiado')
    expect(screen.getByRole('tab', { name: /Inovação e sandboxes/ }).getAttribute('aria-selected')).toBe('true')
    const tabela = screen.getByRole('table')
    expect(within(tabela).getAllByRole('row').length).toBe(6)
    expect(within(tabela).getByText('Sandbox regulatório da CVM').closest('a')!.getAttribute('href')).toBe('https://www.gov.br/cvm/pt-br/assuntos/sandbox')
    expect(tabela.textContent).toContain('Lei Complementar 182/2021')
    expect(screen.getByText('Perguntar ao agente de Inovação').closest('a')!.getAttribute('href')).toBe('/assistente?agente=inovacao')
    await waitFor(() => expect(screen.getByText('PL cria sandbox regulatório para proptechs')).toBeTruthy())
    expect(screen.getByText('Novo marco')).toBeTruthy()
    expect(screen.queryByText('STJ decide sobre fiança')).toBeNull()
    expect(screen.getByText('PL cria sandbox regulatório para proptechs').parentElement!.textContent).toContain('Câmara · 01/11/2026')
    aba(/ESG e compliance/)
    expect(localStorage.getItem('lsm-instituto-aba')).toBe('esg')
    cleanup(); montar()
    expect(screen.getByRole('tab', { name: /ESG e compliance/ }).getAttribute('aria-selected')).toBe('true')
  })

  it('radar vazio aponta para Legislação; ESG pontua regulatório, ambiental e LGPD por imóvel e ordena pela exposição; jurimetria mostra o método e o perfil do julgador; pesquisa carrega o componente', async () => {
    montar()
    await waitFor(() => expect(screen.getByText(/Nada sobre inovação na captura mais recente/).textContent).toContain('O radar roda todo dia às 8h30'))
    expect(screen.getByText('Legislação').getAttribute('href')).toBe('/legislacao')
    aba(/ESG e compliance/)
    const linhas = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(linhas.length).toBe(2)
    const celulas = (l: HTMLElement) => Array.from(l.querySelectorAll('td')).map(c => c.textContent)
    expect(celulas(linhas[0])).toEqual(['Galpão industrial km 12', '5', '4', '2', '4 ausente(s)'])
    expect(celulas(linhas[1])).toEqual(['Rua das Flores 123', '3', '2', '2', '1 vencido(s)'])
    expect(within(linhas[0]).getByText('Galpão industrial km 12').getAttribute('href')).toBe('/imoveis/i1')
    expect(screen.getByText('Perguntar ao agente de ESG e compliance').closest('a')!.getAttribute('href')).toBe('/assistente?agente=compliance')
    aba(/Jurimetria e predição/)
    expect(screen.getByText('Metodologia do Instituto')).toBeTruthy()
    expect(screen.getByText(/intervalo de confiança de 95%/)).toBeTruthy()
    expect(screen.getByText('Abrir Previsões').getAttribute('href')).toBe('/previsoes')
    expect(screen.getByTestId('perfil-julgador-stub')).toBeTruthy()
    aba(/Pesquisa e desenvolvimento do direito/)
    expect(screen.getByTestId('pesquisa-stub')).toBeTruthy()
  })

  it('case study: cadeia completa com a última medição no topo e o Plano M31; copiar cadeia, copiar link, imprimir, baixar CSV e gerar o PDF', async () => {
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const criar = vi.fn(() => 'blob:x'); Object.assign(URL, { createObjectURL: criar, revokeObjectURL: vi.fn() })
    window.print = vi.fn()
    montar()
    fireEvent.click(screen.getByText('ver a cadeia completa'))
    expect(screen.getByRole('tab', { name: /Case study desta plataforma/ }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText(`Case study: de ${nota(prim.nota)} a ${nota(ult.nota)} em ${MEDICOES.length} medições`)).toBeTruthy()
    const linhas = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(linhas.length).toBe(MEDICOES.length + 1)
    expect(linhas[0].textContent).toContain(`M${ult.n} ₿`); expect(linhas[0].textContent).toContain(ult.sha256)
    expect(linhas[linhas.length - 1].textContent).toContain('Plano M31 ₿'); expect(linhas[linhas.length - 1].textContent).toContain(PLANO_M31.sha256)
    expect(screen.getByText('Deck de apresentação').closest('a')!.getAttribute('target')).toBe('_blank')
    expect(screen.getByText('Testar tudo agora').getAttribute('href')).toBe('/testar')
    fireEvent.click(screen.getByTestId('copiar-cadeia'))
    await waitFor(() => expect(screen.getByTestId('copiar-cadeia').textContent).toBe('Cadeia copiada'))
    const texto = write.mock.calls[0][0]
    expect(texto.startsWith('Cadeia de medições — GMenezes Advogados Associados\nM14 ·')).toBe(true)
    expect(texto.split('\n').length).toBe(MEDICOES.length + 2)
    expect(texto).toContain(`Plano M31 · ${PLANO_M31.arquivo} · SHA-256 ${PLANO_M31.sha256}`)
    fireEvent.click(screen.getByTestId('copiar-link-instituto'))
    await waitFor(() => expect(screen.getByTestId('copiar-link-instituto').textContent).toBe('Link copiado'))
    fireEvent.click(screen.getByTestId('imprimir-cadeia'))
    expect(window.print).toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('baixar-medicoes'))
    expect(screen.getByTestId('baixar-medicoes').textContent).toBe('Baixado')
    expect(clique).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByTestId('case-study-pdf'))
    expect(clique).toHaveBeenCalledTimes(2)
    expect(criar).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('case-study-msg').textContent).toBe(`Case study em PDF gerado com ${MEDICOES.length} medições, SHA-256 e provas .ots.`)
    clique.mockRestore()
  })
})
