// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { cnj } from '@/test/cnj'
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: PesquisaDiligenciaPage } = await import('./PesquisaDiligenciaPage')
const { default: PrazosPorCodigoPage } = await import('./PrazosPorCodigoPage')
const { default: KycPage } = await import('./KycPage')
const { default: ParteAdversaPage } = await import('./ParteAdversaPage')
const { default: FontesPage } = await import('./FontesPage')

describe('Pesquisa e due diligence', () => {
  beforeEach(() => { cleanup(); localStorage.clear() })
  const abrir = () => render(<MemoryRouter><PesquisaDiligenciaPage /></MemoryRouter>)

  it('reconhece o número do processo, mostra o tribunal e leva à linha do tempo com o número', () => {
    abrir()
    const n = cnj(1234567)
    fireEvent.change(screen.getByLabelText('O que você quer pesquisar?'), { target: { value: n } })
    expect(screen.getByTestId('reconhecido').textContent).toContain('Número de processo (CNJ)')
    expect(screen.getByTestId('reconhecido').textContent).toContain('Número conferido')
    expect((screen.getByTestId('acao-linha') as HTMLAnchorElement).getAttribute('href')).toBe(`/monitoramento?lt=${encodeURIComponent(n)}`)
    expect((screen.getByTestId('acao-escavador') as HTMLAnchorElement).target).toBe('_blank')
    expect(screen.getByTestId('assunto-processo').getAttribute('aria-selected')).toBe('true')
  })
  it('CNPJ com dígito errado avisa, mas ainda deixa pesquisar; lista passa a ser a da empresa', () => {
    abrir()
    fireEvent.change(screen.getByLabelText('O que você quer pesquisar?'), { target: { value: '11.222.333/0001-80' } })
    expect(screen.getByTestId('reconhecido').textContent).toMatch(/confira o número/)
    expect((screen.getByTestId('acao-kyc') as HTMLAnchorElement).getAttribute('href')).toContain('/kyc?doc=')
    expect(screen.getByTestId('assunto-empresa').getAttribute('aria-selected')).toBe('true')
  })
  it('marcar itens da lista conta o progresso, lembra no aparelho e é separado por termo', () => {
    abrir()
    fireEvent.change(screen.getByLabelText('O que você quer pesquisar?'), { target: { value: '11.222.333/0001-81' } })
    expect(screen.getByTestId('progresso').textContent).toBe('0 de 12 itens conferidos')
    fireEvent.click(screen.getByTestId('dd-cnpj')); fireEvent.click(screen.getByTestId('dd-crf'))
    expect(screen.getByTestId('progresso').textContent).toBe('2 de 12 itens conferidos')
    cleanup(); abrir()
    expect(screen.getByTestId('progresso').textContent).toBe('2 de 12 itens conferidos')
    fireEvent.change(screen.getByLabelText('O que você quer pesquisar?'), { target: { value: '22.333.444/0001-81' } })
    expect(screen.getByTestId('progresso').textContent).toBe('0 de 12 itens conferidos')
  })
  it('troca de assunto e mostra a validade das certidões e a tabela de cobertura com os limites', () => {
    abrir()
    fireEvent.click(screen.getByTestId('assunto-imovel'))
    expect(screen.getByText(/Matrícula atualizada/)).toBeTruthy()
    fireEvent.click(screen.getByTestId('assunto-empresa'))
    expect(screen.getAllByText(/validade: 180 dias/, { exact: false }).length).toBeGreaterThan(0)
    const t = within(screen.getByTestId('cobertura'))
    expect(t.getByText('DataJud (CNJ)')).toBeTruthy(); expect(t.getByText(/nem o inteiro teor/)).toBeTruthy()
  })
  it('sem nada digitado não mostra ações, só a lista e a cobertura', () => {
    abrir()
    expect(screen.queryByTestId('reconhecido')).toBeNull(); expect(screen.queryByLabelText('Onde procurar')).toBeNull()
    expect(screen.getByLabelText('Cobertura das fontes')).toBeTruthy()
  })
})

describe('Prazos por código', () => {
  beforeEach(() => { cleanup(); localStorage.clear() })
  const abrir = () => render(<MemoryRouter><PrazosPorCodigoPage /></MemoryRouter>)
  const calcular = (nome: string) => fireEvent.click(screen.getByLabelText(`Calcular ${nome}`))
  const data = (v: string) => fireEvent.change(document.getElementById('inicio')!, { target: { value: v } })

  it('filtra por ramo e mostra a regra de contagem do código', () => {
    abrir()
    fireEvent.click(screen.getByTestId('ramo-CPP'))
    expect(screen.getByTestId('regra-ramo').textContent).toMatch(/Dias corridos/)
    expect(screen.getByTestId('ato-cpp-apelacao')).toBeTruthy(); expect(screen.queryByTestId('ato-cpc-apelacao')).toBeNull()
  })
  it('busca por texto sem acento e avisa quando não acha', () => {
    abrir()
    fireEvent.change(screen.getByTestId('busca-ato'), { target: { value: 'decadencia' } })
    expect(screen.getByTestId('ato-cpp-queixa')).toBeTruthy()
    fireEvent.change(screen.getByTestId('busca-ato'), { target: { value: 'zzzz' } })
    expect(screen.getByText(/Nenhum ato encontrado/)).toBeTruthy()
  })
  it('apelação criminal: 5 dias corridos, vencimento em domingo passa para segunda', () => {
    abrir(); fireEvent.click(screen.getByTestId('ramo-CPP')); calcular('Apelação criminal (interposição)'); data('2026-11-10')
    expect(screen.getByTestId('prazo-final').textContent).toBe('Último dia: 16/11/2026 (segunda-feira)')
    expect(screen.getAllByText(/passa ao dia útil seguinte/, { exact: false }).length).toBeGreaterThan(0)
  })
  it('contestação no CPC com Fazenda dobra para 30 dias úteis; o ECA não oferece prazo em dobro', () => {
    abrir(); fireEvent.click(screen.getByTestId('ramo-CPC')); calcular('Contestação (procedimento comum)'); data('2026-11-11')
    expect(screen.getByTestId('prazo-final').textContent).toContain('03/12/2026')
    fireEvent.change(screen.getByLabelText('Prazo em dobro?'), { target: { value: 'fazenda' } })
    expect(screen.getByTestId('calculo').textContent).toContain('30 dias úteis')
    calcular('Apelação'); expect(screen.queryByLabelText('Prazo em dobro?')).toBeTruthy()
    fireEvent.click(screen.getByTestId('ramo-ECA')); calcular('Apelação'); expect(screen.queryByLabelText('Prazo em dobro?')).toBeNull()
  })
  it('o campo de data usa o marco do ato (trânsito em julgado, citação…)', () => {
    abrir(); fireEvent.click(screen.getByTestId('ramo-CPC')); calcular('Ação rescisória')
    expect(screen.getByText('Trânsito em julgado da última decisão')).toBeTruthy()
  })
  it('copia o resumo com a base legal', async () => {
    const escrever = vi.fn(async () => undefined); Object.assign(navigator, { clipboard: { writeText: escrever } })
    abrir(); fireEvent.click(screen.getByTestId('ramo-CPC')); calcular('Apelação'); data('2026-11-11'); fireEvent.click(screen.getByTestId('copiar-prazo'))
    await screen.findByText('Resumo copiado')
    expect(escrever).toHaveBeenCalledWith(expect.stringContaining('Base: CPC, art. 1.003, § 5º'))
  })
})

describe('Telas abertas pela central já vêm preenchidas', () => {
  beforeEach(() => { cleanup(); localStorage.clear() })
  it('Checagem de contraparte, Parte adversa e Fontes leem o termo do endereço', () => {
    render(<MemoryRouter initialEntries={['/kyc?doc=11.222.333%2F0001-81']}><KycPage /></MemoryRouter>)
    expect((document.getElementById('cnpj') as HTMLInputElement).value).toBe('11.222.333/0001-81')
    cleanup()
    render(<MemoryRouter initialEntries={['/parte-adversa?parte=ACME%20Ltda&cnpj=11.222.333%2F0001-81']}><ParteAdversaPage /></MemoryRouter>)
    expect(screen.getByDisplayValue('ACME Ltda')).toBeTruthy(); expect(screen.getByDisplayValue('11.222.333/0001-81')).toBeTruthy()
    cleanup()
    render(<MemoryRouter initialEntries={['/fontes?termo=Maria%20Souza']}><FontesPage /></MemoryRouter>)
    expect(screen.getByDisplayValue('Maria Souza')).toBeTruthy()
  })
})
