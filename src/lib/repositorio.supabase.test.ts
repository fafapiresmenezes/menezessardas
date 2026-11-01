// Passo 528: repositório com Supabase ligado — conversão das colunas, consultas por imóvel/contrato, gravações e trilha.
import { describe, it, expect, vi, beforeEach } from 'vitest'

type Linha = Record<string, unknown>
let tabelas: Record<string, Linha[]> = {}
let proximoId = 100
const chamadas: { tabela: string; op: string; dados?: unknown; filtros: [string, string, unknown][] }[] = []
let erroEm: { tabela: string; op: string; message: string } | null = null

function consulta(tabela: string) {
  const q = { tabela, op: 'select', dados: undefined as unknown, filtros: [] as [string, string, unknown][], ordem: null as null | [string, boolean], limite: 0, unico: false, talvez: false }
  const executar = () => {
    chamadas.push({ tabela: q.tabela, op: q.op, dados: q.dados, filtros: q.filtros })
    if (erroEm && erroEm.tabela === q.tabela && erroEm.op === q.op) return { data: null, error: { message: erroEm.message } }
    let linhas = tabelas[q.tabela] ?? []
    const aplica = (l: Linha) => q.filtros.every(([op, col, v]) => op === 'eq' ? l[col] === v : op === 'is' ? l[col] == v : op === 'not_is' ? l[col] != v : true)
    if (q.op === 'insert') { const novo = { id: `n${proximoId++}`, criado_em: '2026-11-02T12:00:00Z', ...(q.dados as Linha) }; (tabelas[q.tabela] ??= []).push(novo); return { data: novo, error: null } }
    if (q.op === 'update') { linhas.filter(aplica).forEach(l => Object.assign(l, q.dados as Linha)); return { data: null, error: null } }
    if (q.op === 'delete') { tabelas[q.tabela] = linhas.filter(l => !aplica(l)); return { data: null, error: null } }
    linhas = linhas.filter(aplica)
    if (q.ordem) { const [c, asc] = q.ordem; linhas = [...linhas].sort((a, b) => (String(a[c]) < String(b[c]) ? -1 : 1) * (asc ? 1 : -1)) }
    if (q.limite) linhas = linhas.slice(0, q.limite)
    if (q.unico || q.talvez) return { data: linhas[0] ?? null, error: null }
    return { data: linhas, error: null }
  }
  const self: Record<string, unknown> = {
    select: () => self, insert: (d: unknown) => { q.op = 'insert'; q.dados = d; return self }, update: (d: unknown) => { q.op = 'update'; q.dados = d; return self }, delete: () => { q.op = 'delete'; return self },
    eq: (c: string, v: unknown) => { q.filtros.push(['eq', c, v]); return self }, is: (c: string, v: unknown) => { q.filtros.push(['is', c, v]); return self }, not: (c: string, _o: string, v: unknown) => { q.filtros.push(['not_is', c, v]); return self },
    order: (c: string, o?: { ascending?: boolean }) => { q.ordem = [c, o?.ascending !== false]; return self }, limit: (n: number) => { q.limite = n; return self },
    single: () => { q.unico = true; return self }, maybeSingle: () => { q.talvez = true; return self },
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(executar()).then(res, rej),
  }
  return self
}
vi.mock('./supabase', () => ({ supabaseConfigurado: true, supabase: { from: (t: string) => consulta(t) } }))
const registrarEvento = vi.fn(async (_e: object) => undefined)
vi.mock('./trilha', () => ({ registrarEvento: (e: object) => registrarEvento(e) }))
const { repositorio, modoFicticio } = await import('./repositorio')

describe('repositório com Supabase', () => {
  beforeEach(() => {
    chamadas.length = 0; registrarEvento.mockClear(); erroEm = null; proximoId = 100
    tabelas = {
      imoveis: [
        { id: 'i2', endereco: 'Rua Z 9', cidade: null, uf: null, tipo: 'loja', uso_atual: 'uso_proprio', proprietario_nome: 'Maria', matricula_rgi: null, area_m2: null, notas: null },
        { id: 'i1', endereco: 'Av. A 1', cidade: 'Rio de Janeiro', uf: 'RJ', tipo: 'apartamento', uso_atual: 'locado', proprietario_nome: 'João', matricula_rgi: '123', area_m2: '85.5', notas: 'x' },
      ],
      contratos: [
        { id: 'c1', imovel_id: 'i1', contrato_pai_id: null, natureza: null, tipo: 'locacao_residencial', locatario_fornecedor: 'Ana', data_inicio: '2025-01-01', data_vencimento: '2026-12-31', valor_periodico: '3500', periodicidade: null, indice_reajuste: 'ipca', garantia: null, data_ultimo_reajuste: null, notas: null, criado_em: '2025-01-01T10:00:00Z', texto_extraido: null, encerrado_em: null, motivo_encerramento: null, dias_aviso: null, avisos_dias: null, caminho_arquivo: 'contratos/c1/instrumento.pdf' },
        { id: 'c0', imovel_id: 'i1', contrato_pai_id: null, natureza: 'principal', tipo: 'locacao_residencial', locatario_fornecedor: 'Antigo', data_inicio: '2023-01-01', data_vencimento: null, valor_periodico: 0, periodicidade: 'anual', indice_reajuste: 'fixo', garantia: 'fiador', data_ultimo_reajuste: '2024-01-01', notas: 'n', criado_em: '2023-01-01T10:00:00Z', texto_extraido: 't', encerrado_em: '2024-12-31', motivo_encerramento: 'Fim do prazo', dias_aviso: 15, avisos_dias: ['15', '3'], caminho_arquivo: null },
        { id: 'c2', imovel_id: 'i1', contrato_pai_id: 'c1', natureza: 'aditivo', tipo: 'locacao_residencial', locatario_fornecedor: 'Ana', data_inicio: '2026-01-01', data_vencimento: null, valor_periodico: 0, indice_reajuste: 'ipca', criado_em: '2026-01-01T10:00:00Z' },
      ],
      documentos: [
        { id: 'd1', imovel_id: 'i1', contrato_id: null, tipo_documento: 'iptu', nome_arquivo: 'IPTU.pdf', criado_em: '2026-01-10T08:00:00Z', data_vencimento: '2026-12-01', caminho_storage: 'imoveis/i1/iptu.pdf' },
        { id: 'd2', imovel_id: 'i1', contrato_id: 'c1', tipo_documento: 'contrato', nome_arquivo: 'assinado.pdf', criado_em: '2025-01-02T08:00:00Z', data_vencimento: null, caminho_storage: '' },
      ],
    }
  })

  it('não é modo fictício; lista imóveis em ordem de endereço com documentos do imóvel e campos nulos tratados', async () => {
    expect(modoFicticio).toBe(false)
    const l = await repositorio.listarImoveis()
    expect(l.map(i => i.id)).toEqual(['i1', 'i2'])
    expect(l[0]).toEqual({ id: 'i1', endereco: 'Av. A 1', cidade: 'Rio de Janeiro', uf: 'RJ', tipo: 'apartamento', uso: 'locado', proprietario: 'João', matricula: '123', areaM2: 85.5, notas: 'x', documentos: [{ id: 'd1', tipo: 'iptu', nome: 'IPTU.pdf', enviadoEm: '2026-01-10', dataVencimento: '2026-12-01', caminhoStorage: 'imoveis/i1/iptu.pdf' }] })
    expect(l[1]).toMatchObject({ cidade: '', uf: 'OUTRA', matricula: '', areaM2: undefined, notas: '', documentos: [] })
    expect(await repositorio.obterImovel('i2')).toMatchObject({ endereco: 'Rua Z 9', documentos: [] })
    expect(await repositorio.obterImovel('nada')).toBeNull()
    erroEm = { tabela: 'imoveis', op: 'select', message: 'RLS' }
    await expect(repositorio.listarImoveis()).rejects.toMatchObject({ message: 'RLS' })
  })

  it('contratos: conversão (valores, avisos, arquivo do instrumento, encerramento), principal mais recente do imóvel, vinculados e documentos', async () => {
    const todos = await repositorio.listarContratos()
    const c1 = todos.find(c => c.id === 'c1')!
    expect(c1).toMatchObject({ imovelId: 'i1', contratoPaiId: undefined, natureza: 'principal', parte: 'Ana', valor: 3500, periodicidade: 'mensal', garantia: 'sem_garantia', dataUltimoReajuste: null, notas: '', criadoEm: '2025-01-01', textoExtraido: undefined, encerradoEm: undefined, diasAviso: 7, avisosDias: [7] })
    expect(c1.arquivo).toEqual({ nome: 'instrumento.pdf', tamanho: 0, caminhoStorage: 'contratos/c1/instrumento.pdf' })
    expect(c1.documentos.map(d => d.nome)).toEqual(['assinado.pdf'])
    expect(c1.documentos[0]!.caminhoStorage).toBeUndefined()
    const c0 = todos.find(c => c.id === 'c0')!
    expect(c0).toMatchObject({ dataVencimento: null, periodicidade: 'anual', garantia: 'fiador', dataUltimoReajuste: '2024-01-01', textoExtraido: 't', encerradoEm: '2024-12-31', motivoEncerramento: 'Fim do prazo', diasAviso: 15, avisosDias: [15, 3], arquivo: undefined })
    const principal = await repositorio.obterContratoPorImovel('i1')
    expect(principal?.id).toBe('c1')
    expect(chamadas.find(c => c.tabela === 'contratos' && c.filtros.some(f => f[1] === 'imovel_id'))!.filtros).toEqual([['eq', 'imovel_id', 'i1'], ['is', 'contrato_pai_id', null]])
    expect((await repositorio.obterContrato('c2'))?.natureza).toBe('aditivo')
    expect(await repositorio.obterContrato('x')).toBeNull()
    expect((await repositorio.listarVinculados('c1')).map(v => v.id)).toEqual(['c2'])
    expect(await repositorio.obterContratoPorImovel('i2')).toBeNull()
  })

  it('cria imóvel e contrato com as colunas do banco e registra na trilha; erro do banco não registra', async () => {
    const im = await repositorio.criarImovel({ endereco: 'Rua Nova 5', cidade: 'Niterói', uf: 'RJ', tipo: 'casa', uso: 'locado', proprietario: 'Bia', matricula: '', notas: 'ok' })
    expect(chamadas.find(c => c.op === 'insert' && c.tabela === 'imoveis')!.dados).toEqual({ endereco: 'Rua Nova 5', cidade: 'Niterói', uf: 'RJ', tipo: 'casa', uso_atual: 'locado', proprietario_nome: 'Bia', matricula_rgi: null, area_m2: null, notas: 'ok' })
    expect(im).toMatchObject({ id: 'n100', endereco: 'Rua Nova 5', documentos: [] })
    expect(registrarEvento).toHaveBeenCalledWith({ tipo: 'imovel_criado', entidade: 'n100', resumo: 'Imóvel cadastrado: Rua Nova 5, Niterói' })
    const ct = await repositorio.criarContrato({ imovelId: im.id, tipo: 'locacao_residencial', parte: 'Caio', dataInicio: '2026-11-01', dataVencimento: '2027-10-31', valor: 2000, periodicidade: 'mensal', indice: 'igpm', garantia: 'caucao', dataUltimoReajuste: null, notas: '', arquivo: { nome: 'c.pdf', tamanho: 10, caminhoStorage: 'contratos/x/c.pdf' } })
    expect(chamadas.find(c => c.op === 'insert' && c.tabela === 'contratos')!.dados).toMatchObject({ imovel_id: 'n100', contrato_pai_id: null, natureza: 'principal', locatario_fornecedor: 'Caio', valor_periodico: 2000, indice_reajuste: 'igpm', caminho_arquivo: 'contratos/x/c.pdf', texto_extraido: null })
    expect(ct).toMatchObject({ id: 'n101', parte: 'Caio', natureza: 'principal' })
    expect(registrarEvento).toHaveBeenLastCalledWith({ tipo: 'contrato_criado', entidade: 'n101', resumo: 'Contrato (principal) com Caio' })
    registrarEvento.mockClear()
    erroEm = { tabela: 'contratos', op: 'insert', message: 'violação' }
    await expect(repositorio.criarContrato({ imovelId: 'i1', tipo: 'locacao_residencial', parte: 'X', dataInicio: '2026-01-01', dataVencimento: null, valor: 1, periodicidade: 'mensal', indice: 'ipca', garantia: 'caucao', dataUltimoReajuste: null, notas: '' })).rejects.toMatchObject({ message: 'violação' })
    expect(registrarEvento).not.toHaveBeenCalled()
  })

  it('edita só os campos informados (avisos definem dias_aviso), guarda texto, encerra com a data de hoje, anexa (herdando o imóvel do contrato) e remove documentos', async () => {
    await repositorio.atualizarContrato('c1', { parte: 'Ana Nova', avisosDias: [3, 10], notas: 'obs' })
    const upd = chamadas.find(c => c.op === 'update' && c.tabela === 'contratos')!
    expect(upd.dados).toEqual({ locatario_fornecedor: 'Ana Nova', notas: 'obs', avisos_dias: [3, 10], dias_aviso: 10 })
    expect(upd.filtros).toEqual([['eq', 'id', 'c1']])
    expect(registrarEvento).toHaveBeenCalledWith({ tipo: 'contrato_editado', entidade: 'c1', resumo: 'Contrato editado (parte, avisosDias, notas)' })
    await repositorio.atualizarContrato('c1', { dataVencimento: null, valor: 0 })
    expect(chamadas[chamadas.length - 1]!.dados).toEqual({ data_vencimento: null, valor_periodico: 0 })
    await repositorio.atualizarTextoContrato('c1', 'texto do pdf')
    expect(tabelas.contratos![0]!.texto_extraido).toBe('texto do pdf')
    await repositorio.encerrarContrato('c1', 'Rescisão amigável')
    expect(tabelas.contratos![0]).toMatchObject({ encerrado_em: new Date().toISOString().slice(0, 10), motivo_encerramento: 'Rescisão amigável' })
    expect(registrarEvento).toHaveBeenLastCalledWith({ tipo: 'contrato_encerrado', entidade: 'c1', resumo: 'Contrato encerrado: Rescisão amigável' })
    const doc = await repositorio.anexarDocumento({ contratoId: 'c1' }, { tipo: 'laudo_vistoria', nome: 'laudo.pdf', caminhoStorage: 'contratos/c1/laudo.pdf' })
    expect(chamadas.find(c => c.op === 'insert' && c.tabela === 'documentos')!.dados).toEqual({ contrato_id: 'c1', imovel_id: 'i1', tipo_documento: 'laudo_vistoria', nome_arquivo: 'laudo.pdf', caminho_storage: 'contratos/c1/laudo.pdf', data_vencimento: null })
    expect(doc).toMatchObject({ tipo: 'laudo_vistoria', nome: 'laudo.pdf', enviadoEm: '2026-11-02' })
    expect(registrarEvento).toHaveBeenLastCalledWith({ tipo: 'documento_anexado', entidade: doc.id, resumo: 'Documento anexado: laudo.pdf' })
    await repositorio.anexarDocumento({ imovelId: 'i2' }, { tipo: 'iptu', nome: 'iptu.pdf', dataVencimento: '2027-01-01' })
    expect(chamadas[chamadas.length - 1]!.dados).toMatchObject({ imovel_id: 'i2', contrato_id: null, caminho_storage: '', data_vencimento: '2027-01-01' })
    await repositorio.removerDocumento('d1')
    expect(tabelas.documentos!.map(d => d.id)).not.toContain('d1')
    expect(registrarEvento).toHaveBeenLastCalledWith({ tipo: 'documento_removido', entidade: 'd1', resumo: 'Documento removido' })
    erroEm = { tabela: 'documentos', op: 'delete', message: 'só admin' }
    await expect(repositorio.removerDocumento('d2')).rejects.toMatchObject({ message: 'só admin' })
    await repositorio.limparTudo()
    expect(tabelas.imoveis).toHaveLength(2)
  })
})
