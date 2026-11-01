// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const criarImovel = vi.fn(async (d: { endereco: string }) => { if (d.endereco.includes('falha')) throw new Error('duplicado'); return { id: 'x' } })
vi.mock('@/lib/repositorio', () => ({ repositorio: { criarImovel: (d: { endereco: string }) => criarImovel(d) } }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: ImportarImoveisPage } = await import('./ImportarImoveisPage')
const CAB = 'endereco;cidade;uf;tipo;uso;proprietario;matricula;area_m2;notas'
const montar = () => render(<MemoryRouter><ImportarImoveisPage /></MemoryRouter>)

describe('Importar imóveis por planilha', () => {
  beforeEach(() => { cleanup(); criarImovel.mockClear() })

  it('baixa o modelo; cabeçalho errado avisa; linhas válidas e com erro aparecem com a situação', () => {
    URL.createObjectURL = vi.fn(() => 'blob:m') as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = vi.fn()
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    montar()
    fireEvent.click(screen.getByTestId('baixar-modelo'))
    expect(clique).toHaveBeenCalled()
    fireEvent.change(screen.getByTestId('csv-texto'), { target: { value: 'nome;coisa\na;b' } })
    expect(screen.getByTestId('cabecalho-erro')).toBeTruthy()
    fireEvent.change(screen.getByTestId('csv-texto'), { target: { value: `${CAB}\nRua A, 1;Rio de Janeiro;RJ;apartamento;locado;Ana;;80;\nRua B, 2;Rio;RJ;castelo;locado;Beto;;;` } })
    expect(screen.getByTestId('resumo-csv').textContent).toContain('2 linha(s)')
    expect(screen.getByTestId('resumo-csv').textContent).toContain('1 prontas')
    expect(screen.getByTestId('resumo-csv').textContent).toContain('1 com erro')
    expect(screen.getAllByTestId('linha-ok').length).toBe(1)
    expect(screen.getByTestId('linha-erro').textContent).toContain('castelo')
    expect((screen.getByTestId('importar-tudo') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByTestId('importar-validas').textContent).toBe('Importar só as 1 válidas')
    clique.mockRestore()
  })

  it('importa só as válidas, grava cada uma no repositório e relata gravadas e falhas', async () => {
    montar()
    fireEvent.change(screen.getByTestId('csv-texto'), { target: { value: `${CAB}\nRua A, 1;Rio;RJ;apartamento;locado;Ana;;80;\nRua falha, 2;Rio;RJ;casa;vago;Beto;;;\nRua C, 3;Rio;RJ;castelo;locado;Caio;;;` } })
    fireEvent.click(screen.getByTestId('importar-validas'))
    const rel = await screen.findByTestId('relatorio-importacao')
    expect(criarImovel).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('gravadas').textContent).toBe('1')
    expect(rel.textContent).toContain('1 falha(s) ao gravar')
    expect(rel.textContent).toContain('Linha 3: duplicado')
    expect(screen.getByText('Ver a carteira de imóveis').getAttribute('href')).toBe('/imoveis')
  })

  it('arquivo enviado é lido e analisado; tudo válido habilita "Importar N imóveis"', async () => {
    montar()
    const f = new File([`${CAB}\nRua A, 1;Rio;RJ;apartamento;locado;Ana;;80;`], 'imoveis.csv', { type: 'text/csv' })
    Object.defineProperty(f, 'text', { value: async () => `${CAB}\nRua A, 1;Rio;RJ;apartamento;locado;Ana;;80;` })
    fireEvent.change(screen.getByTestId('arquivo-csv'), { target: { files: [f] } })
    expect(await screen.findByText('imoveis.csv')).toBeTruthy()
    await waitFor(() => expect(screen.getByTestId('importar-tudo').textContent).toBe('Importar 1 imóveis'))
    expect((screen.getByTestId('importar-tudo') as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(screen.getByTestId('importar-tudo'))
    await screen.findByTestId('relatorio-importacao')
    expect(criarImovel).toHaveBeenCalledWith(expect.objectContaining({ endereco: 'Rua A, 1', tipo: 'apartamento' }))
  })
})
