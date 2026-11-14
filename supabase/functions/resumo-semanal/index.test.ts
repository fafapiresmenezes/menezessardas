// Passo 549: Edge Function resumo-semanal — resumo de segunda-feira por função: guarda em resumos_semanais, envia à equipe com a marca do escritório.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' })
await import('./index')
const chamar = (corpo: unknown = {}, headers: Record<string, string> = {}) =>
  caixa.handler!(new Request('https://x.functions.supabase.co/resumo-semanal', { method: 'POST', body: JSON.stringify(corpo), headers: { 'Content-Type': 'application/json', ...headers } }))
const RESUMO = { semana: '2026-11-02', socia: { contratos_vencidos: 2, valor_60_dias: 1234.5 }, advogada: { intimacoes_nao_lidas: 1 }, secretaria: { compromissos_lista: '' } }

const envios: { to: string; subject: string; html: string; from: string }[] = []
beforeEach(() => {
  envios.length = 0
  fingirFetch((u, init) => {
    if (u.includes('brevo')) { const b = JSON.parse(String(init?.body)); envios.push({ to: b.to[0].email, subject: b.subject, html: b.htmlContent, from: b.sender.name }); return new Response('{}', { status: 201 }) }
    return new Response('', { status: 500 })
  })
  zerar({
    configuracoes: [{ chave: 'cron_segredo', valor: 'segredo' }, { chave: 'brevo_api_key', valor: 'bk' }, { chave: 'email_remetente', valor: 'avisos@gmenezes.com' }],
    usuarios_perfis: [
      { id: 'u1', funcao: 'admin', email: 'fatima@gmenezes.com', escritorio_id: 'sede' }, { id: 'u2', funcao: 'operador', email: 'leticia@lsm.law' },
      { id: 'u3', funcao: 'leitor', email: 'helio@gmenezes.com' }, { id: 'u4', funcao: 'admin', email: 'teste-automatico@exemplo.com' },
    ],
    resumos_semanais: [], consumo_api: [],
  })
  estado.rpcResposta.resumo_semanal = RESUMO
  estado.rpcResposta.marca_escritorio = { nome: 'Parceiro <X>', cor: '#aa0000', logo_url: 'https://cdn/logo.png', sede: false }
})

describe('resumo-semanal', () => {
  it('sem cron e sem login é recusado; conta logada sem perfil liberado é 403', async () => {
    expect((await chamar()).status).toBe(401)
    estado.usuario = { id: 'u9', email: 'x@y.com' }
    expect((await chamar({}, { Authorization: 'Bearer t' })).status).toBe(403)
    expect(envios).toHaveLength(0)
  })

  it('cron: guarda o resumo da semana, envia a administradoras e operadoras reais com a marca do escritório e registra consumo', async () => {
    const b = await (await chamar({}, { 'x-cron-secret': 'segredo' })).json()
    expect(b).toMatchObject({ enviado: true, destinatarios: 2, teste: false, resumo: RESUMO })
    expect(estado.rpcs.map(r => r.nome)).toEqual(['resumo_semanal', 'marca_escritorio'])
    expect(estado.rpcs[1]!.args).toEqual({ p_id: null })
    expect(estado.upserts[0]).toMatchObject({ tabela: 'resumos_semanais', linha: { conteudo: RESUMO } })
    expect(String((estado.upserts[0]!.linha as { semana: string }).semana)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(envios.map(e => e.to).sort()).toEqual(['fatima@gmenezes.com', 'leticia@lsm.law'])
    const e = envios[0]!
    expect(e.subject).toBe('Resumo semanal do escritório · semana de 2026-11-02')
    expect(e.from).toBe('Avisos Parceiro X')
    expect(e.html).toContain('background:#aa0000')
    expect(e.html).toContain('<img src="https://cdn/logo.png"')
    expect(e.html).toContain('Contratos vencidos')
    expect(e.html).toMatch(/R\$.1\.234,50/)
    expect(e.html).toContain('<strong>—</strong>')
    expect(e.html).toContain('plataforma do THEYE Institute')
    expect(e.html).not.toContain('envio de teste')
    expect(estado.inseridos[0]).toMatchObject({ tabela: 'consumo_api', linha: { funcao: 'resumo semanal por e-mail', quantidade: 2 } })
    expect(estado.atualizados[0]).toMatchObject({ tabela: 'resumos_semanais', valores: { destinatarios: 2 }, filtros: [['id', 'eq', 'novo-1']] })
  })

  it('teste de quem está logado vai só para a pessoa, usa o escritório dela e não grava o resumo', async () => {
    estado.usuario = { id: 'u1', email: 'fatima@gmenezes.com' }
    estado.rpcResposta.marca_escritorio = { cor: 'vermelho' }
    const b = await (await chamar({ teste: true }, { Authorization: 'Bearer t' })).json()
    expect(b).toMatchObject({ enviado: true, destinatarios: 1, teste: true })
    expect(estado.rpcs[1]!.args).toEqual({ p_id: 'sede' })
    expect(estado.upserts).toHaveLength(0)
    expect(estado.atualizados).toHaveLength(0)
    expect(envios.map(e => e.to)).toEqual(['fatima@gmenezes.com'])
    expect(envios[0]!.html).toContain('envio de teste')
    expect(envios[0]!.html).toContain('background:#14213d')
    expect(envios[0]!.html).toContain('Instituto THEYE')
    expect(envios[0]!.html).not.toContain('<img')
  })

  it('sem provedor devolve o resumo sem enviar; falha do Brevo não registra consumo; erro da função SQL é 500', async () => {
    estado.tabelas.configuracoes = [{ chave: 'cron_segredo', valor: 'segredo' }]
    let b = await (await chamar({}, { 'x-cron-secret': 'segredo' })).json()
    expect(b).toMatchObject({ enviado: false, motivo: 'provedor de e-mail não configurado', destinatarios: 2, resumo: RESUMO })
    estado.tabelas.configuracoes.push({ chave: 'brevo_api_key', valor: 'bk' }, { chave: 'email_remetente', valor: 'a@b' })
    fingirFetch(() => new Response('cota', { status: 402 }))
    b = await (await chamar({}, { 'x-cron-secret': 'segredo' })).json()
    expect(b).toMatchObject({ enviado: false, detalhe: '402 cota' })
    expect(estado.inseridos).toHaveLength(0)
    estado.rpcErro.resumo_semanal = 'função ausente'
    const r = await chamar({}, { 'x-cron-secret': 'segredo' })
    expect(r.status).toBe(500); expect((await r.json()).erro).toBe('função ausente')
  })
})
