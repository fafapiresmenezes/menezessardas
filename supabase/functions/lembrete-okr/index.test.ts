// Passo 542: Edge Function lembrete-okr — lembrete 15 dias antes do fim do trimestre, uma vez, com tarefa e e-mail.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fingirDeno, fingirFetch } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_SERVICE_ROLE_KEY: 'k' })
await import('./index')
const chamar = (body: unknown = {}, headers: Record<string, string> = { 'x-cron-secret': 'cron-1' }) =>
  caixa.handler!(new Request('https://x.functions.supabase.co/lembrete-okr', { method: 'POST', headers, body: JSON.stringify(body) }))

const envios: { to: string; subject: string }[] = []
beforeEach(() => {
  envios.length = 0
  fingirFetch((_u, init) => { const b = JSON.parse(String(init?.body)); envios.push({ to: b.to[0].email, subject: b.subject }); return new Response('{}', { status: 201 }) })
  zerar({
    configuracoes: [{ chave: 'cron_segredo', valor: 'cron-1' }, { chave: 'brevo_api_key', valor: 'bk' }, { chave: 'email_remetente', valor: 'avisos@gmenezes.com' }],
    usuarios_perfis: [{ id: 'u1', funcao: 'admin', email: 'fatima@gmenezes.com' }, { id: 'u2', funcao: 'admin', email: 'robo@exemplo.com' }, { id: 'u3', funcao: 'operador', email: 'helio@gmenezes.com' }],
    tarefas: [],
  })
})
afterEach(() => vi.useRealTimers())
const fixar = (iso: string) => { vi.useFakeTimers({ shouldAdvanceTime: true }); vi.setSystemTime(new Date(iso)) }

describe('lembrete-okr', () => {
  it('sem segredo exige login de administrador ou operador', async () => {
    expect((await chamar({}, {})).status).toBe(401)
    estado.usuario = { id: 'u9' }
    expect((await chamar({}, { Authorization: 'Bearer t' })).status).toBe(403)
    estado.usuario = { id: 'u3' }
    expect((await chamar({}, { Authorization: 'Bearer t' })).status).toBe(200)
  })

  it('longe do fim do trimestre não envia e diz quantos dias faltam', async () => {
    fixar('2026-11-02T15:00:00Z')
    const b = await (await chamar()).json()
    expect(b.enviado).toBe(false)
    expect(b.trimestre).toBe('2026-T4')
    expect(b.motivo).toContain('faltam 59 dias')
    expect(envios).toHaveLength(0)
  })

  it('a 15 dias do fim: e-mail às administradoras reais, tarefa com prazo no último dia e marca para não repetir', async () => {
    fixar('2026-12-16T15:00:00Z')
    const b = await (await chamar()).json()
    expect(b).toMatchObject({ enviado: true, enviados: 1, para: ['fatima@gmenezes.com'], trimestre: '2026-T4', dias_para_fim: 15, teste: false })
    expect(envios[0]!.subject).toBe('Revisar OKRs do trimestre 2026-T4 até 31/12/2026')
    const tarefa = estado.inseridos.find(i => i.tabela === 'tarefas')!.linha as Record<string, unknown>
    expect(tarefa).toMatchObject({ titulo: 'Revisar OKRs do trimestre 2026-T4', prazo: '2026-12-31', prioridade: 'alta', responsavel_id: 'u1' })
    expect(b.tarefa_id).toBe(tarefa.id)
    expect(estado.upserts[0]).toMatchObject({ tabela: 'configuracoes', linha: { chave: 'lembrete_okr_2026-T4' } })
    expect(estado.inseridos.find(i => i.tabela === 'consumo_api')!.linha).toMatchObject({ quantidade: 1 })
    // segunda chamada no mesmo trimestre: já enviado
    estado.tabelas.configuracoes.push({ chave: 'lembrete_okr_2026-T4', valor: '{}' })
    const b2 = await (await chamar()).json()
    expect(b2.motivo).toContain('já enviado')
  })

  it('teste pedido por operador vai só para ele, a qualquer dia, sem tarefa nem marca', async () => {
    fixar('2026-11-02T15:00:00Z')
    estado.usuario = { id: 'u3' }
    const b = await (await chamar({ teste: true }, { Authorization: 'Bearer t' })).json()
    expect(b).toMatchObject({ enviado: true, para: ['helio@gmenezes.com'], teste: true, tarefa_id: null })
    expect(envios[0]!.subject).toMatch(/^\[teste\] /)
    expect(estado.inseridos.map(i => i.tabela)).toEqual(['consumo_api'])
    expect(estado.upserts).toHaveLength(0)
  })
})
