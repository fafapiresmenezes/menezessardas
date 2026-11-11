// Passo 552: Edge Function instituto-acesso — laboratório do THEYE Institute: desafio anti-robô, cadastro (CPF vira HMAC), entrada por link, confirmação, estado, opções e consulta.
import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { fingirDeno, fingirFetch } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' })
await import('./index')
const chamar = (corpo: unknown = {}, headers: Record<string, string> = {}, method = 'POST') =>
  caixa.handler!(new Request('https://x.functions.supabase.co/instituto-acesso', { method, body: method === 'POST' ? JSON.stringify(corpo) : undefined, headers: { 'Content-Type': 'application/json', ...headers } }))
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('')
const sha = async (t: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))
async function hmac(chave: string, t: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(chave), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(t)))
}
const SEGREDOS = { assinatura_desafio: 'assina', pimenta_cpf: 'pimenta' }
const CPF = '529.982.247-25'

// Prova de trabalho válida, calculada uma vez (4 zeros hexadecimais).
let prova: { sal: string; emitido: number; assinatura: string; nonce: number }
beforeAll(async () => {
  const sal = 'sal-fixo', emitido = Date.now()
  let nonce = 0
  while (!(await sha(`${sal}:${nonce}`)).startsWith('0000')) nonce++
  prova = { sal, emitido, assinatura: await hmac(SEGREDOS.assinatura_desafio, `${sal}|${emitido}`), nonce }
}, 60000)

const envios: { to: string; subject: string; html: string }[] = []
beforeEach(() => {
  envios.length = 0
  fingirFetch((u, init) => {
    if (u.includes('brevo')) { const b = JSON.parse(String(init?.body)); envios.push({ to: b.to[0].email, subject: b.subject, html: b.htmlContent }); return new Response('{}', { status: 201 }) }
    return new Response('', { status: 500 })
  })
  zerar({ configuracoes: [{ chave: 'brevo_api_key', valor: 'bk' }, { chave: 'email_remetente', valor: 'lab@theye.club' }], consumo_api: [] })
  Object.assign(estado.rpcResposta, { instituto_segredos_servico: SEGREDOS, instituto_registrar_tentativa: 'ok', instituto_cadastrar: { id: 'm1' }, instituto_novo_token: true,
    instituto_confirmar: { id: 'm1', plano: 'gratis', pode_consultar: true }, instituto_membro_por_sessao: { id: 'm1', plano: 'gratis', pode_consultar: true }, instituto_opcoes: { tribunais: ['TJRJ'] },
    instituto_prever: { probabilidade: 0.71 } })
})
const cadastro = (extra: Record<string, unknown> = {}) => ({ acao: 'cadastrar', email: 'Jo.Ao+lab@Gmail.com', cpf: CPF, aceite: true, ms: 5000, prova, ...extra })
const rpc = (nome: string) => estado.rpcs.filter(r => r.nome === nome).map(r => r.args)

describe('instituto-acesso', () => {
  it('CORS ecoa só as origens do Instituto; ação desconhecida é 400', async () => {
    expect((await chamar({}, { origin: 'https://www.theye.club' }, 'OPTIONS')).headers.get('Access-Control-Allow-Origin')).toBe('https://www.theye.club')
    const r = await chamar({ acao: 'nada' }, { origin: 'https://outro.com' })
    expect(r.status).toBe(400)
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe('https://instituto-theye.vercel.app')
  })

  it('desafio devolve sal, hora, 16 bits e assinatura conferível com o segredo do servidor', async () => {
    const b = await (await chamar({ acao: 'desafio' })).json()
    expect(b.sal).toMatch(/^[0-9a-f]{64}$/)
    expect(b.bits).toBe(16)
    expect(b.assinatura).toBe(await hmac(SEGREDOS.assinatura_desafio, `${b.sal}|${b.emitido}`))
  })

  it('cadastrar recusa e-mail inválido ou temporário, armadilha preenchida, prova errada, tempo curto, desafio reusado, limite da rede, sem aceite e CPF inválido', async () => {
    const casos: [Record<string, unknown>, number, string][] = [
      [{ email: 'sem-arroba' }, 400, 'e-mail válido'], [{ email: 'x@mailinator.com' }, 400, 'temporários'], [{ site: 'http://spam' }, 400, 'uma pessoa'],
      [{ prova: { ...prova, assinatura: 'x' } }, 400, 'uma pessoa'], [{ prova: { ...prova, nonce: 1 } }, 400, 'uma pessoa'], [{ ms: 1000 }, 400, 'uma pessoa'],
      [{ aceite: false }, 400, 'aceitar os termos'], [{ cpf: '111.111.111-11' }, 400, 'CPF inválido'], [{ cpf: '529.982.247-26' }, 400, 'CPF inválido'],
    ]
    for (const [extra, status, texto] of casos) {
      const r = await chamar(cadastro(extra))
      expect(r.status, JSON.stringify(extra)).toBe(status)
      expect((await r.json()).erro).toContain(texto)
    }
    estado.rpcResposta.instituto_registrar_tentativa = 'reuso'
    expect((await (await chamar(cadastro())).json()).erro).toContain('já foi usada')
    estado.rpcResposta.instituto_registrar_tentativa = 'limite'
    expect((await chamar(cadastro())).status).toBe(429)
    expect(rpc('instituto_cadastrar')).toHaveLength(0)
    expect(envios).toHaveLength(0)
  })

  it('cadastro válido: e-mail normalizado (sem +apelido e sem pontos no Gmail), CPF só como HMAC, rede só como HMAC do IP, link de confirmação e consumo', async () => {
    const b = await (await chamar(cadastro(), { 'x-forwarded-for': '200.1.2.3, 10.0.0.1', origin: 'https://theye.club' })).json()
    expect(b).toMatchObject({ ok: true, enviado: true })
    expect(b.mensagem).toContain('joao@gmail.com')
    const args = rpc('instituto_cadastrar')[0] as Record<string, string>
    expect(args.p_email).toBe('joao@gmail.com')
    expect(args.p_cpf_hmac).toBe(await hmac(SEGREDOS.pimenta_cpf, '52998224725'))
    expect(args.p_rede).toBe(await hmac(SEGREDOS.pimenta_cpf, 'ip:200.1.2.3'))
    expect(args.p_aceite).toBe('termos-lab-v1-2026-10-31')
    expect(args.p_token_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(args)).not.toContain('52998224725')
    expect(rpc('instituto_registrar_tentativa')[0]).toEqual({ p_rede: args.p_rede, p_sal: 'sal-fixo' })
    expect(envios[0]).toMatchObject({ to: 'joao@gmail.com', subject: 'Confirme seu cadastro no THEYE Institute' })
    expect(envios[0]!.html).toContain('https://theye.club/laboratorio.html#t=')
    expect(estado.inseridos[0]).toMatchObject({ tabela: 'consumo_api', linha: { funcao: 'Instituto: link de acesso' } })
  })

  it('e-mail já cadastrado é 409; sem provedor o cadastro vale mas avisa que o e-mail não saiu', async () => {
    estado.rpcResposta.instituto_cadastrar = { erro: 'Já existe cadastro com este e-mail.' }
    const r = await chamar(cadastro())
    expect(r.status).toBe(409); expect((await r.json()).erro).toContain('Já existe')
    estado.rpcResposta.instituto_cadastrar = { id: 'm2' }
    estado.tabelas.configuracoes = []
    const b = await (await chamar(cadastro())).json()
    expect(b).toMatchObject({ ok: true, enviado: false })
    expect(b.mensagem).toContain('não saiu agora')
  })

  it('entrar: resposta igual com ou sem cadastro (não revela quem existe); link enviado só quando a função SQL aceita', async () => {
    let b = await (await chamar(cadastro({ acao: 'entrar' }))).json()
    expect(b).toEqual({ ok: true, mensagem: 'Se houver cadastro com esse e-mail, enviamos um link de entrada.' })
    expect(envios[0]).toMatchObject({ to: 'joao@gmail.com', subject: 'Seu link de entrada no THEYE Institute' })
    estado.rpcResposta.instituto_novo_token = false
    b = await (await chamar(cadastro({ acao: 'entrar' }))).json()
    expect(b.ok).toBe(true)
    expect(envios).toHaveLength(1)
  })

  it('confirmar cria a sessão (guardada só como hash); link inválido é 400', async () => {
    const b = await (await chamar({ acao: 'confirmar', token: 'tok' })).json()
    expect(b).toMatchObject({ ok: true, id: 'm1', plano: 'gratis' })
    expect(b.sessao).toMatch(/^[0-9a-f]{64}$/)
    expect(rpc('instituto_confirmar')[0]).toEqual({ p_token_hash: await sha('tok'), p_sessao_hash: await sha(b.sessao) })
    estado.rpcResposta.instituto_confirmar = null
    expect((await chamar({ acao: 'confirmar', token: 'x' })).status).toBe(400)
  })

  it('estado, opções e consulta: sessão vencida 401, consulta grátis usada 402, erro da previsão 400, sucesso registra a consulta', async () => {
    expect(await (await chamar({ acao: 'estado', sessao: 's' })).json()).toMatchObject({ id: 'm1' })
    expect(await (await chamar({ acao: 'opcoes' })).json()).toEqual({ tribunais: ['TJRJ'] })
    const ok = await (await chamar({ acao: 'consultar', sessao: 's', tribunal: 'TJRJ', classe: 'Despejo', orgao: '', assunto: '9' })).json()
    expect(ok).toEqual({ ok: true, resultado: { probabilidade: 0.71 } })
    expect(rpc('instituto_prever')[0]).toEqual({ p_tribunal: 'TJRJ', p_classe: 'Despejo', p_orgao: null, p_assunto: 9 })
    expect(rpc('instituto_registrar_consulta_v2')[0]).toEqual({ p_membro: 'm1', p_gratuita: true, p_entrada: { tribunal: 'TJRJ', classe: 'Despejo', orgao: null, assunto: 9 }, p_resultado: { probabilidade: 0.71 } })
    // C25: dois pedidos simultâneos; o segundo encontra a consulta grátis já gravada e recebe 402.
    estado.rpcResposta.instituto_registrar_consulta_v2 = false
    expect((await chamar({ acao: 'consultar', sessao: 's', tribunal: 'TJRJ', classe: 'Despejo' })).status).toBe(402)
    estado.rpcResposta.instituto_prever = { erro: 'Sem amostra suficiente.' }
    expect((await chamar({ acao: 'consultar', sessao: 's' })).status).toBe(400)
    estado.rpcResposta.instituto_membro_por_sessao = { id: 'm1', plano: 'gratis', pode_consultar: false }
    expect((await chamar({ acao: 'consultar', sessao: 's' })).status).toBe(402)
    estado.rpcResposta.instituto_membro_por_sessao = null
    expect((await chamar({ acao: 'consultar', sessao: 's' })).status).toBe(401)
    expect((await chamar({ acao: 'estado', sessao: '' })).status).toBe(401)
  })
})
