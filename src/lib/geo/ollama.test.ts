// Provas da ponte com o modelo que roda no computador do próprio titular (G7).
// O que interessa provar: o endereço é local, a configuração sobrevive a localStorage quebrado,
// a leitura do fluxo não engole pedaço de texto, e o prompt não leva dado identificável embutido.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { carregarConfigOllama, gerarTexto, listarModelos, promptNoticias, promptSemana, salvarConfigOllama } from './ollama'

const CHAVE = 'theye-ollama-v1'

/** Monta uma resposta de fluxo como a do Ollama: uma linha JSON por pedaço. */
const fluxo = (linhas: string[]) => ({
  ok: true,
  body: {
    getReader() {
      let i = 0
      return {
        read: async () => (i < linhas.length
          ? { done: false, value: new TextEncoder().encode(linhas[i++]) }
          : { done: true, value: undefined }),
      }
    },
  },
})

const juntar = async (g: AsyncGenerator<string>) => { let s = ''; for await (const p of g) s += p; return s }

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('configuração', () => {
  it('sem nada salvo, o padrão aponta para o computador do próprio titular', () => {
    const c = carregarConfigOllama()
    expect(c.url).toBe('http://localhost:11434')
    expect(c.modelo.length).toBeGreaterThan(0)
  })

  it('guarda e lê de volta o que o titular escolheu', () => {
    salvarConfigOllama({ url: 'http://192.168.0.10:11434', modelo: 'llama3.2' })
    expect(carregarConfigOllama()).toEqual({ url: 'http://192.168.0.10:11434', modelo: 'llama3.2' })
  })

  it('conteúdo corrompido no armazenamento não derruba a tela: volta ao padrão', () => {
    localStorage.setItem(CHAVE, 'isto não é json')
    expect(carregarConfigOllama().url).toBe('http://localhost:11434')
  })

  it('armazenamento proibido (janela privada) também volta ao padrão, sem erro', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado') })
    expect(() => carregarConfigOllama()).not.toThrow()
    expect(carregarConfigOllama().modelo.length).toBeGreaterThan(0)
  })
})

describe('listar modelos', () => {
  it('devolve os nomes que o Ollama informou', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_u?: unknown, _o?: RequestInit) => ({ ok: true, json: async () => ({ models: [{ name: 'qwen2.5:3b' }, { name: 'llama3.2' }] }) })))
    expect(await listarModelos('http://localhost:11434')).toEqual(['qwen2.5:3b', 'llama3.2'])
  })

  it('resposta sem lista nenhuma devolve lista vazia, não quebra', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_u?: unknown, _o?: RequestInit) => ({ ok: true, json: async () => ({}) })))
    expect(await listarModelos('http://localhost:11434')).toEqual([])
  })

  it('quando o Ollama não está rodando, o erro diz isso em português', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_u?: unknown, _o?: RequestInit) => ({ ok: false, status: 503 })))
    await expect(listarModelos('http://localhost:11434')).rejects.toThrow(/Ollama não respondeu/)
  })

  it('bate na porta local, e em mais nenhum endereço', async () => {
    const f = vi.fn(async (_u?: unknown, _o?: RequestInit) => ({ ok: true, json: async () => ({ models: [] }) }))
    vi.stubGlobal('fetch', f)
    await listarModelos('http://localhost:11434')
    expect(String(f.mock.calls[0][0])).toBe('http://localhost:11434/api/tags')
  })
})

describe('geração de texto em fluxo', () => {
  it('junta os pedaços na ordem em que chegam', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_u?: unknown, _o?: RequestInit) => fluxo([
      '{"response":"Na "}\n{"response":"semana "}\n',
      '{"response":"passada"}\n{"done":true}\n',
    ])))
    expect(await juntar(gerarTexto('http://localhost:11434', 'm', 'p'))).toBe('Na semana passada')
  })

  it('linha partida no meio não vira texto picado nem derruba a geração', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_u?: unknown, _o?: RequestInit) => fluxo(['{"response":"ola"}\n{"resp', '{"response":"!"}\n{"done":true}\n'])))
    const saida = await juntar(gerarTexto('http://localhost:11434', 'm', 'p'))
    expect(saida).toContain('ola')
    expect(saida).not.toContain('{')
  })

  it('para de ler quando o modelo diz que terminou', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_u?: unknown, _o?: RequestInit) => fluxo(['{"response":"fim"}\n{"done":true}\n', '{"response":"NAO DEVIA VIR"}\n'])))
    expect(await juntar(gerarTexto('http://localhost:11434', 'm', 'p'))).toBe('fim')
  })

  it('erro do servidor local aparece com o código, para dar o que investigar', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_u?: unknown, _o?: RequestInit) => ({ ok: false, status: 404 })))
    await expect(juntar(gerarTexto('http://localhost:11434', 'm', 'p'))).rejects.toThrow(/404/)
  })

  it('manda o pedido como POST em JSON, com o modelo escolhido', async () => {
    const f = vi.fn(async (_u?: unknown, _o?: RequestInit) => fluxo(['{"done":true}\n']))
    vi.stubGlobal('fetch', f)
    await juntar(gerarTexto('http://localhost:11434', 'qwen2.5:3b', 'oi'))
    const opc = f.mock.calls[0][1] as RequestInit
    expect(opc.method).toBe('POST')
    expect(JSON.parse(String(opc.body))).toMatchObject({ model: 'qwen2.5:3b', prompt: 'oi', stream: true })
  })
})

describe('os textos enviados ao modelo', () => {
  it('o resumo da semana leva minutos e quilômetros, e NENHUMA coordenada', () => {
    const t = promptSemana({ lugares: [{ nome: 'Casa', minutos: 500 }], km: 12.34, dias: 5 })
    expect(t).toContain('"Casa": 500 min')
    expect(t).toContain('12.3 km')
    expect(t).not.toMatch(/-?\d{1,2}\.\d{4,}/) // nada com cara de latitude
  })

  it('lugar sem nome é dito assim, e semana sem dado nenhum também', () => {
    expect(promptSemana({ lugares: [{ minutos: 10 }], km: 0, dias: 0 })).toContain('lugar sem nome')
    expect(promptSemana({ lugares: [], km: 0, dias: 0 })).toContain('nenhum registrado')
  })

  it('o prompt diz ao modelo que ele está offline, que é a verdade do arranjo', () => {
    expect(promptSemana({ lugares: [], km: 0, dias: 0 })).toMatch(/offline/)
    expect(promptNoticias('Duque de Caxias', [{ titulo: 't', data: '2026-11-18', fonte: 'f' }])).toMatch(/offline/)
  })

  it('sem notícia, pede uma frase dizendo isso, em vez de mandar o modelo inventar', () => {
    const t = promptNoticias('Duque de Caxias', [])
    expect(t).toContain('Não há notícias recentes')
    expect(t).toContain('uma frase')
  })

  it('leva no máximo dez notícias, com data e fonte de cada uma', () => {
    const muitas = Array.from({ length: 25 }, (_, i) => ({ titulo: `t${i}`, data: '2026-11-18', fonte: 'f' }))
    const t = promptNoticias('Caxias', muitas)
    expect((t.match(/•/g) ?? [])).toHaveLength(10)
    expect(t).toContain('2026-11-18: t0 (f)')
  })
})
