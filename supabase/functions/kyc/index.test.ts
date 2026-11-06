// Passo 538: Edge Function kyc — Receita, certidão do TCU, conflito interno, histórico e reconsulta pelo cron.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch, jsonResp } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_SERVICE_ROLE_KEY: 'k', SUPABASE_ANON_KEY: 'a' })
await import('./index')
const chamar = (body: unknown, headers: Record<string, string> = { authorization: 'Bearer t' }) =>
  caixa.handler!(new Request('https://x.functions.supabase.co/kyc', { method: 'POST', headers, body: JSON.stringify(body) }))
const CNPJ = '11222333000181'

let receita: () => Response
let tcu: () => Response
beforeEach(() => {
  receita = () => jsonResp({ razao_social: 'BRILHO LIMPEZA LTDA', descricao_situacao_cadastral: 'ATIVA', uf: 'RJ', qsa: [{ nome_socio: 'ANA', qualificacao_socio: 'Sócio-Administrador' }] })
  tcu = () => jsonResp({ certidoes: [{ emissor: 'CGU', tipo: 'CEIS', situacao: 'NADA_CONSTA' }, { emissor: 'TCU', tipo: 'Inidôneos', situacao: 'NADA_CONSTA' }] })
  fingirFetch(u => (u.includes('brasilapi') ? receita() : tcu()))
  zerar({ configuracoes: [{ chave: 'cron_segredo', valor: 'cron-1' }], fornecedores: [], contratos: [], checagens_kyc: [], usuarios_perfis: [{ id: 'u1', funcao: 'admin' }] })
  estado.usuario = { id: 'u1' }
})

describe('kyc', () => {
  it('exige login e CNPJ de 14 dígitos', async () => {
    estado.usuario = null
    expect((await chamar({ cnpj: CNPJ })).status).toBe(401)
    estado.usuario = { id: 'u1' }
    expect((await chamar({ cnpj: '12' })).status).toBe(400)
  })

  it('empresa ativa e limpa, sem vínculo interno: risco baixo, sócios e fontes; grava a checagem com o usuário', async () => {
    const b = await (await chamar({ cnpj: '11.222.333/0001-81' })).json()
    expect(b.risco).toBe('baixo')
    expect(b.alertas).toEqual([])
    expect(b.receita).toMatchObject({ encontrado: true, nome: 'BRILHO LIMPEZA LTDA', socios: [{ nome: 'ANA', qualificacao: 'Sócio-Administrador' }] })
    expect(b.certidoes).toMatchObject({ alguma: false, indisponivel: false })
    expect(b.fontes).toHaveLength(5)
    expect(b.fontes.join(' ')).toContain('PEP (Portal da Transparência): não consultado')
    expect(b.ofac).toMatchObject({ ok: true, encontrados: [] })
    expect(b.mudou).toBe(false)
    expect(b.riscoAnterior).toBeNull()
    expect(estado.inseridos[0]!.tabela).toBe('checagens_kyc')
    expect(estado.inseridos[0]!.linha).toMatchObject({ cnpj: CNPJ, nome: 'BRILHO LIMPEZA LTDA', risco: 'baixo', usuario_id: 'u1', automatica: false, mudou: false })
  })

  it('sanção no TCU, situação inativa e vínculo interno viram alertas e risco alto; marca mudança frente à checagem anterior', async () => {
    receita = () => jsonResp({ razao_social: 'BRILHO LIMPEZA LTDA', descricao_situacao_cadastral: 'BAIXADA', qsa: [] })
    tcu = () => jsonResp({ certidoes: [{ emissor: 'CGU', tipo: 'CEIS', situacao: 'CONSTA' }] })
    estado.tabelas.fornecedores = [{ id: 'f1', dados: { nome: 'Brilho Limpeza', cnpj: '11.222.333/0001-81' } }]
    estado.tabelas.contratos = [{ id: 'c1', imovel_id: '1', locatario_fornecedor: 'Brilho Limpeza Ltda', status: 'ativo' }]
    estado.tabelas.checagens_kyc = [{ cnpj: CNPJ, risco: 'baixo', consultado_em: '2026-01-01' }]
    const b = await (await chamar({ cnpj: CNPJ })).json()
    expect(b.risco).toBe('alto')
    expect(b.alertas).toEqual([
      'Situação na Receita: BAIXADA.',
      'Consta em cadastro de sanções (veja as certidões).',
      'A contraparte já aparece no escritório: verifique conflito de interesses.',
    ])
    expect(b.conflitos).toEqual([{ onde: 'Fornecedores', detalhe: 'Brilho Limpeza' }, { onde: 'Contratos', detalhe: 'Brilho Limpeza Ltda (ativo)' }])
    expect(b.mudou).toBe(true)
    expect(b.riscoAnterior).toBe('baixo')
  })

  it('fonte fora do ar ou certidão indisponível dá "a conferir" e não conta como mudança', async () => {
    tcu = () => new Response('', { status: 503 })
    let b = await (await chamar({ cnpj: CNPJ })).json()
    expect(b.risco).toBe('a conferir')
    expect(b.certidoes).toMatchObject({ ok: false, erro: 'HTTP 503' })
    receita = () => new Response('', { status: 404 })
    tcu = () => jsonResp({ certidoes: [{ situacao: 'INDISPONIVEL' }] })
    estado.tabelas.checagens_kyc = [{ cnpj: CNPJ, risco: 'a conferir', consultado_em: '2026-01-01' }]
    b = await (await chamar({ cnpj: CNPJ })).json()
    expect(b.alertas).toEqual(['CNPJ não encontrado na Receita.'])
    expect(b.risco).toBe('alto')
    expect(b.mudou).toBe(false)
  })

  it('cron com o segredo reconsulta só o que passou de 90 dias, até 50; reconsultar forçado exige admin e limita a 5', async () => {
    const velho = new Date(Date.now() - 100 * 86400000).toISOString()
    const novo = new Date(Date.now() - 10 * 86400000).toISOString()
    estado.rpcResposta.kyc_pendentes_reconsulta = [{ cnpj: CNPJ, consultado_em: velho }, { cnpj: '45723174000110', consultado_em: novo }]
    const b = await (await chamar({}, { 'x-cron-secret': 'cron-1' })).json()
    expect(b.reconsultados).toBe(1)
    expect(b.resumo[0]).toMatchObject({ cnpj: CNPJ, risco: 'baixo', mudou: false })
    expect(estado.inseridos[0]!.linha).toMatchObject({ automatica: true, usuario_id: null })
    estado.usuario = { id: 'u2' }
    estado.tabelas.usuarios_perfis.push({ id: 'u2', funcao: 'leitor' })
    expect((await chamar({ reconsultar: true })).status).toBe(403)
    estado.usuario = { id: 'u1' }
    const f = await (await chamar({ reconsultar: true })).json()
    expect(f.reconsultados).toBe(2)
    estado.usuario = null
    expect((await chamar({ reconsultar: true })).status).toBe(401)
  })

  it('D09: OFAC (lista SDN) e PEP (Portal da Transparência) entram na checagem; acerto vira alerta e risco alto; OFAC fora do ar dá "a conferir"', async () => {
    const sdn = '36,"BANCO NACIONAL DE CUBA",-0- ,"CUBA",-0- \n99,"BRILHO LIMPEZA",-0- ,"SDGT",-0- \n'
    receita = () => jsonResp({ razao_social: 'BRILHO LIMPEZA LTDA', descricao_situacao_cadastral: 'ATIVA', uf: 'RJ', qsa: [{ nome_socio: 'JOAO DA SILVA PEREIRA', qualificacao_socio: 'Sócio' }] })
    fingirFetch(u => u.includes('brasilapi') ? receita() : u.includes('treasury.gov') ? new Response(sdn) : u.includes('portaldatransparencia') ? jsonResp([{ nome: 'JOÃO DA SILVA PEREIRA', descricaoFuncao: 'Deputado Federal' }]) : tcu())
    zerar({ configuracoes: [{ chave: 'cron_segredo', valor: 'cron-1' }, { chave: 'transparencia_api_key', valor: 'chave-cgu' }], fornecedores: [], contratos: [], checagens_kyc: [], usuarios_perfis: [{ id: 'u1', funcao: 'admin' }] })
    estado.usuario = { id: 'u1' }
    const b = await (await chamar({ cnpj: CNPJ })).json()
    expect(b.risco).toBe('alto')
    expect(b.alertas).toEqual([
      'Consta na lista de sanções OFAC (EUA): BRILHO LIMPEZA.',
      'Pessoa exposta politicamente (PEP) no quadro societário: JOÃO DA SILVA PEREIRA (Deputado Federal). Diligência reforçada (Lei 9.613/98).',
    ])
    expect(b.fontes).toContain('PEP – Portal da Transparência (CGU)')
    fingirFetch(u => u.includes('brasilapi') ? receita() : u.includes('treasury.gov') ? new Response('x', { status: 503 }) : u.includes('portaldatransparencia') ? jsonResp([]) : tcu())
    const c = await (await chamar({ cnpj: CNPJ })).json()
    expect(c.risco).toBe('a conferir')
    expect(c.fontes.join(' ')).toContain('OFAC (EUA) – lista SDN (fora do ar agora)')
  })
})
