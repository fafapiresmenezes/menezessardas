// Acesso por e-mail próprio (M, 19/11/2026): criar conta e trocar a senha sem depender do envio
// embutido do Supabase, que só manda poucos e-mails por hora e travava a entrada dos clientes.
// A função cria o link de uso único no próprio Supabase e manda o e-mail pelo serviço de envio da casa.
// O link abre direto o theye.club, que confere o código. Nenhuma senha é guardada aqui.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SITE = 'https://theye.club'
const ORIGENS = ['https://theye.club', 'https://www.theye.club']
const POR_EMAIL_HORA = 5
const TOTAL_HORA = 300
const cors = { 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const db = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('')
const sha = async (t: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))

export const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254

export function corpoDoEmail(tipo: 'senha' | 'conta', link: string): { assunto: string; html: string } {
  const titulo = tipo === 'senha' ? 'Criar uma senha nova' : 'Confirmar o seu e-mail'
  const texto = tipo === 'senha'
    ? 'Recebemos um pedido para criar uma senha nova na plataforma do Instituto THEYE. Toque no botão abaixo e escolha a sua senha.'
    : 'Falta um passo para a sua conta na plataforma do Instituto THEYE: toque no botão abaixo para confirmar que este e-mail é seu.'
  const botao = tipo === 'senha' ? 'Criar a senha nova' : 'Confirmar e entrar'
  const html = `<div style="font-family:Georgia,serif;max-width:520px;color:#151a22"><p style="font-family:monospace;font-size:11px;letter-spacing:.1em;color:#6b7280">INSTITUTO THEYE</p>
<h2 style="font-weight:500">${titulo}</h2>
<p style="font-family:Arial,sans-serif;font-size:15px;color:#3a4250">${texto} O link vale por 1 hora e só funciona uma vez.</p>
<p><a href="${link}" style="display:inline-block;background:#151a22;color:#fff;padding:12px 20px;text-decoration:none;font-family:Arial,sans-serif">${botao}</a></p>
<p style="font-family:Arial,sans-serif;font-size:12px;color:#7a8190">Se o botão não abrir, copie este endereço e cole no navegador:<br>${link}</p>
<p style="font-family:Arial,sans-serif;font-size:12px;color:#7a8190">Se você não pediu isto, ignore esta mensagem.</p></div>`
  return { assunto: tipo === 'senha' ? 'Sua senha nova na plataforma THEYE' : 'Confirme a sua conta na plataforma THEYE', html }
}

async function enviar(email: string, tipo: 'senha' | 'conta', link: string): Promise<boolean> {
  const { data: conf } = await db().from('configuracoes').select('chave,valor').in('chave', ['brevo_api_key', 'email_remetente'])
  const c = Object.fromEntries((conf ?? []).map((x: { chave: string; valor: string }) => [x.chave, x.valor]))
  if (!c.brevo_api_key || !c.email_remetente) return false
  const { assunto, html } = corpoDoEmail(tipo, link)
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST', headers: { 'api-key': c.brevo_api_key, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: { name: 'Instituto THEYE', email: c.email_remetente }, to: [{ email }], subject: assunto, htmlContent: html }),
  }).catch(() => null)
  return !!r?.ok
}

// Moldura comum dos avisos da casa (mesma cara dos e-mails de senha e conta).
export function corpoDoAviso(titulo: string, texto: string, link?: { url: string; rotulo: string }): string {
  const botao = link ? `<p><a href="${link.url}" style="display:inline-block;background:#151a22;color:#fff;padding:12px 20px;text-decoration:none;font-family:Arial,sans-serif">${link.rotulo}</a></p>
<p style="font-family:Arial,sans-serif;font-size:12px;color:#7a8190">Se o botão não abrir, copie este endereço e cole no navegador:<br>${link.url}</p>` : ''
  return `<div style="font-family:Georgia,serif;max-width:520px;color:#151a22"><p style="font-family:monospace;font-size:11px;letter-spacing:.1em;color:#6b7280">INSTITUTO THEYE</p>
<h2 style="font-weight:500">${titulo}</h2>
<p style="font-family:Arial,sans-serif;font-size:15px;color:#3a4250">${texto}</p>
${botao}</div>`
}

async function enviarAviso(email: string, assunto: string, html: string): Promise<boolean> {
  const { data: conf } = await db().from('configuracoes').select('chave,valor').in('chave', ['brevo_api_key', 'email_remetente'])
  const c = Object.fromEntries((conf ?? []).map((x: { chave: string; valor: string }) => [x.chave, x.valor]))
  if (!c.brevo_api_key || !c.email_remetente) return false
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST', headers: { 'api-key': c.brevo_api_key, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: { name: 'Instituto THEYE', email: c.email_remetente }, to: [{ email }], subject: assunto, htmlContent: html }),
  }).catch(() => null)
  return !!r?.ok
}

// Freio simples: poucos pedidos por e-mail e um teto geral por hora. O e-mail é guardado só como resumo irreversível.
async function dentroDoLimite(email: string): Promise<boolean> {
  const marca = (await sha('acesso:' + email)).slice(0, 32)
  const desde = new Date(Date.now() - 3600_000).toISOString()
  const base = () => db().from('consumo_api').select('id', { count: 'exact', head: true }).eq('funcao', 'Acesso: e-mail').gte('criado_em', desde)
  const [{ count: doEmail }, { count: total }] = await Promise.all([base().eq('modelo', marca), base()])
  if ((doEmail ?? 0) >= POR_EMAIL_HORA || (total ?? 0) >= TOTAL_HORA) return false
  await db().from('consumo_api').insert({ funcao: 'Acesso: e-mail', modelo: marca, quantidade: 1 })
  return true
}

Deno.serve(async (req) => {
  const origem = req.headers.get('origin') ?? ''
  const permitida = ORIGENS.includes(origem) ? origem : SITE
  const r = await tratar(req, ORIGENS.includes(origem))
  r.headers.set('Access-Control-Allow-Origin', permitida)
  return r
})

async function tratar(req: Request, origemBoa: boolean): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST' || !origemBoa) return json({ erro: 'Pedido não aceito.' }, 403)
  const b = await req.json().catch(() => ({}))
  const acao = String(b.acao ?? '')
  const email = String(b.email ?? '').trim().toLowerCase()
  if (!emailValido(email)) return json({ erro: 'Informe um e-mail válido.' }, 400)
  if (b.site) return json({ ok: true }) // armadilha de robô: finge que deu certo

  if (acao === 'recuperar') {
    // A resposta é sempre a mesma, exista a conta ou não.
    if (await dentroDoLimite(email)) {
      const { data } = await db().auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo: `${SITE}/?redefinir=1` } })
      const codigo = data?.properties?.hashed_token
      if (codigo) await enviar(email, 'senha', `${SITE}/?redefinir=1&th=${encodeURIComponent(codigo)}`)
    }
    return json({ ok: true })
  }

  if (acao === 'cadastrar') {
    const senha = String(b.senha ?? '')
    const escritorio = String(b.escritorio ?? '').toUpperCase().replace(/\s+/g, ' ').trim().slice(0, 120)
    if (senha.length < 12 || senha.length > 200 || !/[a-z]/.test(senha) || !/[A-Z]/.test(senha) || !/[0-9]/.test(senha)) return json({ erro: 'A senha precisa ter pelo menos 12 caracteres, com letra maiúscula, letra minúscula e número.' }, 400)
    if (escritorio.length < 3) return json({ erro: 'Escolha o seu escritório.' }, 400)
    if (!(await dentroDoLimite(email))) return json({ erro: 'Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de novo.' }, 429)
    const { data, error } = await db().auth.admin.generateLink({ type: 'signup', email, password: senha, options: { data: { escritorio }, redirectTo: SITE } })
    if (error) {
      const m = String(error.message ?? '')
      if (/already|registered|exists/i.test(m)) {
        // Conta que já existe: não revela nada; manda o link de senha nova, que é o que a pessoa precisa.
        const { data: rec } = await db().auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo: `${SITE}/?redefinir=1` } })
        const cod = rec?.properties?.hashed_token
        if (cod) await enviar(email, 'senha', `${SITE}/?redefinir=1&th=${encodeURIComponent(cod)}`)
        return json({ ok: true })
      }
      // A recusa da porta do banco chega aqui como "Database error saving new user": é a única regra do banco que barra conta nova.
      if (/Cadastro fechado|Database error/i.test(m)) return json({ erro: 'O cadastro está fechado. Para solicitar acesso, preencha o formulário em theye.club/pedir-entrada ou aguarde um convite do administrador.' }, 403)
      return json({ erro: 'Não foi possível criar a conta agora. Tente de novo em instantes.' }, 400)
    }
    const codigo = data?.properties?.hashed_token
    const enviado = codigo ? await enviar(email, 'conta', `${SITE}/?confirmar=1&th=${encodeURIComponent(codigo)}`) : false
    return json({ ok: true, enviado })
  }

  if (acao === 'avisar-pendente') {
    // Pedido de M (21/11/2026): quem termina o cadastro recebe um e-mail dizendo que a conta
    // aguarda a liberação do administrador, e o administrador recebe um e-mail com o link da
    // tela Equipe para liberar. Quem chama é a própria pessoa logada: tudo sai do token dela,
    // nunca do corpo do pedido — ninguém dispara aviso em nome de outra pessoa.
    const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: u } = await db().auth.getUser(jwt)
    const usuario = u?.user
    if (!usuario?.email) return json({ erro: 'Entre na sua conta primeiro.' }, 401)
    const [{ data: pend }, { data: perfil }] = await Promise.all([
      db().from('pedidos_entrada').select('escritorio_id, nome').eq('usuario_id', usuario.id).is('decidido_em', null).maybeSingle(),
      db().from('usuarios_perfis').select('id').eq('id', usuario.id).maybeSingle(),
    ])
    if (!pend || perfil) return json({ ok: true }) // nada pendente: nenhum aviso, nenhuma pista
    // Um aviso por pessoa por dia, para ninguém encher a caixa do administrador.
    const marca = (await sha('pendente:' + usuario.id)).slice(0, 32)
    const desde = new Date(Date.now() - 86400_000).toISOString()
    const { count } = await db().from('consumo_api').select('id', { count: 'exact', head: true }).eq('funcao', 'Aviso: pendente').eq('modelo', marca).gte('criado_em', desde)
    if ((count ?? 0) > 0) return json({ ok: true })
    await db().from('consumo_api').insert({ funcao: 'Aviso: pendente', modelo: marca, quantidade: 1 })
    let nomeEsc = ''
    if (pend.escritorio_id) {
      const { data: esc } = await db().from('escritorios').select('nome_exibicao, nome').eq('id', pend.escritorio_id).maybeSingle()
      nomeEsc = String(esc?.nome_exibicao || esc?.nome || '')
    }
    // O nome foi digitado pela própria pessoa: entra no e-mail sem virar HTML.
    const semHtml = (t: string) => t.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] ?? c))
    nomeEsc = semHtml(nomeEsc)
    const quem = semHtml(String(pend.nome || usuario.email).slice(0, 120))
    await enviarAviso(usuario.email, 'Sua conta aguarda a liberação do administrador',
      corpoDoAviso('Falta só a liberação do administrador',
        `O seu cadastro${nomeEsc ? ` no escritório ${nomeEsc}` : ''} foi recebido. Por segurança, ninguém entra na plataforma sem a liberação do administrador. Você será avisado assim que a sua conta for liberada; não precisa fazer mais nada.`))
    const { data: confA } = await db().from('configuracoes').select('valor').eq('chave', 'email_aviso_admin').maybeSingle()
    const adm = String(confA?.valor || 'mateusmenezesfigueiredo6@gmail.com')
    await enviarAviso(adm, `Pedido de entrada aguardando você: ${quem}`,
      corpoDoAviso('Alguém pediu para entrar na plataforma',
        `${quem} (${semHtml(usuario.email)})${nomeEsc ? `, do escritório ${nomeEsc},` : ''} terminou o cadastro e está aguardando a sua liberação. Toque no botão para abrir a tela Equipe e decidir.`,
        { url: `${SITE}/#/equipe`, rotulo: 'Abrir a tela Equipe e liberar' }))
    return json({ ok: true })
  }

  return json({ erro: 'Ação desconhecida.' }, 400)
}
