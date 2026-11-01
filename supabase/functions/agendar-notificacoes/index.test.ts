// Passo 548: Edge Function agendar-notificacoes — avisos diários de prazos por e-mail (segredo do cron, preferências por pessoa, e-mail avulso do compromisso).
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' })
await import('./index')
const chamar = (corpo: unknown = {}, headers: Record<string, string> = {}) =>
  caixa.handler!(new Request('https://x.functions.supabase.co/agendar-notificacoes', { method: 'POST', body: JSON.stringify(corpo), headers: { 'Content-Type': 'application/json', ...headers } }))
const emDias = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)

const envios: { to: string; subject: string; html: string }[] = []
beforeEach(() => {
  envios.length = 0
  fingirFetch((u, init) => {
    if (u.includes('brevo')) { const b = JSON.parse(String(init?.body)); envios.push({ to: b.to[0].email, subject: b.subject, html: b.htmlContent }); return new Response('{}', { status: 201 }) }
    return new Response('', { status: 500 })
  })
  zerar({
    configuracoes: [{ chave: 'cron_segredo', valor: 'segredo' }, { chave: 'brevo_api_key', valor: 'bk' }, { chave: 'email_remetente', valor: 'avisos@gmenezes.com' }, { chave: 'email_avisos_extra', valor: 'extra@gmenezes.com; invalido' }],
    contratos: [
      { locatario_fornecedor: 'Loja Alfa', data_vencimento: emDias(7), dias_aviso: 7, avisos_dias: null, encerrado_em: null, imoveis: { endereco: 'Rua A, 1' } },
      { locatario_fornecedor: 'Loja Beta', data_vencimento: emDias(5), dias_aviso: 7, avisos_dias: [10, 3], encerrado_em: null, imoveis: null },
      { locatario_fornecedor: 'Encerrado', data_vencimento: emDias(0), dias_aviso: 7, avisos_dias: null, encerrado_em: '2026-01-01', imoveis: null },
    ],
    compromissos: [{ id: 1, titulo: 'Audiência', imovel: 'Fórum', data_evento: emDias(0), dias_antes: 3, avisos_dias: null, email_aviso: 'cliente@x.com' }],
    usuarios_perfis: [{ id: 'u1', email: 'fatima@gmenezes.com' }, { id: 'u2', email: 'helio@gmenezes.com' }, { id: 'u3', email: null }],
    preferencias_usuario: [{ usuario_id: 'u2', alertas_email: false, dias_antecedencia: 30 }],
    consumo_api: [],
  })
})

describe('agendar-notificacoes', () => {
  it('sem segredo do cron (ou com segredo errado) o disparo geral é recusado', async () => {
    expect((await chamar()).status).toBe(401)
    expect((await chamar({}, { 'x-cron-secret': 'outro' })).status).toBe(401)
    expect(envios).toHaveLength(0)
  })

  it('cron: avisa só os itens na janela, respeita quem desligou o e-mail, inclui extra e manda aviso avulso ao e-mail do compromisso', async () => {
    const b = await (await chamar({}, { 'x-cron-secret': 'segredo' })).json()
    expect(b).toMatchObject({ itens: 2, destinatarios: 2, avulsos: 1, enviado: true })
    expect(envios.map(e => e.to).sort()).toEqual(['cliente@x.com', 'extra@gmenezes.com', 'fatima@gmenezes.com'])
    const paraFatima = envios.find(e => e.to === 'fatima@gmenezes.com')!
    expect(paraFatima.subject).toBe('2 prazo(s) se aproximando')
    expect(paraFatima.html).toContain('Audiência')
    expect(paraFatima.html).toContain('Loja Alfa')
    expect(paraFatima.html).not.toContain('Loja Beta')
    expect(paraFatima.html).toContain('calendar.google.com')
    // Aviso avulso só do próprio compromisso.
    const avulso = envios.find(e => e.to === 'cliente@x.com')!
    expect(avulso.subject).toBe('1 prazo(s) se aproximando')
    expect(avulso.html).not.toContain('Loja Alfa')
    expect(estado.inseridos[0]).toMatchObject({ tabela: 'consumo_api', linha: { funcao: 'avisos por e-mail', modelo: 'brevo-email', quantidade: 2 } })
  })

  it('teste pedido por quem está logado vai só para a própria pessoa; sem login é recusado', async () => {
    expect((await chamar({ teste: true })).status).toBe(401)
    estado.usuario = { id: 'u1', email: 'fatima@gmenezes.com' }
    const b = await (await chamar({ teste: true }, { Authorization: 'Bearer t' })).json()
    expect(b).toMatchObject({ itens: 1, destinatarios: 1, enviado: true })
    expect(envios.map(e => e.to)).toEqual(['fatima@gmenezes.com'])
    expect(envios[0]!.html).toContain('E-mail de teste')
    expect(estado.inseridos[0]!.linha).toMatchObject({ funcao: 'e-mail de teste', quantidade: 1 })
  })

  it('sem provedor configurado informa o motivo; sem prazos na janela não envia', async () => {
    estado.tabelas.configuracoes = [{ chave: 'cron_segredo', valor: 'segredo' }]
    let b = await (await chamar({}, { 'x-cron-secret': 'segredo' })).json()
    expect(b).toMatchObject({ itens: 2, enviado: false, motivo: 'provedor de e-mail ainda não configurado' })
    estado.tabelas.contratos = []; estado.tabelas.compromissos = []
    b = await (await chamar({}, { 'x-cron-secret': 'segredo' })).json()
    expect(b).toMatchObject({ itens: 0, enviado: false, motivo: 'nenhum prazo dentro da janela de aviso' })
    expect(envios).toHaveLength(0)
  })

  it('falha do Brevo em um destinatário marca enviado=false com o detalhe e não registra consumo', async () => {
    fingirFetch((u, init) => {
      const b = JSON.parse(String(init?.body))
      return b.to[0].email === 'extra@gmenezes.com' ? new Response('cota', { status: 402 }) : new Response('{}', { status: 201 })
    })
    const b = await (await chamar({}, { 'x-cron-secret': 'segredo' })).json()
    expect(b.enviado).toBe(false)
    expect(b.detalhe.corpo).toBe('402 cota')
    expect(estado.inseridos).toHaveLength(0)
  })
})
