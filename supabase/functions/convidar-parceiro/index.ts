// Passo 36 (Onda D): convite de escritório parceiro por e-mail e aceite com primeiro acesso guiado.
// Modos: { convidar: { nome_escritorio, email, funcao } } (admin da sede; envia e-mail pelo Brevo com link de aceite)
//        { aceitar: { token, nome, senha } } (público: cria o usuário no Auth, o escritório e o perfil, marca o convite)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const APP = 'https://gmenezes-advogados.vercel.app/#'
const esc = (s: string) => s.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string))

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const db = createClient(url, service)
    const corpo = await req.json().catch(() => ({}))

    if (corpo.convidar) {
      const auth = req.headers.get('Authorization') ?? ''
      const comoUsuario = createClient(url, anon, { global: { headers: { Authorization: auth } } })
      const [{ data: perfil }, { data: sede }] = await Promise.all([comoUsuario.rpc('perfil_atual'), comoUsuario.rpc('eh_sede')])
      if (perfil !== 'admin' || sede !== true) return json({ erro: 'Apenas a administração da sede convida escritórios parceiros.' }, 403)
      const { nome_escritorio, email, funcao } = corpo.convidar as { nome_escritorio: string; email: string; funcao: string }
      if (!nome_escritorio || nome_escritorio.trim().length < 3) return json({ erro: 'Informe o nome do escritório.' }, 400)
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email ?? '')) return json({ erro: 'E-mail inválido.' }, 400)
      if (!['operador', 'leitor'].includes(funcao)) return json({ erro: 'Função inválida (operador ou leitor).' }, 400)
      const { data: quem } = await comoUsuario.auth.getUser()
      const { data: conv, error } = await db.from('convites_escritorio').insert({ nome_escritorio: nome_escritorio.trim(), email: email.trim().toLowerCase(), funcao, criado_por: quem?.user?.id ?? null }).select('id,token,expira_em').single()
      if (error) return json({ erro: error.message }, 500)
      const link = `${APP}/convite/${conv.token}`
      const { data: cfg } = await db.from('configuracoes').select('chave,valor').in('chave', ['brevo_api_key', 'email_remetente'])
      const conf = Object.fromEntries((cfg ?? []).map(x => [x.chave, x.valor]))
      let enviado = false, detalhe: string | undefined
      if (conf.brevo_api_key && conf.email_remetente) {
        const html = `<div style="font-family:Georgia,serif;max-width:620px;margin:auto"><div style="background:#14213d;color:#fff;padding:18px"><h2 style="margin:0">Convite: ${esc(nome_escritorio)}</h2></div>
<div style="padding:16px;line-height:1.5"><p>O escritório GMenezes Advogados Associados convidou <b>${esc(nome_escritorio)}</b> para gerir os próprios casos, prazos, honorários e portal do cliente na plataforma, em área separada e com acesso só às suas informações.</p>
<p>Seu acesso será de <b>${funcao === 'leitor' ? 'leitor' : 'operador'}</b>. Para aceitar, escolha seu nome e uma senha pelo link abaixo (vale 14 dias):</p>
<p><a href="${link}" style="background:#14213d;color:#fff;padding:10px 16px;text-decoration:none">Aceitar o convite</a></p><p style="font-size:12px;color:#555">Ou copie: ${link}</p>
<p style="font-size:12px;color:#555">Preço de referência (Value Pas): R$ 390 por operador e R$ 120 por leitor ao mês, 30% de desconto no primeiro ano.</p></div>
<p style="font-size:11px;color:#888;padding:10px">GMenezes Advogados Associados · plataforma desenvolvida pelo Instituto THEYE</p></div>`
        const resp = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': conf.brevo_api_key, 'Content-Type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ sender: { name: 'Avisos GMenezes', email: conf.email_remetente }, to: [{ email: email.trim() }], subject: `Convite para ${nome_escritorio} na plataforma GMenezes`, htmlContent: html }) })
        enviado = resp.ok; if (!resp.ok) detalhe = `${resp.status} ${await resp.text()}`
        if (enviado) await db.from('consumo_api').insert({ funcao: 'convite de escritório parceiro', modelo: 'brevo-email', quantidade: 1 })
      } else detalhe = 'provedor de e-mail não configurado'
      return json({ ok: true, id: conv.id, link, expira_em: conv.expira_em, enviado, detalhe })
    }

    if (corpo.aceitar) {
      const { token, nome, senha } = corpo.aceitar as { token: string; nome: string; senha: string }
      if (!token || typeof senha !== 'string' || senha.length < 8) return json({ erro: 'A senha precisa ter pelo menos 8 caracteres.' }, 400)
      const { data: conv } = await db.from('convites_escritorio').select('id,email,aceito_em,expira_em').eq('token', token).maybeSingle()
      if (!conv) return json({ erro: 'Convite não encontrado.' }, 404)
      if (conv.aceito_em) return json({ erro: 'Este convite já foi usado. Entre com seu e-mail e senha.' }, 400)
      if (new Date(conv.expira_em) < new Date()) return json({ erro: 'Este convite expirou (vale 14 dias). Peça um novo à sede.' }, 400)
      const { data: criado, error: e1 } = await db.auth.admin.createUser({ email: conv.email, password: senha, email_confirm: true, user_metadata: { nome } })
      // Segurança: se o e-mail já tem conta, o convite não troca a senha nem move a pessoa; a sede faz isso pela lista de pessoas.
      if (e1) return json({ erro: 'Este e-mail já tem conta na plataforma. Entre com sua senha e peça à sede para colocá-lo no escritório parceiro.' }, 400)
      const usuarioId = criado.user.id
      const { data: escId, error: e2 } = await db.rpc('aceitar_convite_parceiro', { p_token: token, p_usuario: usuarioId, p_nome: nome })
      if (e2) return json({ erro: e2.message }, 400)
      return json({ ok: true, escritorio_id: escId, email: conv.email })
    }
    return json({ erro: 'Pedido inválido.' }, 400)
  } catch (e) { return json({ erro: String(e) }, 500) }
})
