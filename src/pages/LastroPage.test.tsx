// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LastroPage from './LastroPage'

/**
 * Passo C13, tarefa 3: o painel de avanço na tela do lastro.
 *
 * O que estes testes prendem: que o painel mostra o que a corrente registra, que a pendência de
 * cada passo sai com o texto do próprio registro, e que a tela diz por que NÃO mostra porcentagem.
 * O que eles não conferem: se o arquivo publicado está na última versão — isso é publicação, e a
 * própria tela mostra o número de registros que ela leu para que se possa perceber.
 */

const CORRENTE = [
  { passo: 'EMISSAO', quando: '2026-11-12T10:00:00Z', hash: 'aa' },
  {
    passo: 'C6-grafo-liga-tudo-parcial',
    titulo: 'C6 - Grafo liga tudo',
    quando: '2026-11-13T17:30:00Z',
    pendente: 'a consulta roda sobre grafo de exemplo, porque as coletas ainda nao rodaram',
    anterior: 'aa',
    hash: 'bb',
  },
  {
    passo: 'C7',
    titulo: 'C7 - Regua honesta da predicao',
    quando: '2026-11-13T19:04:00Z',
    anterior: 'bb',
    hash: 'cc',
  },
].map(e => JSON.stringify(e)).join('\n')

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function comCorrente(texto = CORRENTE) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => texto }) as unknown as Response))
  return render(<MemoryRouter><LastroPage /></MemoryRouter>)
}

describe('painel de avanço na tela do lastro', () => {
  it('conta os passos do plano registrados e as voltas, sem contar o marco de emissão', async () => {
    comCorrente()
    const painel = await waitFor(() => screen.getByTestId('painel-avanco'))
    expect(painel.textContent).toContain('2')
    expect(painel.textContent).toContain('3 voltas de trabalho')
    expect(painel.textContent).toContain('13/11/2026, 19h04')
  })

  it('diz, no painel, por que não mostra porcentagem do plano', async () => {
    comCorrente()
    const painel = await waitFor(() => screen.getByTestId('painel-avanco'))
    expect(painel.textContent).toContain('porcentagem do')
    expect(painel.textContent).toContain('vive no arquivo do plano')
  })

  it('a pendência aparece com o texto do próprio registro', async () => {
    comCorrente()
    const pend = await waitFor(() => screen.getByTestId('pendencias'))
    expect(pend.textContent).toContain('1')
    expect(pend.textContent).toContain('C6 - Grafo liga tudo')
    expect(pend.textContent).toContain('as coletas ainda nao rodaram')
    expect(pend.textContent).not.toContain('C7 - Regua')
  })

  it('corrente sem pendência nenhuma não mostra a seção de pendências', async () => {
    comCorrente(JSON.stringify({ passo: 'C7', titulo: 'C7', quando: '2026-11-13T19:04:00Z', hash: 'cc' }))
    await waitFor(() => screen.getByTestId('painel-avanco'))
    expect(screen.queryByTestId('pendencias')).toBeNull()
  })

  it('sem conseguir baixar o arquivo, avisa em vez de mostrar painel vazio', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('sem rede') }))
    render(<MemoryRouter><LastroPage /></MemoryRouter>)
    const aviso = await waitFor(() => screen.getByRole('alert'))
    expect(aviso.textContent).toContain('Não deu para baixar')
    expect(screen.queryByTestId('painel-avanco')).toBeNull()
  })
})
