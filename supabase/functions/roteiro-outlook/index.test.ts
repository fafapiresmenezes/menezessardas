// Passo 545: Edge Function roteiro-outlook — roteiro em 5 passos por e-mail com o link webcal secreto, tarefa e estado do teste.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' })
await import('./index')
const chamar = (body: unknown = {}, auth = 'Bearer t') =>
  caixa.handler!(new Request('https://x.functions.supabase.co/roteiro-outlook', { method: 'POST', headers: { Authorization: auth }, body: JSON.stringify(body) }))

const envios: Record<string, unknown>[] = []
let brevo: () => Response
let cdnOk = true
beforeEach(() => {
  envios.length = 0; cdnOk = true
  brevo = () => new Response(JSON.stringify({ messageId: '<m1>' }), { status: 201 })
  fingirFetch((u, init) => {
    if (u.includes('brevo')) { envios.push(JSON.parse(String(init?.body))); return brevo() }
    return cdnOk ? new Response(new Uint8Array([137, 80, 78, 71])) : new Response('', { status: 404 })
  })
  zerar({
    configuracoes: [{ chave: 'brevo_api_key', valor: 'bk' }, { chave: 'email_remetente', valor: 'avisos@gmenezes.com' }, { chave: 'agenda_token', valor: 'segredo-agenda' }],
    usuarios_perfis: [{ id: 'u1', funcao: 'admin', email: 'm@gmail.com', nome_completo: 'M Figueiredo' }, { id: 'u2', funcao: 'admin', email: 'fatima@gmenezes.com', nome_completo: 'Fátima Menezes' }, { id: 'u3', funcao: 'leitor', email: 'helio@gmenezes.com' }],
    tarefas: [],
  })
  estado.usuario = { id: 'u1' }
})

describe('roteiro-outlook', () => {
  it('exige login de administrador ou operador e a configuração do Brevo e do link da agenda', async () => {
    estado.usuario = null
    expect((await chamar()).status).toBe(401)
    estado.usuario = { id: 'u3' }
    expect((await chamar()).status).toBe(403)
    estado.usuario = { id: 'u1' }
    estado.tabelas.configuracoes = estado.tabelas.configuracoes!.filter(c => c.chave !== 'agenda_token')
    const r = await chamar()
    expect(r.status).toBe(400)
    expect((await r.json()).erro).toContain('link da agenda')
    expect(envios).toHaveLength(0)
  })

  it('envio para Fátima: 5 imagens e PDF anexos, link webcal secreto, tarefa para ela e estado do teste pendente', async () => {
    const b = await (await chamar({ para: 'fatima' })).json()
    expect(b).toMatchObject({ ok: true, enviados: 1, para: ['fatima@gmenezes.com'], teste: false, mensagem: '<m1>' })
    const e = envios[0]!
    expect(e.to).toEqual([{ email: 'fatima@gmenezes.com', nome: 'Fátima Menezes' }])
    expect(e.replyTo).toEqual({ email: 'm@gmail.com' })
    expect((e.attachment as { name: string }[]).map(a => a.name)).toEqual(['passo1.png', 'passo2.png', 'passo3.png', 'passo4.png', 'passo5.png', 'roteiro-outlook.pdf'])
    const html = String(e.htmlContent)
    expect(html).toContain('Olá, Fátima.')
    expect(html).toContain('webcal://db.supabase.co/functions/v1/agenda-feed?t=segredo-agenda')
    expect(html).toContain('cid:passo1')
    expect(html.match(/Passo \d\./g)).toHaveLength(5)
    expect(estado.inseridos.find(i => i.tabela === 'consumo_api')!.linha).toMatchObject({ funcao: 'roteiro do Outlook por e-mail', quantidade: 1 })
    const tarefa = estado.inseridos.find(i => i.tabela === 'tarefas')!.linha as Record<string, unknown>
    expect(tarefa).toMatchObject({ responsavel_id: 'u2', criado_por: 'u1', prioridade: 'media' })
    expect(String(tarefa.titulo)).toContain('Conectar ao Outlook')
    expect(estado.upserts[0]).toMatchObject({ tabela: 'configuracoes', linha: { chave: 'teste_outlook' } })
    expect(JSON.parse(String((estado.upserts[0]!.linha as { valor: string }).valor))).toMatchObject({ para: ['fatima@gmenezes.com'], resultado: 'pendente' })
  })

  it('teste vai só para quem pediu, sem tarefa nem estado; imagens fora do ar viram links; falha do Brevo dá 502', async () => {
    cdnOk = false
    const b = await (await chamar({ teste: true, para: 'fatima' })).json()
    expect(b).toMatchObject({ ok: true, para: ['m@gmail.com'], teste: true })
    const e = envios[0]!
    expect(e.attachment).toEqual([])
    expect(String(e.htmlContent)).toContain('https://cdn.jsdelivr.net/gh/fafapiresmenezes/menezessardas@gh-pages/roteiro/p1.png')
    expect(estado.inseridos.map(i => i.tabela)).toEqual(['consumo_api'])
    expect(estado.upserts).toHaveLength(0)
    brevo = () => new Response(JSON.stringify({ message: 'invalid key' }), { status: 401 })
    const r = await chamar({ teste: true })
    expect(r.status).toBe(502)
    expect((await r.json()).erro).toContain('invalid key')
  })
})
