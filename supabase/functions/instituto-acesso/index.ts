// Instituto THEYE, Passos 15 e 16: cadastro com 1 consulta grátis por pessoa, depois só membros.
// Separado dos logins do escritório. CPF vira HMAC irreversível; e-mail confirmado por link;
// anti-robô: prova de trabalho no navegador + campo armadilha + tempo mínimo + limite por rede.
import { createClient } from 'jsr:@supabase/supabase-js@2'
const db = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'public' } })
const SITE = 'https://instituto-theye.vercel.app'
const ACEITE = 'termos-lab-v1-2026-10-31'
const BITS = 16 // prova de trabalho: 4 zeros hexadecimais
const DESCARTAVEIS = ['mailinator.com', 'yopmail.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'temp-mail.org', 'trashmail.com', 'sharklasers.com', 'getnada.com', 'dispostable.com', 'maildrop.cc', 'throwawaymail.com', 'emailondeck.com', 'mohmal.com', 'tempmailo.com']

const cors = { 'Access-Control-Allow-Origin': SITE, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('')
const sha = async (t: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))
const aleatorio = () => hex(crypto.getRandomValues(new Uint8Array(32)).buffer)
async function hmac(chave: string, t: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(chave), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(t)))
}
let cacheSegredos: Record<string, string> | null = null
async function segredo(nome: string) {
  if (!cacheSegredos) {
    const { data } = await db().rpc('instituto_segredos_servico')
    cacheSegredos = data ?? {}
  }
  return cacheSegredos![nome]
}
function cpfValido(c: string) {
  const d = c.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const dv = (n: number) => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r }
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10])
}
// Um e-mail por pessoa: tira o "+apelido" e, no Gmail, os pontos.
function normalizarEmail(e: string) {
  const [u0, dom0] = String(e).trim().toLowerCase().split('@')
  if (!u0 || !dom0) return null
  const dom = dom0 === 'googlemail.com' ? 'gmail.com' : dom0
  let u = u0.split('+')[0]
  if (dom === 'gmail.com') u = u.replace(/\./g, '')
  return /^[a-z0-9._%-]+$/.test(u) && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(dom) ? `${u}@${dom}` : null
}
async function enviarLink(email: string, token: string, primeiro: boolean) {
  const { data: conf } = await db().from('configuracoes').select('chave,valor').in('chave', ['brevo_api_key', 'email_remetente'])
  const c = Object.fromEntries((conf ?? []).map((x: { chave: string; valor: string }) => [x.chave, x.valor]))
  if (!c.brevo_api_key || !c.email_remetente) return false
  const link = `${SITE}/laboratorio.html#t=${token}`
  const html = `<div style="font-family:Georgia,serif;max-width:520px;color:#151a22"><p style="font-family:monospace;font-size:11px;letter-spacing:.1em;color:#9a7a3c">INSTITUTO THEYE</p>
<h2 style="font-weight:500">${primeiro ? 'Confirme seu e-mail' : 'Seu link de entrada'}</h2>
<p style="font-family:Arial,sans-serif;font-size:15px;color:#3a4250">${primeiro ? 'Falta um passo para liberar sua consulta gratuita ao laboratório de predição jurídica.' : 'Use o botão abaixo para entrar no laboratório.'} O link vale por 24 horas.</p>
<p><a href="${link}" style="display:inline-block;background:#151a22;color:#fff;padding:12px 20px;text-decoration:none;font-family:Arial,sans-serif">Entrar no laboratório</a></p>
<p style="font-family:Arial,sans-serif;font-size:12px;color:#7a8190">Se você não pediu isto, ignore esta mensagem. Desenvolvido pelo Instituto THEYE.</p></div>`
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST', headers: { 'api-key': c.brevo_api_key, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: { name: 'Instituto THEYE', email: c.email_remetente }, to: [{ email }], subject: primeiro ? 'Confirme seu cadastro no Instituto THEYE' : 'Seu link de entrada no Instituto THEYE', htmlContent: html }),
  }).catch(() => null)
  if (r?.ok) await db().from('consumo_api').insert({ funcao: 'Instituto: link de acesso', modelo: 'brevo-email', quantidade: 1 })
  return !!r?.ok
}
async function membroPorSessao(sessao: string) {
  if (!sessao) return null
  const { data } = await db().rpc('instituto_membro_por_sessao', { p_hash: await sha(sessao) })
  return data && data.id ? data : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const b = await req.json().catch(() => ({}))
  const acao = String(b.acao ?? '')
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()

  if (acao === 'desafio') {
    const sal = aleatorio(), emitido = Date.now()
    return json({ sal, emitido, bits: BITS, assinatura: await hmac(await segredo('assinatura_desafio'), `${sal}|${emitido}`) })
  }

  if (acao === 'cadastrar' || acao === 'entrar') {
    const email = normalizarEmail(b.email)
    if (!email) return json({ erro: 'Informe um e-mail válido.' }, 400)
    if (DESCARTAVEIS.includes(email.split('@')[1])) return json({ erro: 'E-mails temporários não são aceitos.' }, 400)
    // Anti-robô: armadilha vazia, tempo mínimo de 3 s e prova de trabalho assinada pelo servidor e com menos de 10 min.
    const p = b.prova ?? {}
    const okAssin = p.sal && p.assinatura === await hmac(await segredo('assinatura_desafio'), `${p.sal}|${p.emitido}`)
    const okTempo = Date.now() - Number(p.emitido) < 600000 && Number(b.ms) >= 3000
    const okPow = (await sha(`${p.sal}:${p.nonce}`)).startsWith('0'.repeat(BITS / 4))
    if (b.site || !okAssin || !okTempo || !okPow) return json({ erro: 'Não conseguimos confirmar que você é uma pessoa. Recarregue a página e tente de novo.' }, 400)
    const rede = ip ? await hmac(await segredo('pimenta_cpf'), `ip:${ip}`) : null
    // Cada desafio vale uma vez só; e cada rede tem limite diário de tentativas.
    const { data: lim } = await db().rpc('instituto_registrar_tentativa', { p_rede: rede, p_sal: String(p.sal) })
    if (lim === 'reuso') return json({ erro: 'Esta verificação já foi usada. Recarregue a página e tente de novo.' }, 400)
    if (lim === 'limite') return json({ erro: 'Muitas tentativas desta rede hoje. Tente amanhã.' }, 429)
    const token = aleatorio()
    if (acao === 'entrar') {
      const { data: ok } = await db().rpc('instituto_novo_token', { p_email: email, p_token_hash: await sha(token) })
      if (ok) await enviarLink(email, token, false)
      return json({ ok: true, mensagem: 'Se houver cadastro com esse e-mail, enviamos um link de entrada.' })
    }
    if (!b.aceite) return json({ erro: 'É preciso aceitar os termos e a política de privacidade.' }, 400)
    if (!cpfValido(String(b.cpf ?? ''))) return json({ erro: 'CPF inválido.' }, 400)
    const cpfHmac = await hmac(await segredo('pimenta_cpf'), String(b.cpf).replace(/\D/g, ''))
    const { data: r } = await db().rpc('instituto_cadastrar', { p_email: email, p_cpf_hmac: cpfHmac, p_aceite: ACEITE, p_token_hash: await sha(token), p_rede: rede })
    if (r?.erro) return json({ erro: r.erro }, 409)
    const enviado = await enviarLink(email, token, true)
    return json({ ok: true, enviado, mensagem: enviado ? `Enviamos um link de confirmação para ${email}. Ele vale por 24 horas.` : 'Cadastro feito, mas o e-mail não saiu agora. Use "Já tenho cadastro" daqui a pouco.' })
  }

  if (acao === 'confirmar') {
    const sessao = aleatorio()
    const { data } = await db().rpc('instituto_confirmar', { p_token_hash: await sha(String(b.token ?? '')), p_sessao_hash: await sha(sessao) })
    if (!data?.id) return json({ erro: 'Link inválido ou vencido. Peça um novo em "Já tenho cadastro".' }, 400)
    return json({ ok: true, sessao, ...data })
  }

  if (acao === 'estado') {
    const m = await membroPorSessao(String(b.sessao ?? ''))
    return m ? json(m) : json({ erro: 'Sessão vencida. Entre de novo.' }, 401)
  }

  if (acao === 'opcoes') {
    const { data } = await db().rpc('instituto_opcoes')
    return json(data ?? {})
  }

  if (acao === 'consultar') {
    const m = await membroPorSessao(String(b.sessao ?? ''))
    if (!m) return json({ erro: 'Sessão vencida. Entre de novo.' }, 401)
    if (!m.pode_consultar) return json({ erro: 'Sua consulta gratuita já foi usada. Para continuar, torne-se membro.', membro: false }, 402)
    const entrada = { tribunal: String(b.tribunal ?? ''), classe: String(b.classe ?? ''), orgao: b.orgao ? String(b.orgao) : null, assunto: b.assunto ? Number(b.assunto) : null }
    const { data: res } = await db().rpc('instituto_prever', { p_tribunal: entrada.tribunal, p_classe: entrada.classe, p_orgao: entrada.orgao, p_assunto: entrada.assunto })
    if (!res || res.erro) return json({ erro: res?.erro ?? 'Não foi possível calcular agora.' }, 400)
    await db().rpc('instituto_registrar_consulta', { p_membro: m.id, p_gratuita: m.plano !== 'membro', p_entrada: entrada, p_resultado: res })
    return json({ ok: true, resultado: res })
  }

  return json({ erro: 'Ação desconhecida.' }, 400)
})
