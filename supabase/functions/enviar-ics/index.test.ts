// Passo 537: Edge Function enviar-ics — convite .ics por e-mail com o mesmo UID e SEQUENCE crescente.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_SERVICE_ROLE_KEY: 'k' })
const { montarIcs } = await import('./index')
const chamar = (body: unknown, segredo: string | null = 'cron-1', method = 'POST') =>
  caixa.handler!(new Request('https://x.functions.supabase.co/enviar-ics', { method, headers: segredo ? { 'x-cron-secret': segredo } : {}, body: method === 'GET' ? undefined : JSON.stringify(body) }))

const envios: { url: string; body: Record<string, unknown>; headers: Record<string, string> }[] = []
let brevoStatus = 201
beforeEach(() => {
  envios.length = 0; brevoStatus = 201
  fingirFetch((u, init) => { envios.push({ url: u, body: JSON.parse(String(init?.body)), headers: init?.headers as Record<string, string> }); return new Response(brevoStatus < 300 ? '{}' : 'erro brevo', { status: brevoStatus }) })
  zerar({
    configuracoes: [{ chave: 'cron_segredo', valor: 'cron-1' }, { chave: 'brevo_api_key', valor: 'brevo-k' }, { chave: 'email_remetente', valor: 'agenda@gmenezes.com' }],
    compromissos: [{ id: 'k1', titulo: 'Vistoria', imovel: 'Rua A', data_evento: '2027-02-10', email_aviso: 'fatima@gmenezes.com, helio@gmenezes.com', criado_por: 'u1' }],
    tarefas: [{ id: 't1', titulo: 'Contestar', prazo: '2027-03-01T00:00:00Z', cliente: 'Loja X', responsavel_id: 'u2', criado_por: 'u1', pai_id: null }, { id: 't2', titulo: 'Sem prazo', prazo: null, cliente: null, responsavel_id: 'u2', criado_por: 'u1', pai_id: null }],
    usuarios_perfis: [{ id: 'u1', email: 'fatima@gmenezes.com' }, { id: 'u2', email: 'helio@gmenezes.com' }],
    preferencias_usuario: [{ usuario_id: 'u1', ics_por_email: true }, { usuario_id: 'u2', ics_por_email: false }],
    envios_ics: [],
  })
})

describe('montarIcs', () => {
  it('REQUEST com UID, SEQUENCE, dia inteiro (DTEND no dia seguinte), alarme de 1 dia e texto escapado; cancelado vira CANCEL', () => {
    const ics = montarIcs({ uid: 'compromissos-k1@gmenezes-advogados', sequencia: 2, titulo: 'Vistoria; final', descricao: 'Rua A, 10', data: '2027-02-10', organizador: 'agenda@gmenezes.com', convidado: 'fatima@gmenezes.com' })
    expect(ics).toContain('METHOD:REQUEST')
    expect(ics).toContain('UID:compromissos-k1@gmenezes-advogados')
    expect(ics).toContain('SEQUENCE:2')
    expect(ics).toContain('DTSTART;VALUE=DATE:20270210')
    expect(ics).toContain('DTEND;VALUE=DATE:20270211')
    expect(ics).toContain('SUMMARY:Vistoria\; final')
    expect(ics).toContain('DESCRIPTION:Rua A\\, 10')
    expect(ics).toContain('ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=FALSE:mailto:fatima@gmenezes.com')
    expect(ics).toContain('TRIGGER:-P1D')
    expect(ics).toContain('STATUS:CONFIRMED')
    const c = montarIcs({ uid: 'x', sequencia: 0, titulo: 't', descricao: '', data: '2027-12-31', organizador: 'a@b', convidado: 'c@d', cancelado: true })
    expect(c).toContain('METHOD:CANCEL')
    expect(c).toContain('STATUS:CANCELLED')
    expect(c).toContain('DTEND;VALUE=DATE:20280101')
  })
})

describe('enviar-ics', () => {
  it('exige POST, o segredo do cron e um pedido válido', async () => {
    expect((await chamar({}, 'cron-1', 'GET')).status).toBe(405)
    expect((await chamar({ origem: 'compromissos', id: 'k1' }, 'errado')).status).toBe(401)
    expect((await chamar({ origem: 'outra', id: 'k1' })).status).toBe(400)
    expect((await chamar({ origem: 'compromissos', id: 'nao-existe' })).status).toBe(404)
    expect(envios).toHaveLength(0)
  })

  it('compromisso: manda só a quem ligou a preferência, anexa o .ics, registra o envio e o consumo', async () => {
    const b = await (await chamar({ origem: 'compromissos', id: 'k1' })).json()
    expect(b.enviado).toBe(true)
    expect(b.uid).toBe('compromissos-k1@gmenezes-advogados')
    expect(b.sequencia).toBe(0)
    expect(b.resultados).toEqual([{ destinatario: 'fatima@gmenezes.com', ok: true, detalhe: undefined }])
    expect(envios).toHaveLength(1)
    expect(envios[0]!.url).toBe('https://api.brevo.com/v3/smtp/email')
    expect(envios[0]!.headers['api-key']).toBe('brevo-k')
    expect(envios[0]!.body.subject).toBe('Convite: Vistoria · 10/02/2027')
    const anexo = (envios[0]!.body.attachment as { name: string; content: string }[])[0]!
    expect(anexo.name).toBe('compromisso.ics')
    expect(decodeURIComponent(escape(atob(anexo.content)))).toContain('SUMMARY:Vistoria')
    expect(estado.inseridos.map(i => i.tabela)).toEqual(['envios_ics', 'consumo_api'])
    expect(estado.inseridos[0]!.linha).toMatchObject({ origem: 'compromissos', origem_id: 'k1', sequencia: 0, destinatario: 'fatima@gmenezes.com', ok: true })
  })

  it('reenvio usa SEQUENCE igual ao número de envios anteriores e assunto "Atualização"; falha do Brevo fica registrada', async () => {
    estado.tabelas.envios_ics = [{ uid: 'compromissos-k1@gmenezes-advogados' }, { uid: 'compromissos-k1@gmenezes-advogados' }]
    brevoStatus = 400
    const b = await (await chamar({ origem: 'compromissos', id: 'k1' })).json()
    expect(b.sequencia).toBe(2)
    expect(b.enviado).toBe(false)
    expect(b.resultados[0].detalhe).toContain('400 erro brevo')
    expect(envios[0]!.body.subject).toContain('Atualização: Vistoria')
    expect(estado.inseridos.map(i => i.tabela)).toEqual(['envios_ics'])
  })

  it('tarefa: sem prazo não envia; responsável com preferência desligada responde "preferência desligada"', async () => {
    expect(await (await chamar({ origem: 'tarefas', id: 't2' })).json()).toEqual({ enviado: false, motivo: 'sem prazo' })
    const b = await (await chamar({ origem: 'tarefas', id: 't1' })).json()
    expect(b).toEqual({ enviado: false, motivo: 'preferência desligada', candidatos: 1 })
    expect(envios).toHaveLength(0)
  })
})
