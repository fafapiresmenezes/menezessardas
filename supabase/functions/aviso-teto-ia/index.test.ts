// Passo 541: Edge Function aviso-teto-ia — aviso de 80% e 100% do teto mensal de IA aos administradores.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_SERVICE_ROLE_KEY: 'k' })
await import('./index')
const chamar = (body: unknown = {}, headers: Record<string, string> = { 'x-cron-secret': 'cron-1' }) =>
  caixa.handler!(new Request('https://x.functions.supabase.co/aviso-teto-ia', { method: 'POST', headers, body: JSON.stringify(body) }))

const envios: { to: string; subject: string; html: string }[] = []
let brevoStatus = 201
beforeEach(() => {
  envios.length = 0; brevoStatus = 201
  fingirFetch((_u, init) => { const b = JSON.parse(String(init?.body)); envios.push({ to: b.to[0].email, subject: b.subject, html: b.htmlContent }); return new Response(brevoStatus < 300 ? '{}' : 'falhou', { status: brevoStatus }) })
  zerar({
    configuracoes: [{ chave: 'cron_segredo', valor: 'cron-1' }, { chave: 'brevo_api_key', valor: 'bk' }, { chave: 'email_remetente', valor: 'avisos@gmenezes.com' }],
    usuarios_perfis: [{ id: 'u1', funcao: 'admin', email: 'fatima@gmenezes.com' }, { id: 'u2', funcao: 'admin', email: 'm@gmail.com' }, { id: 'u3', funcao: 'leitor', email: 'helio@gmenezes.com' }],
    avisos_teto_ia: [{ id: 7, email_enviado_em: null }],
  })
  estado.rpcResposta.verificar_teto_ia = { teto_brl: 200, gasto_brl: 165.5, pct: 83, aviso_novo: null }
})

describe('aviso-teto-ia', () => {
  it('sem segredo exige administrador logado', async () => {
    expect((await chamar({}, {})).status).toBe(401)
    estado.usuario = { id: 'u3', email: 'helio@gmenezes.com' }
    expect((await chamar({}, { authorization: 'Bearer t' })).status).toBe(403)
    estado.usuario = { id: 'u1', email: 'fatima@gmenezes.com' }
    expect((await chamar({}, { authorization: 'Bearer t' })).status).toBe(200)
  })

  it('sem aviso novo nada é enviado; sem teto definido o motivo diz isso; erro da verificação dá 500', async () => {
    let b = await (await chamar()).json()
    expect(b).toMatchObject({ pct: 83, enviado: false, motivo: 'nenhum aviso novo' })
    estado.rpcResposta.verificar_teto_ia = { teto_brl: null, gasto_brl: 10, pct: null, aviso_novo: null }
    b = await (await chamar()).json()
    expect(b.motivo).toBe('sem teto definido')
    estado.rpcErro.verificar_teto_ia = 'função ausente'
    expect((await chamar()).status).toBe(500)
    expect(envios).toHaveLength(0)
  })

  it('aviso novo de 80%: e-mail a cada administrador (sem repetir), registra consumo e marca o aviso como enviado', async () => {
    estado.rpcResposta.verificar_teto_ia = { teto_brl: 200, gasto_brl: 165.5, pct: 83, aviso_novo: { id: 7, nivel: 80 } }
    const b = await (await chamar()).json()
    expect(b).toMatchObject({ nivel: 80, enviado: true, destinatarios: 2 })
    expect(envios.map(e => e.to)).toEqual(['fatima@gmenezes.com', 'm@gmail.com'])
    expect(envios[0]!.subject).toContain('80% do teto mensal')
    expect(envios[0]!.html).toContain('R$ 165,50')
    expect(envios[0]!.html).toContain('R$ 200,00')
    expect(estado.inseridos[0]).toMatchObject({ tabela: 'consumo_api', linha: { funcao: 'avisos por e-mail', quantidade: 2 } })
    expect(estado.atualizados[0]).toMatchObject({ tabela: 'avisos_teto_ia', filtros: [['id', 'eq', 7]] })
    expect(estado.tabelas.avisos_teto_ia[0]!.destinatarios).toBe(2)
  })

  it('100% avisa que a IA pausou; falha do Brevo não registra consumo; teste pelo administrador vai só para ele e não grava', async () => {
    estado.rpcResposta.verificar_teto_ia = { teto_brl: 200, gasto_brl: 201, pct: 100, aviso_novo: { id: 8, nivel: 100 } }
    brevoStatus = 500
    let b = await (await chamar()).json()
    expect(b.enviado).toBe(false)
    expect(b.detalhe).toContain('500 falhou')
    expect(envios[0]!.subject).toContain('pausada')
    expect(estado.inseridos).toHaveLength(0)
    brevoStatus = 201; envios.length = 0
    estado.rpcResposta.verificar_teto_ia = { teto_brl: 200, gasto_brl: 10, pct: 5, aviso_novo: null }
    estado.usuario = { id: 'u1', email: 'fatima@gmenezes.com' }
    b = await (await chamar({ teste: true }, { authorization: 'Bearer t' })).json()
    expect(b).toMatchObject({ nivel: 80, enviado: true, destinatarios: 1 })
    expect(envios.map(e => e.to)).toEqual(['fatima@gmenezes.com'])
    expect(envios[0]!.html).toContain('e-mail de teste')
    expect(estado.atualizados).toHaveLength(0)
  })
})
