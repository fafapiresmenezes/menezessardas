// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

let linha: { uso?: unknown } | null = null
let erroGravar: { message: string } | null = null
let usuario: { id: string } | null = { id: 'u1' }
const upsert = vi.fn(async (_r: Record<string, unknown>) => ({ error: erroGravar }))
vi.mock('./supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    from: () => ({ select: () => ({ maybeSingle: async () => ({ data: linha, error: null }) }), upsert: (r: Record<string, unknown>) => upsert(r) }),
    auth: { getUser: async () => ({ data: { user: usuario } }) },
  },
}))
const { limparJeito, lerMeuJeito, gravarMeuJeito, carregarMeuJeito, esquecerMeuJeito, aplicarLetra, EVENTO_JEITO } = await import('./meuJeito')

describe('meu jeito de trabalhar', () => {
  beforeEach(() => { localStorage.clear(); document.documentElement.removeAttribute('data-letra'); linha = null; erroGravar = null; usuario = { id: 'u1' }; upsert.mockClear() })

  it('só aceita o que tem formato conhecido: sem repetição, sem tela inventada, sem letra estranha', () => {
    expect(limparJeito(null)).toEqual({})
    expect(limparJeito([1])).toEqual({})
    expect(limparJeito({ atalhos: ['/meu-dia', '/meu-dia', 'javascript:alert(1)', 7, '/agenda'], materias: ['civel', 'Cível!', 'penal'], letra: 'enorme', outra: 1 })).toEqual({ atalhos: ['/meu-dia', '/agenda'], materias: ['civel', 'penal'] })
    expect(limparJeito({ atalhos: Array.from({ length: 30 }, (_, i) => `/t${i}`) }).atalhos).toHaveLength(14)
    expect(limparJeito({ letra: 'maior', atalhos: [] })).toEqual({ letra: 'maior' })
  })

  it('grava na conta sem apagar o que já estava lá, guarda no aparelho, aplica a letra e avisa as telas abertas', async () => {
    linha = { uso: { rotas: { '/agenda': 3 } } }
    const ouviu = vi.fn(); window.addEventListener(EVENTO_JEITO, ouviu)
    expect(await gravarMeuJeito({ atalhos: ['/assistente'], letra: 'grande' })).toBe('conta')
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ usuario_id: 'u1', uso: { rotas: { '/agenda': 3 }, jeito: { atalhos: ['/assistente'], letra: 'grande' } } }))
    expect(lerMeuJeito()).toEqual({ atalhos: ['/assistente'], letra: 'grande' })
    expect(document.documentElement.getAttribute('data-letra')).toBe('grande')
    expect(ouviu).toHaveBeenCalled()
    window.removeEventListener(EVENTO_JEITO, ouviu)
  })

  it('se a conta não puder gravar, vale neste aparelho e a função diz isso', async () => {
    erroGravar = { message: 'sem permissão' }
    expect(await gravarMeuJeito({ materias: ['civel'] })).toBe('aparelho')
    expect(lerMeuJeito()).toEqual({ materias: ['civel'] })
    usuario = null
    expect(await gravarMeuJeito({ materias: ['penal'] })).toBe('aparelho')
  })

  it('ao entrar em outro aparelho, busca o jeito guardado na conta; sem nada na conta, fica o do aparelho', async () => {
    localStorage.setItem('theye-meu-jeito', JSON.stringify({ letra: 'maior' }))
    expect(await carregarMeuJeito()).toEqual({ letra: 'maior' })
    linha = { uso: { jeito: { atalhos: ['/prazos'], materias: ['tributario'] } } }
    expect(await carregarMeuJeito()).toEqual({ atalhos: ['/prazos'], materias: ['tributario'] })
    expect(document.documentElement.hasAttribute('data-letra')).toBe(false)
  })

  it('ao sair, o aparelho esquece o jeito de quem saiu e a letra volta ao normal', () => {
    localStorage.setItem('theye-meu-jeito', JSON.stringify({ letra: 'maior', atalhos: ['/agenda'] }))
    aplicarLetra('maior')
    esquecerMeuJeito()
    expect(lerMeuJeito()).toEqual({})
    expect(document.documentElement.hasAttribute('data-letra')).toBe(false)
  })
})
