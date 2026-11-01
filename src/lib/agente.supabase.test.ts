// Passo 530: agente de análise no modo Supabase — função no servidor, análise guardada e trilha registrada.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const estado: { ultima: Record<string, unknown> | null; resposta: { data?: unknown; error?: { message: string } | null } } = {
  ultima: null,
  resposta: { data: null, error: null },
}
const inseridos: Record<string, unknown>[] = []
const invocacoes: { nome: string; body: Record<string, unknown> }[] = []
const eventos: Record<string, unknown>[] = []

vi.mock('./trilha', () => ({ registrarEvento: async (e: Record<string, unknown>) => { eventos.push(e) } }))
vi.mock('./supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    from: (tabela: string) => ({
      select: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: estado.ultima }) }) }) }) }),
      insert: async (r: Record<string, unknown>) => { inseridos.push({ tabela, ...r }); return { error: null } },
    }),
    functions: {
      invoke: async (nome: string, opts: { body: Record<string, unknown> }) => { invocacoes.push({ nome, body: opts.body }); return estado.resposta },
    },
  },
}))

const { analisarContrato, ultimaAnalise } = await import('./agente')
type Contrato = import('./repositorio').Contrato
type Imovel = import('./repositorio').Imovel

const imovel = { id: 'i1', endereco: 'Rua A, 10', cidade: 'Rio de Janeiro', uf: 'RJ', tipo: 'comercial' } as unknown as Imovel
const contrato = {
  id: 'c1', imovelId: 'i1', tipo: 'locacao_comercial', parte: 'Loja X', dataInicio: '2026-01-01',
  dataVencimento: '2027-01-01', valor: 5000, periodicidade: 'mensal', indice: 'igpm', garantia: 'sem_garantia', notas: '',
  textoExtraido: 'CLÁUSULA 1 — objeto',
} as unknown as Contrato

const analise = { resumo: 'ok', clausulasRisco: [{ titulo: 'Multa', gravidade: 'alta', observacao: 'x' }], prazos: [], sugestoes: [] }

beforeEach(() => { inseridos.length = 0; invocacoes.length = 0; eventos.length = 0; estado.ultima = null; estado.resposta = { data: analise, error: null } })

describe('analisarContrato com Supabase', () => {
  it('chama a função analisar-contrato com o texto do PDF e o id, guarda a análise com a origem e registra na trilha', async () => {
    const r = await analisarContrato(contrato, imovel, 'anexo')
    expect(r).toEqual(analise)
    expect(invocacoes).toHaveLength(1)
    expect(invocacoes[0]!.nome).toBe('analisar-contrato')
    expect(invocacoes[0]!.body.contratoId).toBe('c1')
    const texto = String(invocacoes[0]!.body.texto)
    expect(texto).toContain('Parte: Loja X')
    expect(texto).toContain('Conteúdo do contrato (PDF)')
    expect(texto).toContain('CLÁUSULA 1')
    expect(inseridos).toEqual([{ tabela: 'analises_contrato', contrato_id: 'c1', analise, origem: 'anexo' }])
    expect(eventos).toHaveLength(1)
    expect(eventos[0]).toMatchObject({ tipo: 'contrato_analisado', entidade: 'c1' })
    expect(String(eventos[0]!.resumo)).toContain('1 ponto(s) de risco')
  })

  it('sem PDF envia só os campos; erro de rede e erro devolvido pela função viram exceções sem guardar nada', async () => {
    await analisarContrato({ ...contrato, textoExtraido: undefined } as unknown as Contrato, imovel)
    expect(String(invocacoes[0]!.body.texto)).not.toContain('PDF')
    expect(inseridos[0]).toMatchObject({ origem: 'botao' })

    estado.resposta = { data: null, error: { message: 'Function not found' } }
    await expect(analisarContrato(contrato, imovel)).rejects.toThrow('Function not found')
    estado.resposta = { data: { erro: 'Chave da Anthropic não configurada' }, error: null }
    await expect(analisarContrato(contrato, imovel)).rejects.toThrow('Chave da Anthropic')
    expect(inseridos).toHaveLength(1)
    expect(eventos).toHaveLength(1)
  })
})

describe('ultimaAnalise com Supabase', () => {
  it('devolve a análise mais recente com o instante, ou null quando não há', async () => {
    expect(await ultimaAnalise('c1')).toBeNull()
    estado.ultima = { analise, criado_em: '2026-11-02T10:00:00Z' }
    expect(await ultimaAnalise('c1')).toEqual({ ...analise, em: '2026-11-02T10:00:00Z' })
  })
})
