// Passo 531: fornecedores no modo Supabase — listagem a partir da coluna "dados", upsert e trilha.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const linhas: { id: string | number; dados: Record<string, unknown> }[] = []
const upserts: Record<string, unknown>[] = []
const eventos: Record<string, unknown>[] = []
let falha: string | null = null

vi.mock('./trilha', () => ({ registrarEvento: async (e: Record<string, unknown>) => { eventos.push(e) } }))
vi.mock('./supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    from: (tabela: string) => ({
      select: async () => (falha ? { data: null, error: new Error(falha) } : { data: linhas, error: null }),
      upsert: async (r: Record<string, unknown>) => { if (falha) return { error: new Error(falha) }; upserts.push({ tabela, ...r }); return { error: null } },
    }),
  },
}))

const { listarFornecedores, obterFornecedor, salvarFornecedor } = await import('./fornecedores')
type Fornecedor = import('./fornecedores').Fornecedor

const f1: Fornecedor = {
  id: 'f1', nome: 'Brilho Limpeza', cnpj: '11222333000181', categoria: 'limpeza', imovelIds: ['1'],
  kyc: { ceis: 'limpo', cnep: 'limpo' }, certidoes: [], slas: [], notas: '',
}

beforeEach(() => { linhas.length = 0; upserts.length = 0; eventos.length = 0; falha = null })

describe('listar e obter com Supabase', () => {
  it('monta cada fornecedor a partir de "dados" e força o id da linha como texto; sem linhas devolve vazio', async () => {
    expect(await listarFornecedores()).toEqual([])
    const { id: _id, ...dados } = f1
    linhas.push({ id: 42, dados: { ...dados, id: 'antigo' } })
    const lista = await listarFornecedores()
    expect(lista).toHaveLength(1)
    expect(lista[0]!.id).toBe('42')
    expect(lista[0]!.nome).toBe('Brilho Limpeza')
    expect(await obterFornecedor('42')).toMatchObject({ nome: 'Brilho Limpeza' })
    expect(await obterFornecedor('99')).toBeNull()
  })

  it('erro do banco é propagado', async () => {
    falha = 'rede fora'
    await expect(listarFornecedores()).rejects.toThrow('rede fora')
  })
})

describe('salvar com Supabase', () => {
  it('faz upsert de {id, dados} sem repetir o id dentro de dados e registra fornecedor_atualizado com o resumo', async () => {
    await salvarFornecedor(f1, 'Cadastro inicial')
    expect(upserts).toHaveLength(1)
    expect(upserts[0]).toMatchObject({ tabela: 'fornecedores', id: 'f1' })
    const dados = upserts[0]!.dados as Record<string, unknown>
    expect(dados.id).toBeUndefined()
    expect(dados.nome).toBe('Brilho Limpeza')
    expect(eventos).toEqual([{ tipo: 'fornecedor_atualizado', entidade: 'f1', resumo: 'Cadastro inicial' }])
  })

  it('erro no upsert interrompe antes da trilha', async () => {
    falha = 'sem permissão'
    await expect(salvarFornecedor(f1, 'x')).rejects.toThrow('sem permissão')
    expect(eventos).toHaveLength(0)
  })
})
