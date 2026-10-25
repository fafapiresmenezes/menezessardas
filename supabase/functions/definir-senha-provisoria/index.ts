// Senha provisória definida por administrador (S10), pela API oficial de
// administração do Supabase Auth. Substitui a recuperação por e-mail, cujo
// redirecionamento depende de configuração externa: o administrador gera a
// senha, entrega à pessoa, e ela troca em Configurações → Senha.
// Deploy: supabase functions deploy definir-senha-provisoria

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const url = Deno.env.get('SUPABASE_URL')
    const anon = Deno.env.get('SUPABASE_ANON_KEY')
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !anon || !service) return json({ erro: 'Função sem credenciais de serviço.' }, 500)

    // Quem chama precisa ser administrador: a checagem usa o próprio token da pessoa.
    const auth = req.headers.get('Authorization') ?? ''
    const comoUsuario = createClient(url, anon, { global: { headers: { Authorization: auth } } })
    const { data: perfil, error: erroPerfil } = await comoUsuario.rpc('perfil_atual')
    if (erroPerfil || perfil !== 'admin') {
      return json({ erro: 'Apenas administradores podem definir senha provisória.' }, 403)
    }

    const { id, senha } = await req.json()
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return json({ erro: 'Pessoa inválida.' }, 400)
    if (typeof senha !== 'string' || senha.length < 8) return json({ erro: 'A senha provisória precisa ter pelo menos 8 caracteres.' }, 400)

    const admin = createClient(url, service)
    const { error } = await admin.auth.admin.updateUserById(id, { password: senha, email_confirm: true })
    if (error) return json({ erro: 'Não foi possível definir a senha: ' + error.message }, 502)

    return json({ ok: true })
  } catch (e) {
    return json({ erro: String(e) }, 500)
  }
})
