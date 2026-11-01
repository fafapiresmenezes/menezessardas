// Passo 537: Edge Function agenda-feed — calendário assinável por token, com avisos como eventos próprios.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno } from '../_testes/deno'
import { zerar } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_SERVICE_ROLE_KEY: 'k' })
await import('./index')
const chamar = (t: string) => caixa.handler!(new Request(`https://x.functions.supabase.co/agenda-feed${t ? `?t=${t}` : ''}`))

beforeEach(() => zerar({
  configuracoes: [{ chave: 'agenda_token', valor: 'segredo-123' }],
  contratos: [
    { id: 'c1', locatario_fornecedor: 'Loja X', data_vencimento: '2027-03-15', dias_aviso: 7, avisos_dias: [1, 7, 7], encerrado_em: null, imoveis: { endereco: 'Rua A, 10' } },
    { id: 'c2', locatario_fornecedor: 'Encerrado', data_vencimento: '2027-05-01', dias_aviso: 7, avisos_dias: null, encerrado_em: '2026-01-01', imoveis: null },
    { id: 'c3', locatario_fornecedor: null, data_vencimento: '2027-06-01', dias_aviso: null, avisos_dias: null, encerrado_em: null, imoveis: null },
  ],
  compromissos: [{ id: 'k1', titulo: 'Vistoria; com vírgula, e barra\\', imovel: 'Rua B', data_evento: '2027-02-10', dias_antes: 3, avisos_dias: [] }],
}))

describe('agenda-feed', () => {
  it('sem token ou com token errado responde 403', async () => {
    expect((await chamar('')).status).toBe(403)
    expect((await chamar('outro')).status).toBe(403)
  })

  it('com o token gera o .ics: contratos abertos e compromissos, cada aviso vira alarme e evento próprio, sem repetir dias', async () => {
    const r = await chamar('segredo-123')
    expect(r.status).toBe(200)
    expect(r.headers.get('Content-Type')).toContain('text/calendar')
    const ics = await r.text()
    expect(ics).toContain('X-WR-CALNAME:Prazos contratuais')
    expect(ics).toContain('REFRESH-INTERVAL;VALUE=DURATION:PT6H')
    expect(ics).not.toContain('Encerrado')
    // c1: evento principal + avisos 1 e 7 (o 7 repetido entra uma vez)
    expect(ics).toContain('UID:c-c1@gmenezes-contratos')
    expect(ics).toContain('UID:c-c1-a1@gmenezes-contratos')
    expect(ics.split('UID:c-c1-a7@').length - 1).toBe(1)
    expect(ics).toContain('SUMMARY:Aviso: faltam 1 dia — Vencimento — Loja X')
    expect(ics).toContain('SUMMARY:Aviso: faltam 7 dias — Vencimento — Loja X')
    expect(ics).toContain('DTSTART;VALUE=DATE:20270308')
    expect(ics).toContain('LOCATION:Rua A\\, 10')
    // c3 sem nome nem aviso: rótulo "contrato" e aviso padrão de 7 dias
    expect(ics).toContain('SUMMARY:Vencimento — contrato')
    expect(ics).toContain('UID:c-c3-a7@gmenezes-contratos')
    // compromisso: aviso padrão dias_antes quando avisos_dias vazio; texto escapado
    expect(ics).toContain('UID:k-k1-a3@gmenezes-contratos')
    expect(ics).toContain('SUMMARY:Vistoria\\; com vírgula\\, e barra\\\\')
    expect(ics).toContain('DTEND;VALUE=DATE:20270211')
    expect(ics.trim().endsWith('END:VCALENDAR')).toBe(true)
  })
})
