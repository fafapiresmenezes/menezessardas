// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Consulta } from '@/lib/assistente'

let historico: Consulta[] = []
let configurado = true
let avaliacoesGravadas: { consulta_id: string; util: boolean }[] = []
const upsert = vi.fn(async (_v: object, _o: object) => ({ error: null }))
vi.mock('@/lib/supabase', () => ({ get supabaseConfigurado() { return configurado }, supabase: { auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) }, from: () => ({ select: async () => ({ data: avaliacoesGravadas }), upsert }) } }))
const perguntar = vi.fn(async (pergunta: string, especialidade: string, _h: Consulta[], modo = 'responder', _ctx = '', _estilo = true): Promise<Consulta> => ({ id: `c-${Date.now()}`, especialidade: especialidade as Consulta['especialidade'], modo: modo as Consulta['modo'], pergunta, resposta: '## Resposta\n\n**Sim**, conforme o art. 51.\n- prazo de 1 ano\n- ação renovatória', fontes: [{ id: 'f1', titulo: 'Lei 8.245/1991', url: 'https://planalto/8245' }], criadoEm: '2026-11-02T14:30:00Z' }))
const apagar = vi.fn(async (_id: string) => undefined)
const guardar = vi.fn(async (_e: string) => undefined)
let preferida = 'imobiliario'
vi.mock('@/lib/assistente', async (orig) => ({ ...(await orig() as object), perguntar: (...a: unknown[]) => perguntar(...(a as [string, string, Consulta[]])), historicoConsultas: async () => historico, apagarConsulta: (id: string) => apagar(id), especialidadePreferida: async () => preferida, guardarEspecialidade: (e: string) => guardar(e) }))
vi.mock('@/components/PerfilJulgador', () => ({ default: () => <div data-testid="perfil-stub" /> }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: AssistentePage, render: renderMd } = await import('./AssistentePage')
const montar = (hash = '') => { window.location.hash = hash; return render(<MemoryRouter><AssistentePage /></MemoryRouter>) }
const consulta = (extra: Partial<Consulta> = {}): Consulta => ({ id: 'h1', especialidade: 'imobiliario', modo: 'responder', pergunta: 'O fiador responde após a prorrogação?', resposta: 'Sim, salvo exoneração (art. 40).', fontes: [{ id: 'f1', titulo: 'Lei 8.245/1991', url: 'https://planalto/8245' }], criadoEm: '2026-11-01T10:00:00Z', ...extra })
const matriz = { sintese: 'Duas saídas possíveis.', recomendado: 1, porque: 'Menor custo e risco.', proximosPassos: ['Notificar o locatário', 'Propor acordo'], caminhos: [
  { nome: 'Ação de despejo', descricao: 'Pedido judicial.', fundamento: 'Art. 9º, Lei 8.245/91', exito: 4, rapidez: 2, custo: 2, risco: 3, zonaCinzenta: 'Liminar depende de caução.' },
  { nome: 'Acordo extrajudicial', descricao: 'Negociação direta.', fundamento: 'Art. 840 CC', exito: 3, rapidez: 5, custo: 5, risco: 4 },
] }

describe('Assistente jurídico', () => {
  const write = vi.fn(async (_t: string) => undefined)
  beforeEach(() => { cleanup(); localStorage.clear(); window.location.hash = ''; historico = []; configurado = true; avaliacoesGravadas = []; preferida = 'imobiliario'; perguntar.mockClear(); apagar.mockClear(); guardar.mockClear(); upsert.mockClear(); write.mockClear(); Object.assign(navigator, { clipboard: { writeText: write } }) })

  it('abre com a especialidade preferida, exemplos preenchem a pergunta, botão só libera com 5 letras, envia com Ctrl+Enter e mostra a resposta formatada com fontes; pergunta é lembrada', async () => {
    preferida = 'condominial'
    montar()
    await waitFor(() => expect((screen.getByRole('radio', { name: /^Condominial/ }) as HTMLInputElement).checked).toBe(true))
    expect(screen.getByText(/Pergunta ao agente condominial/)).toBeTruthy()
    const botao = () => screen.getByRole('button', { name: 'Perguntar' }) as HTMLButtonElement
    expect(botao().disabled).toBe(true)
    fireEvent.click(screen.getByText('O condômino inadimplente pode ser proibido de usar a piscina?'))
    expect((screen.getByLabelText('Pergunta') as HTMLTextAreaElement).value).toBe('O condômino inadimplente pode ser proibido de usar a piscina?')
    expect(botao().disabled).toBe(false)
    fireEvent.change(screen.getByLabelText('Pergunta'), { target: { value: 'oi' } })
    expect(botao().disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Pergunta'), { target: { value: 'Posso cobrar multa de 20%?' } })
    expect(localStorage.getItem('lsm-assistente-pergunta')).toBe('Posso cobrar multa de 20%?')
    fireEvent.click(screen.getByRole('radio', { name: /^Imobiliário/ }))
    expect(guardar).toHaveBeenCalledWith('imobiliario')
    fireEvent.keyDown(screen.getByLabelText('Pergunta'), { key: 'Enter', ctrlKey: true })
    expect(screen.getByText('Lendo a lei e preparando…')).toBeTruthy()
    expect(screen.getByText('Consultando o Planalto e preparando a resposta fundamentada…')).toBeTruthy()
    await waitFor(() => expect(screen.getByRole('article')).toBeTruthy())
    expect(perguntar).toHaveBeenCalledWith('Posso cobrar multa de 20%?', 'imobiliario', [], 'responder', '', true)
    const art = screen.getByRole('article')
    expect(art.textContent).toContain('Perguntar · Imobiliário ·'); expect(art.textContent).toContain('Posso cobrar multa de 20%?')
    expect(within(art).getByText('Resposta').className).toContain('font-semibold'); expect(within(art).getByText('Sim').tagName).toBe('STRONG')
    expect(Array.from(art.querySelector('ul.list-disc')!.children).map(l => l.textContent)).toEqual(['prazo de 1 ano', 'ação renovatória'])
    expect(within(art).getByText('Lei 8.245/1991').closest('a')!.getAttribute('href')).toBe('https://planalto/8245')
    expect((screen.getByLabelText('Pergunta') as HTMLTextAreaElement).value).toBe('')
    expect(screen.queryByText('Exemplos')).toBeNull()
    fireEvent.click(within(art).getByTestId('copiar-resposta'))
    expect(write).toHaveBeenCalledWith('Pergunta: Posso cobrar multa de 20%?\n\n## Resposta\n\n**Sim**, conforme o art. 51.\n- prazo de 1 ano\n- ação renovatória\n\nFontes: Lei 8.245/1991')
    perguntar.mockRejectedValueOnce(new Error('Limite mensal de IA atingido'))
    fireEvent.change(screen.getByLabelText('Pergunta'), { target: { value: 'Outra pergunta longa' } })
    fireEvent.click(botao())
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Limite mensal de IA atingido'))
    expect(renderMd('1) um\n2) dois\n\n# Título')).toBe('<ul class="list-disc pl-5 space-y-1"><li>um</li><li>dois</li></ul><p class="font-semibold text-navy mt-3">Título</p>')
  })

  it('parâmetros da URL escolhem agente, modo Redigir com pedido e estilo, e Caminhos com fatos da tela; matriz de caminhos com notas, recomendado e próximos passos', async () => {
    montar('#/assistente?agente=inovacao&modo=redigir&pedido=Notifica%C3%A7%C3%A3o%20por%20atraso')
    await waitFor(() => expect((screen.getByRole('radio', { name: /^Inovação/ }) as HTMLInputElement).checked).toBe(true))
    expect(screen.getByRole('tab', { name: 'Redigir' }).getAttribute('aria-selected')).toBe('true')
    expect((screen.getByLabelText('Pergunta') as HTMLTextAreaElement).value).toBe('Notificação por atraso')
    expect(screen.getByText('Peça, notificação ou contrato pronto para revisão')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Fatos do caso (opcional)'), { target: { value: 'Locatário deve 3 aluguéis.' } })
    fireEvent.click(screen.getByTestId('usar-estilo'))
    perguntar.mockResolvedValueOnce({ ...consulta({ id: 'r1', modo: 'redigir', especialidade: 'inovacao', pergunta: 'Notificação por atraso', resposta: 'NOTIFICAÇÃO EXTRAJUDICIAL\n\nPelo presente…', fontes: [] }) })
    fireEvent.click(screen.getByRole('button', { name: 'Redigir' }))
    await waitFor(() => expect(perguntar).toHaveBeenCalledWith('Notificação por atraso', 'inovacao', [], 'redigir', 'Locatário deve 3 aluguéis.', false))
    const art = await screen.findByRole('article')
    expect(within(art).getByText('Copiar texto da peça')).toBeTruthy()
    fireEvent.click(within(art).getByTestId('copiar-resposta'))
    expect(write).toHaveBeenCalledWith('NOTIFICAÇÃO EXTRAJUDICIAL\n\nPelo presente…')
    cleanup(); perguntar.mockClear()
    montar('#/assistente?contexto=Tela%20Im%C3%B3veis%3A%203%20contratos%20vencidos')
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Caminhos' }).getAttribute('aria-selected')).toBe('true'))
    expect((screen.getByLabelText('Fatos do caso (opcional)') as HTMLTextAreaElement).value).toBe('Tela Imóveis: 3 contratos vencidos')
    expect(screen.queryByTestId('usar-estilo')).toBeNull()
    perguntar.mockResolvedValueOnce(consulta({ id: 'm1', modo: 'caminhos', pergunta: 'O que fazer com os vencidos?', resposta: '', fontes: [], matriz }))
    fireEvent.change(screen.getByLabelText('Pergunta'), { target: { value: 'O que fazer com os vencidos?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Caminhos' }))
    const art2 = await screen.findByRole('article')
    expect(perguntar.mock.calls[0].slice(3)).toEqual(['caminhos', 'Tela Imóveis: 3 contratos vencidos', true])
    expect(within(art2).getByText('Duas saídas possíveis.')).toBeTruthy()
    const rec = within(art2).getByLabelText('Caminho: Acordo extrajudicial'), outro = within(art2).getByLabelText('Caminho: Ação de despejo')
    expect(rec.className).toContain('border-dourado'); expect(rec.textContent).toContain('Recomendado · nota 4')
    expect(outro.textContent).toContain('nota 3'); expect(outro.textContent).toContain('Zona cinzenta: Liminar depende de caução.')
    expect(within(outro).getByRole('img', { name: 'Êxito: 4 de 5' })).toBeTruthy()
    expect(within(art2).getByText(/Por que o recomendado:/).parentElement!.textContent).toContain('Menor custo e risco.')
    expect(within(within(art2).getByText('Próximos passos').nextElementSibling as HTMLElement).getAllByRole('listitem').map(l => l.textContent)).toEqual(['Notificar o locatário', 'Propor acordo'])
  })

  it('histórico carregado com avaliações gravadas; útil e não útil gravam; apagar; copiar histórico, link, imprimir e baixar CSV; erro de histórico', async () => {
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() }); window.print = vi.fn()
    historico = [consulta(), consulta({ id: 'h2', especialidade: 'tributario', modo: 'redigir', pergunta: 'Minuta de distrato', resposta: 'DISTRATO…', fontes: [], criadoEm: '2026-10-30T09:00:00Z' })]
    avaliacoesGravadas = [{ consulta_id: 'h2', util: false }]
    montar()
    await waitFor(() => expect(screen.getAllByRole('article').length).toBe(2))
    const [a1, a2] = screen.getAllByRole('article')
    expect(within(a2).getByTestId('avaliar-inutil').getAttribute('aria-pressed')).toBe('true'); expect(within(a2).getByTestId('avaliacao-ok')).toBeTruthy()
    expect(within(a1).getByTestId('avaliar-util').getAttribute('aria-pressed')).toBe('false'); expect(within(a1).queryByTestId('avaliacao-ok')).toBeNull()
    fireEvent.click(within(a1).getByTestId('avaliar-util'))
    expect(within(a1).getByTestId('avaliar-util').getAttribute('aria-pressed')).toBe('true')
    await waitFor(() => expect(upsert).toHaveBeenCalledWith({ consulta_id: 'h1', usuario_id: 'u1', util: true }, { onConflict: 'consulta_id,usuario_id' }))
    expect(screen.getByTestId('copiar-historico').textContent).toContain('Copiar histórico (2)')
    fireEvent.click(screen.getByTestId('copiar-historico'))
    const texto = write.mock.calls[0][0]
    expect(texto.startsWith('Assistente jurídico · 2 consulta(s)\n\n[')).toBe(true)
    expect(texto).toContain('· Imobiliário]\nPergunta: O fiador responde após a prorrogação?\nResposta: Sim, salvo exoneração (art. 40).')
    expect(texto).toContain('· Tributário]\nPergunta: Minuta de distrato')
    fireEvent.click(screen.getByTestId('copiar-link-assistente'))
    await waitFor(() => expect(screen.getByTestId('copiar-link-assistente').textContent).toBe('Link copiado'))
    fireEvent.click(screen.getByTestId('imprimir-historico')); expect(window.print).toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('baixar-assistente')); expect(clique).toHaveBeenCalledTimes(1)
    fireEvent.click(within(a2).getByRole('button', { name: 'Apagar esta consulta' }))
    expect(screen.getAllByRole('article').length).toBe(1)
    expect(apagar).toHaveBeenCalledWith('h2')
    expect(screen.getByTestId('copiar-historico').textContent).toContain('(1)')
    expect(screen.getByTestId('perfil-stub')).toBeTruthy()
    clique.mockRestore()
  })
})
