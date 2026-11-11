// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import fs from 'node:fs'
import path from 'node:path'

const invoke = vi.fn(async (_f: string, _o: { body: Record<string, unknown> }): Promise<{ data: unknown; error: unknown }> => ({ data: {}, error: null }))
const inseridos: { tabela: string; linha: any }[] = []
const rpc = vi.fn(async (_n: string, _a?: unknown): Promise<{ data: unknown; error: unknown }> => ({ data: null, error: null }))
let tarefas: any[] = []
function consulta(tabela: string) {
  const q: any = {
    select: () => q, eq: () => q, not: () => q, order: () => q, limit: () => q, in: () => q,
    insert: (l: any) => { const lista = Array.isArray(l) ? l : [l]; lista.forEach((x, i) => { const linha = { id: `id-${inseridos.length + i}`, ...x }; inseridos.push({ tabela, linha }); if (tabela === 'tarefas') tarefas.push(linha) }); const r: any = { select: () => r, single: async () => ({ data: { id: `id-${inseridos.length}`, ...lista[0] }, error: null }), then: (ok: any) => ok({ data: lista, error: null }) }; return r },
    upsert: () => Promise.resolve({ data: null, error: null }),
    then: (ok: any) => ok({ data: tabela === 'tarefas' ? tarefas.filter(t => t.nivel === 'projeto') : [], error: null }),
  }
  return q
}
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: true, supabase: { from: (t: string) => consulta(t), rpc: (n: string, a?: unknown) => rpc(n, a), functions: { invoke: (f: string, o: { body: Record<string, unknown> }) => invoke(f, o) } } }))
const { default: Pagina } = await import('./AssumirProcessosPage')
const abrir = () => render(<MemoryRouter><Pagina /></MemoryRouter>)
const NUM = '0036229-32.2016.8.19.0021'
const pub = (id: string, data: string, texto: string) => ({ id, data, numero: NUM, tribunal: 'TJRJ', orgao: '5ª Vara Cível', tipo: 'Intimação', documento: 'Despacho', classe: 'Comum', texto, link: null, partes: [{ nome: 'ACME LTDA', polo: 'A' }], advogados: [] })
const hoje = new Date(); const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const ontem = iso(new Date(hoje.getTime() - 86400000))

describe('Inserir processos antigos', () => {
  beforeEach(() => { cleanup(); invoke.mockReset(); rpc.mockReset(); rpc.mockResolvedValue({ data: null, error: null }); inseridos.length = 0; tarefas = []; localStorage.clear() })

  it('cola números, busca no CNJ, mostra o que fazer com o prazo do código e põe na agenda', async () => {
    invoke.mockImplementation(async (_f, o) => ({ data: o.body.tipo === 'processo' ? { datajud: { encontrado: true, movimentos: [] }, comunica: { ok: true, itens: [pub('p1', ontem, 'Ao apelado para contrarrazões ao recurso de apelação.')] } } : { comunica: { ok: true, itens: [] } }, error: null }))
    abrir()
    fireEvent.change(screen.getByLabelText('Números dos processos'), { target: { value: `veja ${NUM} e 123` } })
    expect(screen.getByTestId('contagem-numeros').textContent).toMatch(/1 número/)
    fireEvent.click(screen.getByTestId('buscar-tudo'))
    await screen.findByTestId('lista-prazos')
    expect(invoke).toHaveBeenCalledWith('fontes-oficiais', expect.objectContaining({ body: expect.objectContaining({ tipo: 'processo', termo: NUM }) }))
    const card = screen.getByTestId('prazo')
    expect(card.textContent).toMatch(/Responder ao recurso da outra parte/)
    expect(card.textContent).toMatch(/15 dias úteis \(CPC, art\. 1\.010, § 1º\)/)
    fireEvent.click(screen.getByTestId('agendar'))
    await screen.findByText(/prazo\(s\) na agenda/)
    const tarefa = inseridos.find(i => i.tabela === 'tarefas' && i.linha.nivel === 'tarefa')!.linha
    expect(tarefa).toMatchObject({ numero_processo: NUM, situacao: 'a_fazer' })
    expect(tarefa.prazo).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(screen.getByText('Na agenda')).toBeTruthy()
  })

  it('busca pelo nome de cada advogado (vírgula separa) e oferece cadastrar os processos achados fora da carteira', async () => {
    invoke.mockImplementation(async () => ({ data: { comunica: { ok: true, itens: [pub('p2', ontem, 'Manifeste-se em 5 dias.')] } }, error: null }))
    abrir()
    fireEvent.change(screen.getByLabelText(/Nome do advogado/), { target: { value: 'Caio Barros, Ana Souza' } })
    fireEvent.click(screen.getByTestId('buscar-tudo'))
    await screen.findByTestId('achados-fora')
    const nomes = invoke.mock.calls.map(c => c[1].body).filter(b => b.tipo === 'advogado').map(b => b.termo)
    expect(new Set(nomes)).toEqual(new Set(['Caio Barros', 'Ana Souza']))
    fireEvent.click(screen.getByTestId('cadastrar-achados'))
    await screen.findByText(/1 processo\(s\) cadastrado/)
    expect(inseridos.find(i => i.tabela === 'tarefas')!.linha).toMatchObject({ nivel: 'projeto', numero_processo: NUM })
  })

  it('aceita a planilha do Excel direto e cadastra os novos', async () => {
    abrir()
    const b64 = fs.readFileSync(path.resolve(__dirname, '../test/fixtures/planilha-caio.xlsx.b64'), 'utf8')
    const bytes = Uint8Array.from(Buffer.from(b64, 'base64'))
    const arquivo = new File([bytes], 'BASE DE DADOS CAIO.xlsx')
    Object.defineProperty(arquivo, 'arrayBuffer', { value: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) })
    fireEvent.change(screen.getByTestId('arquivo-planilha'), { target: { files: [arquivo] } })
    const resumo = await screen.findByTestId('resumo-planilha')
    expect(resumo.textContent).toMatch(/2 processo\(s\)\. 1 novo\(s\) com número do CNJ, 1 com número de outro tipo/)
    expect(screen.getByTestId('contagem-numeros').textContent).toMatch(/1 número/)
    fireEvent.click(screen.getByTestId('cadastrar-planilha'))
    await screen.findByText(/2 processo\(s\) cadastrado/)
  })

  it('robô: guarda nomes, OAB e quem recebe as peças', async () => {
    rpc.mockImplementation(async n => ({ data: n === 'ler_automacao' ? { advogados: 'Caio Barros', oabs: null, destinatarios: null, ultima: null, email_ok: true, ia_ok: true } : null, error: null }))
    abrir()
    await waitFor(() => expect((screen.getByLabelText(/Nome do advogado/) as HTMLInputElement).value).toBe('Caio Barros'))
    fireEvent.change(screen.getByLabelText(/Quem recebe as peças/), { target: { value: 'fatima@gmail.com' } })
    fireEvent.click(screen.getByTestId('guardar-robo'))
    await screen.findByText(/Guardado\./)
    expect(rpc).toHaveBeenCalledWith('definir_configuracao', { p_chave: 'pecas_destinatarios', p_valor: 'fatima@gmail.com' })
    expect(rpc).toHaveBeenCalledWith('definir_configuracao', { p_chave: 'advogados_monitorados', p_valor: 'Caio Barros' })
  })
})
