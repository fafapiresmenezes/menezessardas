// Passo 543: Edge Function convidar-parceiro — convite pela sede com e-mail e aceite público com criação da conta.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_ANON_KEY: 'a', SUPABASE_SERVICE_ROLE_KEY: 'k' })
await import('./index')
const chamar = (body: unknown) => caixa.handler!(new Request('https://x.functions.supabase.co/convidar-parceiro', { method: 'POST', headers: { Authorization: 'Bearer t' }, body: JSON.stringify(body) }))

const envios: { to: string; subject: string; html: string }[] = []
let brevoStatus = 201
beforeEach(() => {
  envios.length = 0; brevoStatus = 201
  fingirFetch((_u, init) => { const b = JSON.parse(String(init?.body)); envios.push({ to: b.to[0].email, subject: b.subject, html: b.htmlContent }); return new Response(brevoStatus < 300 ? '{}' : 'x', { status: brevoStatus }) })
  zerar({ configuracoes: [{ chave: 'brevo_api_key', valor: 'bk' }, { chave: 'email_remetente', valor: 'avisos@gmenezes.com' }], convites_escritorio: [] })
  estado.rpcResposta.perfil_atual = 'admin'; estado.rpcResposta.eh_sede = true
  estado.usuario = { id: 'u1' }
})

describe('convidar', () => {
  it('só a administração da sede convida; valida nome, e-mail e função', async () => {
    estado.rpcResposta.eh_sede = false
    expect((await chamar({ convidar: { nome_escritorio: 'Silva Advocacia', email: 'a@b.com', funcao: 'leitor' } })).status).toBe(403)
    estado.rpcResposta.eh_sede = true
    expect((await chamar({ convidar: { nome_escritorio: 'Si', email: 'a@b.com', funcao: 'leitor' } })).status).toBe(400)
    expect((await chamar({ convidar: { nome_escritorio: 'Silva Advocacia', email: 'sem-arroba', funcao: 'leitor' } })).status).toBe(400)
    expect((await chamar({ convidar: { nome_escritorio: 'Silva Advocacia', email: 'a@b.com', funcao: 'admin' } })).status).toBe(400)
    expect(estado.inseridos).toHaveLength(0)
  })

  it('grava o convite (e-mail minúsculo, quem criou), manda o link de aceite pelo Brevo e registra consumo', async () => {
    const b = await (await chamar({ convidar: { nome_escritorio: ' Silva Advocacia ', email: ' Ana@Silva.adv.br ', funcao: 'operador' } })).json()
    expect(b.ok).toBe(true)
    expect(b.enviado).toBe(true)
    expect(estado.inseridos[0]!.linha).toMatchObject({ nome_escritorio: 'Silva Advocacia', email: 'ana@silva.adv.br', funcao: 'operador', criado_por: 'u1' })
    expect(b.link).toMatch(/#\/convite\//)
    expect(envios[0]!.to).toBe('Ana@Silva.adv.br')
    expect(envios[0]!.subject).toContain('Silva Advocacia')
    expect(envios[0]!.html).toContain(b.link)
    expect(envios[0]!.html).toContain('operador')
    expect(estado.inseridos[1]).toMatchObject({ tabela: 'consumo_api', linha: { funcao: 'convite de escritório parceiro' } })
  })

  it('sem provedor de e-mail o convite existe e o link volta na resposta; falha do Brevo traz o detalhe', async () => {
    estado.tabelas.configuracoes = []
    let b = await (await chamar({ convidar: { nome_escritorio: 'Silva Advocacia', email: 'a@b.com', funcao: 'leitor' } })).json()
    expect(b).toMatchObject({ ok: true, enviado: false, detalhe: 'provedor de e-mail não configurado' })
    expect(envios).toHaveLength(0)
    zerar({ configuracoes: [{ chave: 'brevo_api_key', valor: 'bk' }, { chave: 'email_remetente', valor: 'x@y' }] }); estado.rpcResposta.perfil_atual = 'admin'; estado.rpcResposta.eh_sede = true
    brevoStatus = 400
    b = await (await chamar({ convidar: { nome_escritorio: 'Silva Advocacia', email: 'a@b.com', funcao: 'leitor' } })).json()
    expect(b.enviado).toBe(false)
    expect(b.detalhe).toContain('400')
  })
})

describe('aceitar', () => {
  const futuro = new Date(Date.now() + 5 * 86400000).toISOString()
  it('senha curta, convite inexistente, já usado ou expirado são recusados', async () => {
    expect((await chamar({ aceitar: { token: 'tk', nome: 'Ana', senha: '1234567' } })).status).toBe(400)
    expect((await chamar({ aceitar: { token: 'nao-existe', nome: 'Ana', senha: 'senha-forte-1' } })).status).toBe(404)
    estado.tabelas.convites_escritorio = [{ id: 'cv1', token: 'usado', email: 'a@b.com', aceito_em: '2026-01-01', expira_em: futuro }, { id: 'cv2', token: 'velho', email: 'a@b.com', aceito_em: null, expira_em: '2026-01-01T00:00:00Z' }]
    expect((await (await chamar({ aceitar: { token: 'usado', nome: 'Ana', senha: 'senha-forte-1' } })).json()).erro).toContain('já foi usado')
    expect((await (await chamar({ aceitar: { token: 'velho', nome: 'Ana', senha: 'senha-forte-1' } })).json()).erro).toContain('expirou')
    expect(estado.authAdmin.criados).toHaveLength(0)
  })

  it('cria a conta com e-mail confirmado e chama aceitar_convite_parceiro; e-mail já cadastrado não troca senha', async () => {
    estado.tabelas.convites_escritorio = [{ id: 'cv1', token: 'tk-1', email: 'ana@silva.adv.br', aceito_em: null, expira_em: futuro }]
    estado.rpcResposta.aceitar_convite_parceiro = 'esc-9'
    const b = await (await chamar({ aceitar: { token: 'tk-1', nome: 'Ana Silva', senha: 'senha-forte-1' } })).json()
    expect(b).toEqual({ ok: true, escritorio_id: 'esc-9', email: 'ana@silva.adv.br' })
    expect(estado.authAdmin.criados[0]).toEqual({ email: 'ana@silva.adv.br', password: 'senha-forte-1', email_confirm: true, user_metadata: { nome: 'Ana Silva' } })
    expect(estado.rpcs.find(r => r.nome === 'aceitar_convite_parceiro')!.args).toEqual({ p_token: 'tk-1', p_usuario: 'auth-1', p_nome: 'Ana Silva' })
    estado.authAdmin.erro = 'already registered'
    const r = await chamar({ aceitar: { token: 'tk-1', nome: 'Ana', senha: 'senha-forte-1' } })
    expect(r.status).toBe(400)
    expect((await r.json()).erro).toContain('já tem conta')
  })

  it('pedido sem convidar nem aceitar é inválido', async () => {
    expect((await chamar({})).status).toBe(400)
  })
})
