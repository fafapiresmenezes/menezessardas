// Tranca do Stokasticos (pedido de M, 13/11/2026). Duas ações, nenhuma delas exige login na plataforma:
//   acao: 'pedir'  → guarda o pedido (e-mail + motivação) e avisa quem administra por e-mail.
//   acao: 'entrar' → confere a senha NO SERVIDOR e, se bate, devolve o acervo.
// A senha e o endereço de quem administra ficam na tabela configuracoes, nunca no repositório:
//   configuracoes.stokasticos_senha        senha única de entrada
//   configuracoes.stokasticos_email_admin  endereço que recebe os pedidos
// Enquanto a senha estiver vazia, ninguém entra — a função recusa toda tentativa.
// Deploy: supabase functions deploy stokasticos-acesso --no-verify-jwt
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

function servico() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

async function config(chave: string): Promise<string> {
  const { data } = await servico().from('configuracoes').select('valor').eq('chave', chave).maybeSingle()
  return (data?.valor ?? '').trim()
}

const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)

/** Compara em tempo constante, para a resposta não vazar o tamanho nem o prefixo da senha. */
function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diferenca = 0
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diferenca === 0
}

async function avisarAdmin(email: string, motivacao: string): Promise<boolean> {
  const chave = Deno.env.get('RESEND_API_KEY')
  const destino = await config('stokasticos_email_admin')
  if (!chave || !destino) {
    console.error('aviso de pedido não enviado: falta RESEND_API_KEY ou stokasticos_email_admin')
    return false
  }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Stokasticos <onboarding@resend.dev>',
        to: [destino],
        subject: 'Stokasticos: pedido de acesso',
        text: `Pedido novo de acesso ao Stokasticos.\n\nE-mail: ${email}\n\nMotivação:\n${motivacao}\n\nPara liberar, passe a senha a esta pessoa.`,
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!r.ok) console.error('resend recusou', r.status, (await r.text()).slice(0, 200))
    return r.ok
  } catch (e) {
    console.error('resend falhou', e)
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const corpo = await req.json().catch(() => ({}))
  const acao = String(corpo.acao ?? '')

  if (acao === 'pedir') {
    const email = String(corpo.email ?? '').trim().toLowerCase()
    const motivacao = String(corpo.motivacao ?? '').trim()
    if (!emailValido(email)) return json({ erro: 'Escreva um e-mail válido.' }, 400)
    if (motivacao.length < 20) return json({ erro: 'Conte em algumas linhas por que quer entrar.' }, 400)
    if (motivacao.length > 4000) return json({ erro: 'Motivação longa demais.' }, 400)

    const { error } = await servico().from('stokasticos_pedidos').insert({ email, motivacao })
    if (error) {
      console.error('pedido não gravado', error)
      return json({ erro: 'Não foi possível registrar o pedido agora.' }, 500)
    }
    const avisado = await avisarAdmin(email, motivacao)
    // O pedido ficou guardado mesmo se o e-mail falhar: quem administra vê na lista.
    return json({ ok: true, avisado })
  }

  if (acao === 'entrar') {
    const senha = String(corpo.senha ?? '')
    const esperada = await config('stokasticos_senha')
    // Sem senha definida, a porta fica fechada para todos.
    if (!esperada) return json({ erro: 'A entrada ainda não foi aberta.' }, 403)
    if (!iguais(senha, esperada)) return json({ erro: 'Senha não confere.' }, 401)

    const { data, error } = await servico().from('configuracoes').select('valor').eq('chave', 'stokasticos_acervo').maybeSingle()
    if (error) console.error('acervo não lido', error)
    let acervo: unknown = null
    try { acervo = data?.valor ? JSON.parse(data.valor) : null } catch { acervo = null }
    return json({ ok: true, acervo })
  }

  return json({ erro: 'Ação inválida.' }, 400)
})
