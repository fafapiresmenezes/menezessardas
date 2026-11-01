// Passos 429–430: repositório local (modo demonstração) — carteira de exemplo, cadastro, edição, encerramento, anexos e trilha.
import { describe, it, expect, beforeEach } from 'vitest'

const mem = new Map<string, string>()
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v) },
  removeItem: (k: string) => { mem.delete(k) },
}
const { repositorio, modoFicticio } = await import('./repositorio')
const { listarTrilha } = await import('./trilha')
const { emDias } = await import('./datas')
type NovoContrato = import('./repositorio').NovoContrato

const novoContrato = (imovelId: string, extra: Partial<NovoContrato> = {}): NovoContrato => ({
  imovelId, tipo: 'locacao_residencial', parte: 'Maria', dataInicio: emDias(-10), dataVencimento: emDias(355), valor: 2500, periodicidade: 'mensal',
  indice: 'ipca', garantia: 'fiador', dataUltimoReajuste: null, notas: '', ...extra,
})

describe('repositório local', () => {
  beforeEach(async () => { await repositorio.limparTudo(); mem.clear() })

  it('sem Supabase é o modo fictício, semeado com a carteira de exemplo e persistido no navegador', async () => {
    expect(modoFicticio).toBe(true)
    const imoveis = await repositorio.listarImoveis()
    expect(imoveis.length).toBeGreaterThan(3)
    expect(mem.has('lsm-dados-v1')).toBe(true)
    expect(await repositorio.obterImovel('nao-existe')).toBeNull()
  })

  it('cadastra imóvel e contrato, acha o contrato principal do imóvel e registra na trilha', async () => {
    const im = await repositorio.criarImovel({ endereco: 'Rua Nova, 1', cidade: 'Niterói', uf: 'RJ', tipo: 'casa', uso: 'locado', proprietario: 'P', matricula: '9', notas: '' })
    expect(im.id).toBeTruthy()
    expect(await repositorio.obterImovel(im.id)).toMatchObject({ endereco: 'Rua Nova, 1', documentos: [] })
    const c = await repositorio.criarContrato(novoContrato(im.id))
    expect(c.criadoEm).toBe(emDias(0))
    expect((await repositorio.obterContratoPorImovel(im.id))?.id).toBe(c.id)
    const aditivo = await repositorio.criarContrato(novoContrato(im.id, { natureza: 'aditivo', contratoPaiId: c.id, parte: 'Maria (aditivo)' }))
    expect((await repositorio.obterContratoPorImovel(im.id))?.id).toBe(c.id)
    expect((await repositorio.listarVinculados(c.id)).map(x => x.id)).toEqual([aditivo.id])
    const trilha = await listarTrilha()
    expect(trilha.map(e => e.tipo)).toEqual(['imovel_criado', 'contrato_criado', 'contrato_criado'])
  })

  it('edita, guarda texto extraído e encerra o contrato; contrato inexistente dá erro claro', async () => {
    const im = await repositorio.criarImovel({ endereco: 'Rua X', cidade: 'Rio', uf: 'RJ', tipo: 'loja', uso: 'locado', proprietario: 'P', matricula: '1', notas: '' })
    const c = await repositorio.criarContrato(novoContrato(im.id))
    await repositorio.atualizarContrato(c.id, { valor: 3000, garantia: 'seguro_fianca' })
    await repositorio.atualizarTextoContrato(c.id, 'texto do pdf')
    await repositorio.encerrarContrato(c.id, 'Distrato amigável')
    const salvo = await repositorio.obterContrato(c.id)
    expect(salvo).toMatchObject({ valor: 3000, garantia: 'seguro_fianca', textoExtraido: 'texto do pdf', encerradoEm: emDias(0), motivoEncerramento: 'Distrato amigável' })
    await expect(repositorio.atualizarContrato('zzz', { valor: 1 })).rejects.toThrow('Contrato não encontrado.')
    await expect(repositorio.encerrarContrato('zzz', 'x')).rejects.toThrow('Contrato não encontrado.')
  })

  it('anexa e remove documentos de imóvel e de contrato', async () => {
    const im = await repositorio.criarImovel({ endereco: 'Rua Y', cidade: 'Rio', uf: 'RJ', tipo: 'apartamento', uso: 'vago', proprietario: 'P', matricula: '2', notas: '' })
    const c = await repositorio.criarContrato(novoContrato(im.id))
    const d1 = await repositorio.anexarDocumento({ imovelId: im.id }, { tipo: 'iptu', nome: 'IPTU 2026', dataVencimento: emDias(90) })
    const d2 = await repositorio.anexarDocumento({ contratoId: c.id }, { tipo: 'contrato', nome: 'Contrato assinado' })
    expect((await repositorio.obterImovel(im.id))!.documentos.map(d => d.id)).toEqual([d1.id])
    expect((await repositorio.obterContrato(c.id))!.documentos.map(d => d.nome)).toEqual(['Contrato assinado'])
    await repositorio.removerDocumento(d1.id)
    await repositorio.removerDocumento(d2.id)
    expect((await repositorio.obterImovel(im.id))!.documentos).toEqual([])
    expect((await repositorio.obterContrato(c.id))!.documentos).toEqual([])
    await expect(repositorio.anexarDocumento({ contratoId: 'zzz' }, { tipo: 'outro', nome: 'x' })).rejects.toThrow('Registro não encontrado')
  })
})
