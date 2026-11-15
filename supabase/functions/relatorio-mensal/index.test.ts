// Passo 554: Edge Function relatorio-mensal — relatório do mês em PDF (pdf-lib), guardado com hash e enviado às administradoras; baixar e teste para quem pediu.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'
import { desenhado } from '../_testes/pdf-lib'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' })
await import('./index')
const chamar = (corpo: unknown = {}, headers: Record<string, string> = {}) =>
  caixa.handler!(new Request('https://x.functions.supabase.co/relatorio-mensal', { method: 'POST', body: JSON.stringify(corpo), headers: { 'Content-Type': 'application/json', ...headers } }))
const RELATORIO = { mes: 'outubro de 2026', periodo: '01/10/2026 a 31/10/2026', contratos: { ativos: 12, novos: 2, valor_periodico_total: 45000 }, imoveis: { total: 9 }, casos: { projetos_abertos: 4, tarefas_concluidas: 17 },
  financeiro: { horas_lancadas: 31.5, honorarios_em_aberto: 1200 }, intimacoes: { recebidas: 3, nao_lidas: null }, ia: { chamadas: 40 }, assinaturas: { pedidas: 1, assinadas: 1 }, compliance: { diagnosticos: 1, nota_media: 82 } }

const envios: { to: string; subject: string; html: string; anexo: { name: string; content: string } }[] = []
beforeEach(() => {
  envios.length = 0
  fingirFetch((u, init) => {
    if (u.includes('brevo')) { const b = JSON.parse(String(init?.body)); envios.push({ to: b.to[0].email, subject: b.subject, html: b.htmlContent, anexo: b.attachment[0] }); return new Response('{}', { status: 201 }) }
    return new Response('', { status: 500 })
  })
  zerar({
    configuracoes: [{ chave: 'cron_segredo', valor: 'segredo' }, { chave: 'brevo_api_key', valor: 'bk' }, { chave: 'email_remetente', valor: 'avisos@gmenezes.com' }],
    usuarios_perfis: [{ id: 'u1', funcao: 'admin', email: 'fatima@gmenezes.com' }, { id: 'u2', funcao: 'operador', email: 'leticia@lsm.law' }, { id: 'u3', funcao: 'admin', email: 'teste-automatico@exemplo.com' }, { id: 'u4', funcao: 'leitor', email: 'helio@gmenezes.com' }],
    relatorios_mensais: [], consumo_api: [],
  })
  estado.rpcResposta.relatorio_mensal = RELATORIO
})
const mesAnterior = () => { const h = new Date(); return new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth() - 1, 1)).toISOString().slice(0, 10) }
const mesCorrente = () => { const h = new Date(); return `${h.getUTCFullYear()}-${String(h.getUTCMonth() + 1).padStart(2, '0')}-01` }

describe('relatorio-mensal', () => {
  it('sem cron e sem login é 401; leitora é 403', async () => {
    expect((await chamar()).status).toBe(401)
    estado.usuario = { id: 'u4', email: 'helio@gmenezes.com' }
    expect((await chamar({}, { Authorization: 'Bearer t' })).status).toBe(403)
    expect(estado.rpcs).toHaveLength(0)
  })

  it('cron: mês anterior por padrão, PDF com todas as seções, guardado com SHA-256 e enviado em anexo só às administradoras reais', async () => {
    const b = await (await chamar({}, { 'x-cron-secret': 'segredo' })).json()
    expect(b).toMatchObject({ mes: mesAnterior(), enviado: true, destinatarios: 1, teste: false, resumo: RELATORIO })
    expect(b.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(estado.rpcs[0]).toEqual({ nome: 'relatorio_mensal', args: { p_mes: mesAnterior() } })
    expect(desenhado.titulo).toBe('Relatório mensal outubro de 2026 - Instituto THEYE')
    for (const t of ['Contratos', 'Contratos vigentes', '12', 'R$ 45.000,00', 'Horas e honorários', '31,5', 'Intimações', 'Ainda não lidas', 'Compliance', 'Inteligência artificial']) expect(desenhado.textos).toContain(t)
    expect(desenhado.textos).toContain('-') // valor nulo vira traço (WinAnsi)
    expect(estado.upserts[0]).toMatchObject({ tabela: 'relatorios_mensais', linha: { mes: mesAnterior(), conteudo: RELATORIO, sha256: b.sha256 } })
    expect(envios.map(e => e.to)).toEqual(['fatima@gmenezes.com'])
    expect(envios[0]!.subject).toBe('Relatório mensal do escritório · outubro de 2026')
    expect(envios[0]!.anexo.name).toBe(`relatorio-mensal-${mesAnterior().slice(0, 7)}.pdf`)
    expect(Buffer.from(envios[0]!.anexo.content, 'base64').toString('latin1')).toMatch(/^%PDF/)
    expect(envios[0]!.html).toContain(b.sha256)
    expect(envios[0]!.html).toContain('<strong>Contratos vigentes:</strong> 12')
    expect(envios[0]!.html).not.toContain('envio de teste')
    expect(estado.inseridos[0]).toMatchObject({ tabela: 'consumo_api', linha: { funcao: 'relatório mensal por e-mail', quantidade: 1 } })
    expect(estado.atualizados[0]).toMatchObject({ tabela: 'relatorios_mensais', valores: { destinatarios: 1 }, filtros: [['id', 'eq', 'novo-1']] })
  })

  it('operadora logada: teste usa o mês corrente, vai só para ela e não grava; mês escolhido vale; baixar devolve o PDF em base64', async () => {
    estado.usuario = { id: 'u2', email: 'leticia@lsm.law' }
    let b = await (await chamar({ teste: true }, { Authorization: 'Bearer t' })).json()
    expect(b).toMatchObject({ mes: mesCorrente(), enviado: true, destinatarios: 1, teste: true })
    expect(estado.upserts).toHaveLength(0)
    expect(envios.map(e => e.to)).toEqual(['leticia@lsm.law'])
    expect(envios[0]!.html).toContain('envio de teste')
    b = await (await chamar({ mes: '2026-09-01', baixar: true }, { Authorization: 'Bearer t' })).json()
    expect(b).toMatchObject({ mes: '2026-09-01', arquivo: 'relatorio-mensal-2026-09.pdf' })
    expect(Buffer.from(b.pdf_base64, 'base64').toString('latin1')).toMatch(/^%PDF/)
    expect(estado.upserts).toHaveLength(1) // baixar sem teste guarda o relatório do mês
    expect(envios).toHaveLength(1)
    expect(estado.rpcs.at(-1)!.args).toEqual({ p_mes: '2026-09-01' })
  })

  it('sem provedor devolve o resumo e o hash sem enviar; erro da função SQL é 500; falha do Brevo não registra consumo', async () => {
    estado.tabelas.configuracoes = [{ chave: 'cron_segredo', valor: 'segredo' }]
    let b = await (await chamar({}, { 'x-cron-secret': 'segredo' })).json()
    expect(b).toMatchObject({ enviado: false, motivo: 'provedor de e-mail não configurado', resumo: RELATORIO })
    expect(b.sha256).toMatch(/^[0-9a-f]{64}$/)
    estado.tabelas.configuracoes.push({ chave: 'brevo_api_key', valor: 'bk' }, { chave: 'email_remetente', valor: 'a@b' })
    fingirFetch(() => new Response('cota', { status: 402 }))
    b = await (await chamar({}, { 'x-cron-secret': 'segredo' })).json()
    expect(b).toMatchObject({ enviado: false, detalhe: '402 cota' })
    expect(estado.inseridos).toHaveLength(0)
    estado.rpcErro.relatorio_mensal = 'função ausente'
    const r = await chamar({}, { 'x-cron-secret': 'segredo' })
    expect(r.status).toBe(500); expect((await r.json()).erro).toBe('função ausente')
  })
})
