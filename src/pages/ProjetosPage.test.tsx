// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const emDias = (n: number) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const br = (iso: string) => iso.split('-').reverse().join('/')
type Linha = Record<string, unknown>
const base = { responsavel_id: null, imovel_id: null, prazo: null, horas: 0, cliente: null, area: null, numero_processo: null, tipo: null, portal_token: null, portal_expira_em: null, depende_de: null, prioridade: 'media', criado_em: '2026-10-01T10:00:00Z' }
let tarefas: Linha[] = []
const padrao = (): Linha[] => [
  { ...base, id: 'p1', pai_id: null, nivel: 'projeto', titulo: 'Despejo Loja 3', situacao: 'fazendo', cliente: 'ACME', area: 'Cível', numero_processo: '0001-00.2026', tipo: 'caso' },
  { ...base, id: 't1', pai_id: 'p1', nivel: 'tarefa', titulo: 'Petição inicial', situacao: 'a_fazer', prazo: emDias(-3), responsavel_id: 'u1', horas: 2, prioridade: 'alta' },
  { ...base, id: 't2', pai_id: 'p1', nivel: 'tarefa', titulo: 'Audiência', situacao: 'feito', prazo: emDias(10), horas: 3, depende_de: 't1' },
  { ...base, id: 's1', pai_id: 't2', nivel: 'subtarefa', titulo: 'Preparar testemunhas', situacao: 'fazendo' },
  { ...base, id: 'p2', pai_id: null, nivel: 'projeto', titulo: 'Carteira Lagoa', situacao: 'a_fazer', area: 'Imobiliário' },
  { ...base, id: 't3', pai_id: 'p2', nivel: 'tarefa', titulo: 'Reajustes de outubro', situacao: 'revisao', horas: 1.5 },
]
let erroSelect: { message: string } | null = null
let erroInsert: { message: string } | null = null
let cont = 0
const gravar = (linha: Linha) => { const id = `novo-${++cont}`; tarefas = [...tarefas, { ...base, situacao: 'a_fazer', ...linha, id }]; return id }
const insert = vi.fn((linha: Linha) => ({ then: (f: (v: unknown) => unknown) => Promise.resolve({ error: erroInsert ?? (gravar(linha), null) }).then(f), select: () => ({ single: async () => ({ data: erroInsert ? null : { id: gravar(linha) }, error: erroInsert }) }) }))
const update = vi.fn(async (v: Linha, id: string) => { tarefas = tarefas.map(t => (t.id === id ? { ...t, ...v } : t)); return { error: null } })
const from = (t: string) => ({
  select: () => ({ order: async () => ({ data: t === 'tarefas' ? tarefas : [], error: erroSelect }) }),
  insert: (l: Linha) => insert(l),
  update: (v: Linha) => ({ eq: (_c: string, id: string) => update(v, id) }),
})
// Privacidade por advogado: a tela precisa saber quem está logado para mostrar os casos dessa pessoa.
vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: true, supabase: { from, auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } } }))
vi.mock('@/lib/equipe', () => ({ listarPessoas: async () => [{ id: 'u1', nome: 'Letícia', email: 'l@x', funcao: 'advogada' }, { id: 'u2', nome: 'Fátima', email: 'f@x', funcao: 'admin' }] }))
vi.mock('@/lib/repositorio', () => ({ repositorio: { listarImoveis: async () => [{ id: 'i1', endereco: 'Rua das Flores 123' }] } }))
vi.mock('@/lib/caminhoCritico', () => ({ caminhoCritico: (etapas: { id: string }[]) => (etapas.length ? { caminho: ['t1', 't2'], fimPrevisto: '2026-12-20', atraso: 0, fins: { t2: '2026-12-20' } } : { caminho: [], fimPrevisto: null, atraso: 0, fins: {} }) }))
vi.mock('@/components/PortalCasoEscritorio', () => ({ default: ({ tarefaId }: { tarefaId: string }) => <div data-testid="portal-escritorio-stub">{tarefaId}</div> }))
vi.mock('@/components/AssinaturasCaso', () => ({ default: ({ tarefaId, cliente }: { tarefaId: string; cliente: string | null }) => <div data-testid="assinaturas-stub">{tarefaId}:{cliente}</div> }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: ProjetosPage } = await import('./ProjetosPage')
const montar = (rota = '/projetos') => render(<MemoryRouter initialEntries={[rota]}><ProjetosPage /></MemoryRouter>)
const coluna = (nome: string) => screen.getByRole('region', { name: nome })
const titulos = (nome: string) => within(coluna(nome)).queryAllByRole('listitem').map(l => l.querySelector('p.text-sm')!.textContent)
const write = vi.fn(async (_t: string) => undefined)

describe('Casos e projetos', () => {
  beforeEach(() => { cleanup(); tarefas = padrao(); erroSelect = null; erroInsert = null; cont = 0; insert.mockClear(); update.mockClear(); write.mockClear(); Object.assign(navigator, { clipboard: { writeText: write } }) })

  it('quadro com todas as tarefas por situação, progresso, atrasadas e horas; escolher o projeto mostra só a sua árvore, o caminho crítico e a conclusão prevista; filtro por área; ?caso= abre direto', async () => {
    montar()
    await waitFor(() => expect(titulos('A fazer')).toEqual(['Petição inicial']))
    expect(titulos('Fazendo')).toEqual(['↳ Preparar testemunhas']); expect(titulos('Em revisão')).toEqual(['Reajustes de outubro']); expect(titulos('Feito')).toEqual(['Audiência'])
    expect(within(coluna('A fazer')).getByRole('heading').textContent).toBe('A fazer (1)')
    const cartao = within(coluna('A fazer')).getByRole('listitem')
    expect(cartao.textContent).toContain('Despejo Loja 3'); expect(cartao.textContent).toContain('Letícia'); expect(cartao.textContent).toContain(br(emDias(-3))); expect(cartao.textContent).toContain('2 h')
    expect(cartao.className).toContain('border-critico')
    expect(within(coluna('Fazendo')).getByRole('listitem').textContent).toContain('↳ Preparar testemunhas')
    expect(within(coluna('Feito')).getByRole('listitem').textContent).toContain('depende de: Petição inicial')
    expect(screen.getByTestId('progresso').textContent).toBe('25%')
    expect(screen.getByText('Atrasadas').nextElementSibling!.textContent).toBe('1')
    expect(screen.getByText('Horas').nextElementSibling!.textContent).toBe('6,5')
    expect(screen.queryByTestId('caminho-critico')).toBeNull(); expect(screen.queryByTestId('link-cliente')).toBeNull()
    expect(screen.getByText('Escolha um projeto acima para colocar a tarefa dentro dele.')).toBeTruthy()
    const sel = screen.getByLabelText('Projeto') as HTMLSelectElement
    expect(Array.from(sel.options).map(o => o.textContent)).toEqual(['Todas as tarefas', 'Despejo Loja 3 · 0001-00.2026', 'Carteira Lagoa'])
    fireEvent.change(sel, { target: { value: 'p1' } })
    expect(titulos('Em revisão')).toEqual([]); expect(titulos('A fazer')).toEqual(['★ Petição inicial']); expect(titulos('Feito')).toEqual(['★ Audiência'])
    expect(screen.getByTestId('progresso').textContent).toBe('33%'); expect(screen.getByText('Horas').nextElementSibling!.textContent).toBe('5')
    expect(screen.getByTestId('fim-previsto').textContent).toBe('20/12/2026')
    expect(screen.getByTestId('caminho-critico').textContent).toContain('Caminho crítico (2 etapas, no prazo): Petição inicial → Audiência.')
    expect(screen.getAllByTestId('estrela-critico').length).toBe(2)
    expect(screen.getByTestId('assinaturas-stub').textContent).toBe('p1:ACME')
    expect(screen.getByText(/Entra dentro de/).textContent).toContain('Despejo Loja 3')
    expect(screen.getAllByTestId('depende-de').length).toBe(3)
    fireEvent.change(screen.getByLabelText('Área'), { target: { value: 'Imobiliário' } })
    expect(Array.from((screen.getByLabelText('Projeto') as HTMLSelectElement).options).map(o => o.textContent)).toEqual(['Todas as tarefas', 'Carteira Lagoa'])
    expect(screen.getByTestId('progresso').textContent).toBe('25%')
    cleanup(); montar('/projetos?caso=p2&novo=Ligar%20para%20o%20cliente')
    await waitFor(() => expect(titulos('Em revisão')).toEqual(['Reajustes de outubro']))
    expect((screen.getByLabelText('Projeto') as HTMLSelectElement).value).toBe('p2')
    expect((screen.getByLabelText('Título') as HTMLInputElement).value).toBe('Ligar para o cliente')
  })

  it('mover, somar horas e dependência gravam na tarefa; item avulso exige título e entra no projeto escolhido; link do cliente gera código de 90 dias, renova e revoga', async () => {
    window.prompt = vi.fn(() => '2,5')
    montar('/projetos?caso=p1')
    await waitFor(() => expect(titulos('A fazer')).toEqual(['★ Petição inicial']))
    fireEvent.change(screen.getByLabelText('Mover Petição inicial'), { target: { value: 'fazendo' } })
    expect(titulos('Fazendo')).toEqual(['★ Petição inicial', '↳ Preparar testemunhas'])
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ situacao: 'fazendo' }), 't1')
    fireEvent.click(within(coluna('Fazendo')).getAllByText('+ horas')[0])
    await waitFor(() => expect(update).toHaveBeenLastCalledWith({ horas: 4.5 }, 't1'))
    fireEvent.change(within(coluna('Fazendo')).getAllByTestId('depende-de')[1], { target: { value: 't1' } })
    expect(update).toHaveBeenLastCalledWith({ depende_de: 't1' }, 's1')
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }))
    expect(screen.getByRole('alert').textContent).toBe('Escreva o título.')
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: '  Juntar procuração ' } })
    fireEvent.change(screen.getByLabelText('Nível'), { target: { value: 'subtarefa' } })
    fireEvent.change(screen.getByLabelText('Responsável'), { target: { value: 'u2' } })
    fireEvent.change(screen.getByLabelText('Prazo'), { target: { value: '2026-12-01' } })
    fireEvent.change(screen.getByLabelText('Prioridade'), { target: { value: 'alta' } })
    fireEvent.change(screen.getByLabelText('Imóvel'), { target: { value: 'i1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }))
    await waitFor(() => expect(insert).toHaveBeenCalledWith({ titulo: 'Juntar procuração', nivel: 'subtarefa', pai_id: 'p1', prioridade: 'alta', responsavel_id: 'u2', prazo: '2026-12-01', imovel_id: 'i1' }))
    await waitFor(() => expect((screen.getByLabelText('Título') as HTMLInputElement).value).toBe(''))
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.click(screen.getByTestId('link-cliente'))
    await waitFor(() => expect(screen.getByTestId('link-portal')).toBeTruthy())
    const gravado = update.mock.calls.find(c => 'portal_token' in c[0])!
    expect(gravado[1]).toBe('p1'); expect(String(gravado[0].portal_token)).toMatch(/^[0-9a-f]{48}$/)
    expect(write.mock.calls[write.mock.calls.length - 1][0]).toContain(`#/portal/${gravado[0].portal_token}`)
    expect(screen.getByTestId('link-portal').textContent).toContain('O cliente vê só as etapas e os honorários, sem login')
    cleanup(); update.mockClear()
    tarefas = padrao().map(t => (t.id === 'p1' ? { ...t, portal_token: 'ab'.repeat(24), portal_expira_em: '2027-01-15T00:00:00Z' } : t))
    montar('/projetos?caso=p1')
    await waitFor(() => expect(screen.getByTestId('portal-validade').textContent).toContain('válido até 15/01/2027'))
    fireEvent.click(screen.getByTestId('link-cliente'))
    await waitFor(() => expect(write).toHaveBeenLastCalledWith(expect.stringContaining(`#/portal/${'ab'.repeat(24)}`)))
    expect(update).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('renovar-link'))
    await waitFor(() => expect(update).toHaveBeenCalledWith(expect.objectContaining({ portal_expira_em: expect.any(String) }), 'p1'))
    fireEvent.click(screen.getByTestId('revogar-link'))
    await waitFor(() => expect(update).toHaveBeenLastCalledWith({ portal_token: null, portal_expira_em: null }, 'p1'))
    cleanup()
    tarefas = padrao().map(t => (t.id === 'p1' ? { ...t, portal_token: 'cd'.repeat(24), portal_expira_em: '2026-01-01T00:00:00Z' } : t))
    montar('/projetos?caso=p1')
    await waitFor(() => expect(screen.getByTestId('portal-validade').textContent).toContain('expirado'))
  })

  it('novo caso pronto cria o projeto e as etapas do modelo em cadeia com prazos; erro explicado; copiar lista e andamento, baixar CSV, imprimir; vazio e erro de carga', async () => {
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() }); window.print = vi.fn()
    montar()
    await waitFor(() => expect(titulos('A fazer')).toEqual(['Petição inicial']))
    fireEvent.change(screen.getByLabelText('Modelo'), { target: { value: 'contrato' } })
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'contrato' } })
    fireEvent.change(screen.getByLabelText('Área do caso'), { target: { value: 'Empresarial' } })
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'Padaria Sol' } })
    fireEvent.change(screen.getByLabelText('Responsável pelo caso'), { target: { value: 'u1' } })
    fireEvent.click(screen.getByTestId('criar-caso'))
    await waitFor(() => expect(insert).toHaveBeenCalledTimes(7))
    expect(insert.mock.calls[0][0]).toEqual({ titulo: 'Elaboração ou revisão de contrato · Padaria Sol', nivel: 'projeto', prioridade: 'media', cliente: 'Padaria Sol', area: 'Empresarial', numero_processo: null, tipo: 'contrato', responsavel_id: 'u1' })
    const etapas = insert.mock.calls.slice(1).map(c => c[0])
    expect(etapas.map(e => e.titulo)).toEqual(['Entender o negócio e as partes', 'Checagem de contraparte (KYC)', 'Minuta', 'Revisão interna', 'Negociação com a outra parte', 'Assinatura e arquivo'])
    expect(etapas.map(e => e.depende_de)).toEqual([null, 'novo-2', 'novo-3', 'novo-4', 'novo-5', 'novo-6'])
    expect(etapas.every(e => e.pai_id === 'novo-1' && e.area === 'Empresarial' && e.cliente === 'Padaria Sol' && e.responsavel_id === 'u1')).toBe(true)
    expect(etapas[0].prazo).toBe(emDias(2)); expect(etapas[5].prazo).toBe(emDias(20))
    await waitFor(() => expect((screen.getByLabelText('Projeto') as HTMLSelectElement).value).toBe('novo-1'))
    expect((screen.getByLabelText('Cliente') as HTMLInputElement).value).toBe('')
    erroInsert = { message: 'permissão negada' }
    fireEvent.click(screen.getByTestId('criar-caso'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('permissão negada'))
    fireEvent.change(screen.getByLabelText('Projeto'), { target: { value: 'p1' } })
    fireEvent.click(screen.getByTestId('copiar-projetos'))
    await waitFor(() => expect(screen.getByTestId('copiar-projetos').textContent).toBe('lista copiada'))
    expect(write.mock.calls[0][0].split('\n')).toEqual(['Casos e projetos — 3', 'Despejo Loja 3 · Cível · ACME · fazendo', 'Carteira Lagoa · Imobiliário · a_fazer', 'Elaboração ou revisão de contrato · Padaria Sol · Empresarial · Padaria Sol · a_fazer'])
    fireEvent.click(screen.getByTestId('copiar-andamento'))
    const andamento = write.mock.calls[1][0].split('\n')
    expect(andamento[0]).toContain('Despejo Loja 3 ·'); expect(andamento[1]).toBe('Concluído 33% · 1 de 3 tarefas · 1 atrasada(s) · 5h lançadas'); expect(andamento[2]).toBe('Conclusão prevista: 20/12/2026')
    expect(andamento.slice(3)).toEqual([`  [ ] Petição inicial · ${br(emDias(-3))} ★`, `  [x] Audiência · ${br(emDias(10))} ★`, '  [ ] Preparar testemunhas'])
    fireEvent.click(screen.getByTestId('copiar-link-projetos'))
    await waitFor(() => expect(screen.getByTestId('copiar-link-projetos').textContent).toBe('link copiado'))
    fireEvent.click(screen.getByTestId('imprimir-projetos')); expect(window.print).toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('baixar-projetos'))
    expect(screen.getByTestId('baixar-projetos').textContent).toBe('Baixado'); expect(clique).toHaveBeenCalledTimes(1)
    cleanup(); tarefas = []
    montar()
    await waitFor(() => expect(screen.getByText(/Comece criando um projeto/)).toBeTruthy())
    expect(screen.queryByTestId('copiar-projetos')).toBeNull(); expect(screen.queryByTestId('baixar-projetos')).toBeNull()
    cleanup(); erroSelect = { message: 'JWT expired' }
    montar()
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    clique.mockRestore()
  })
})
