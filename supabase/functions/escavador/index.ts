// Busca no Escavador (API paga do escritório): processos por número CNJ, por nome ou por CPF/CNPJ.
// O token fica em configuracoes.escavador_api_key; cada consulta entra no painel Consumo.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const BASE = 'https://api.escavador.com/api'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const servico = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

function usuarioAutenticado(req: Request): string | null {
  try {
    const parte = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').split('.')[1]
    if (!parte) return null
    const b64 = parte.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)))
    return payload?.role === 'authenticated' ? String(payload.sub) : null
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const usuario = usuarioAutenticado(req)
  if (!usuario) return json({ erro: 'Entre na plataforma para consultar o Escavador.' }, 401)
  const { termo = '', teste = false } = await req.json().catch(() => ({}))
  const { data } = await servico().from('configuracoes').select('valor').eq('chave', 'escavador_api_key').maybeSingle()
  const token = data?.valor
  if (!token) return json({ erro: 'Escavador ainda não ligado. Um administrador cola o token em Configurações → Escavador.' }, 503)
  const headers = { Authorization: `Bearer ${token}`, 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' }

  // Teste: consulta o saldo de créditos (não gasta crédito).
  if (teste) {
    const r = await fetch(`${BASE}/v1/quantidade-creditos`, { headers, signal: AbortSignal.timeout(20000) }).catch(() => null)
    if (!r?.ok) return json({ ok: false, erro: r?.status === 401 ? 'Token recusado pelo Escavador.' : `Escavador respondeu ${r?.status ?? 'sem resposta'}.` }, 502)
    return json({ ok: true, creditos: await r.json() })
  }

  const t = String(termo).trim()
  if (t.length < 3) return json({ erro: 'Escreva o número do processo, o nome ou o CPF/CNPJ.' }, 400)
  const digitos = t.replace(/\D/g, '')
  let url: string
  if (digitos.length === 20) {
    const cnj = `${digitos.slice(0, 7)}-${digitos.slice(7, 9)}.${digitos.slice(9, 13)}.${digitos.slice(13, 14)}.${digitos.slice(14, 16)}.${digitos.slice(16)}`
    url = `${BASE}/v2/processos/numero_cnj/${cnj}`
  } else if ((digitos.length === 11 || digitos.length === 14) && digitos.length >= t.replace(/[\s.\-/]/g, '').length) {
    url = `${BASE}/v2/envolvido/processos?cpf_cnpj=${digitos}`
  } else {
    url = `${BASE}/v2/envolvido/processos?nome=${encodeURIComponent(t)}`
  }
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(30000) }).catch(() => null)
  await servico().from('consumo_api').insert({ funcao: 'escavador', usuario_id: usuario, modelo: 'escavador-consulta', tokens_entrada: 0, tokens_saida: 0, quantidade: 1 })
  if (!r) return json({ erro: 'O Escavador não respondeu. Tente de novo.' }, 502)
  if (r.status === 401) return json({ erro: 'Token recusado pelo Escavador.' }, 502)
  if (r.status === 402) return json({ erro: 'Créditos do Escavador esgotados.' }, 502)
  if (r.status === 404) return json({ processos: [] })
  if (!r.ok) return json({ erro: `Escavador respondeu ${r.status}.` }, 502)
  const d = await r.json()
  const itens = Array.isArray(d.items) ? d.items : d.numero_cnj ? [d] : []
  const processos = itens.slice(0, 30).map((p: Record<string, any>) => ({
    numero: p.numero_cnj,
    titulo: [p.titulo_polo_ativo, p.titulo_polo_passivo].filter(Boolean).join(' x '),
    tribunal: p.unidade_origem?.tribunal_sigla ?? p.fontes?.[0]?.sigla ?? null,
    ultimaMovimentacao: p.data_ultima_movimentacao ?? null,
    classe: p.fontes?.[0]?.capa?.classe ?? null,
    link: p.numero_cnj ? `https://www.escavador.com/processos?q=${p.numero_cnj}` : null,
  }))
  return json({ processos, envolvido: d.envolvido_encontrado?.nome ?? null })
})
