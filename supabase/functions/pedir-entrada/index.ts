// Instituto THEYE · Pedir entrada: o visitante que ainda NÃO é membro deixa um pedido na porta.
// Ninguém escreve direto no banco (a blindagem trancou isso): esta função confere, segura spam
// (campo-armadilha, tempo mínimo e limite por rede) e só então chama a função do banco que grava.
// Nada de senha, CPF ou prova de trabalho pesada: é um formulário de contato, não um cadastro.
import { createClient } from 'jsr:@supabase/supabase-js@2'
const db = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'public' } })
const ORIGENS = ['https://theye.club', 'https://www.theye.club', 'https://theye-club.vercel.app', 'https://instituto-theye.vercel.app']
const MOTIVOS = ['entrada', 'proposta', 'aviso', 'apoio']
const DESCARTAVEIS = ['mailinator.com', 'yopmail.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'temp-mail.org', 'trashmail.com', 'sharklasers.com', 'getnada.com', 'dispostable.com', 'maildrop.cc', 'throwawaymail.com', 'emailondeck.com', 'mohmal.com', 'tempmailo.com']

const cors = { 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('')
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
// Um e-mail válido, em minúsculas. Não normaliza "+apelido" nem pontos: aqui é contato, não
// identidade única, e a pessoa pode querer receber a resposta no endereço exato que digitou.
function emailValido(e: string): string | null {
  const v = String(e ?? '').trim().toLowerCase()
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(v) ? v : null
}

Deno.serve(async (req) => {
  const origem = req.headers.get('origin') ?? ''
  const permitida = ORIGENS.includes(origem) ? origem : ORIGENS[0]
  const r = await tratar(req)
  r.headers.set('Access-Control-Allow-Origin', permitida)
  return r
})

async function tratar(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ erro: 'Método não aceito.' }, 405)
  const b = await req.json().catch(() => ({}))
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()

  // Anti-robô leve: campo-armadilha vazio e tempo mínimo de 3 s na tela.
  if (b.site) return json({ ok: true, protocolo: 'PE-OK', criado_em: new Date().toISOString() })
  if (Number(b.ms) < 3000) return json({ erro: 'Preencha com calma e tente de novo.' }, 400)

  const nome = String(b.nome ?? '').trim()
  if (nome.length < 2) return json({ erro: 'Diga o seu nome.' }, 400)
  const email = emailValido(b.email)
  if (!email) return json({ erro: 'Informe um e-mail válido para a resposta.' }, 400)
  if (DESCARTAVEIS.includes(email.split('@')[1])) return json({ erro: 'Use um e-mail permanente, por favor.' }, 400)
  const motivo = MOTIVOS.includes(String(b.motivo)) ? String(b.motivo) : 'entrada'

  const rede = ip ? await hmac(await segredo('pimenta_cpf'), `ip:${ip}`) : null

  const { data, error } = await db().rpc('pedir_entrada_gravar', {
    p_nome: nome,
    p_escritorio: b.escritorio ? String(b.escritorio) : null,
    p_email: email,
    p_telefone: b.telefone ? String(b.telefone) : null,
    p_motivo: motivo,
    p_frente: b.frente ? String(b.frente) : null,
    p_mensagem: b.mensagem ? String(b.mensagem) : null,
    p_rede: rede,
  })
  if (error) return json({ erro: 'Não deu para registrar agora. Tente de novo em instantes.' }, 500)
  if (data?.erro === 'limite') return json({ erro: 'Já recebemos vários pedidos desta rede hoje. Tente amanhã ou fale por outro caminho.' }, 429)
  return json({ ok: true, protocolo: data?.protocolo, criado_em: data?.criado_em })
}
