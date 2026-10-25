// Função no servidor: lê o contrato e devolve análise jurídica assistida.
// A chave da Anthropic vem da tabela `configuracoes` (gravada pelo administrador
// em Configurações → Inteligência artificial) ou, se existir, do segredo
// ANTHROPIC_API_KEY. Nunca vai ao navegador nem aos logs.
// Deploy: supabase functions deploy analisar-contrato
//
// Limite de custo por clique: modelo econômico e max_tokens baixo.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MODELO = 'claude-haiku-5-5'
const MAX_TOKENS = 1200

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SISTEMA = `Você é assistente jurídico de um escritório de advocacia brasileiro, especializado em
contratos imobiliários (Lei 8.245/91 e Código Civil). Analise o contrato recebido e responda em
português do Brasil, de forma objetiva, SEM inventar cláusulas que não estejam no texto. Quando algo
não constar, diga "não consta". Você não substitui a revisão de um advogado inscrito na OAB.`

interface Saida {
  resumo: string
  clausulasRisco: { titulo: string; gravidade: 'alta' | 'media' | 'baixa'; observacao: string }[]
  prazos: { descricao: string; data?: string }[]
  sugestoes: string[]
}

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// O gateway já validou a assinatura (verify_jwt). Aqui só exigimos usuário logado,
// para que a chave pública (anon) não consiga gastar créditos da IA.
function usuarioLogado(req: Request): boolean {
  try {
    const auth = req.headers.get('Authorization') ?? ''
    const token = auth.replace(/^Bearer\s+/i, '')
    const parte = token.split('.')[1]
    if (!parte) return false
    const b64 = parte.replace(/-/g, '+').replace(/_/g, '/')
    const preenchido = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const payload = JSON.parse(atob(preenchido))
    return payload?.role === 'authenticated'
  } catch {
    return false
  }
}

async function obterChave(): Promise<string | null> {
  const doAmbiente = Deno.env.get('ANTHROPIC_API_KEY')
  if (doAmbiente) return doAmbiente
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) return null
  const sb = createClient(url, serviceKey)
  const { data } = await sb.from('configuracoes').select('valor').eq('chave', 'anthropic_api_key').maybeSingle()
  return data?.valor ?? null
}

function erroAnthropic(status: number, detalhe: string): Response {
  if (status === 401 || status === 403) {
    return json({ erro: 'Chave recusada pela Anthropic (inválida, revogada ou sem saldo).' }, 502)
  }
  if (status === 429) {
    return json({ erro: 'Limite de uso da Anthropic atingido; tente novamente em instantes.' }, 502)
  }
  return json({ erro: 'Falha na API da Anthropic.', detalhe: detalhe.slice(0, 300) }, 502)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    if (!usuarioLogado(req)) {
      return json({ erro: 'Faça login para usar a análise por IA.' }, 401)
    }

    const chave = await obterChave()
    if (!chave) {
      return json(
        { erro: 'Chave da IA não configurada. Um administrador pode informá-la em Configurações → Inteligência artificial.' },
        503
      )
    }

    const { texto, contratoId, teste } = await req.json()

    const cabecalhos = {
      'x-api-key': chave,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    }

    // Modo teste: confirma que a chave funciona gastando o mínimo possível.
    if (teste === true) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: cabecalhos,
        body: JSON.stringify({
          model: MODELO,
          max_tokens: 8,
          messages: [{ role: 'user', content: 'Responda apenas OK.' }],
        }),
      })
      if (!r.ok) return erroAnthropic(r.status, await r.text())
      return json({ ok: true, modelo: MODELO })
    }

    if (!texto || typeof texto !== 'string') {
      return json({ erro: 'Envie o texto do contrato em "texto".' }, 400)
    }

    const ferramenta = {
      name: 'registrar_analise',
      description: 'Registra a análise estruturada do contrato.',
      input_schema: {
        type: 'object',
        properties: {
          resumo: { type: 'string' },
          clausulasRisco: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                titulo: { type: 'string' },
                gravidade: { type: 'string', enum: ['alta', 'media', 'baixa'] },
                observacao: { type: 'string' },
              },
              required: ['titulo', 'gravidade', 'observacao'],
            },
          },
          prazos: {
            type: 'array',
            items: {
              type: 'object',
              properties: { descricao: { type: 'string' }, data: { type: 'string' } },
              required: ['descricao'],
            },
          },
          sugestoes: { type: 'array', items: { type: 'string' } },
        },
        required: ['resumo', 'clausulasRisco', 'prazos', 'sugestoes'],
      },
    }

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: cabecalhos,
      body: JSON.stringify({
        model: MODELO,
        max_tokens: MAX_TOKENS,
        system: SISTEMA,
        tools: [ferramenta],
        tool_choice: { type: 'tool', name: 'registrar_analise' },
        messages: [{ role: 'user', content: `Contrato para análise:\n\n${texto.slice(0, 40000)}` }],
      }),
    })

    if (!resp.ok) return erroAnthropic(resp.status, await resp.text())

    const dados = await resp.json()
    const bloco = (dados.content ?? []).find((c: { type: string }) => c.type === 'tool_use')
    const analise: Saida = bloco?.input ?? { resumo: 'Sem resposta.', clausulasRisco: [], prazos: [], sugestoes: [] }

    // Guarda no histórico, se as credenciais de serviço estiverem presentes.
    try {
      const url = Deno.env.get('SUPABASE_URL')
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (url && serviceKey && contratoId) {
        const sb = createClient(url, serviceKey)
        await sb.from('analises_contratos').insert({
          contrato_id: contratoId,
          resposta_json: analise,
          modelo: MODELO,
        })
      }
    } catch (_) {
      // Histórico é melhor-esforço; não derruba a resposta.
    }

    return json(analise)
  } catch (e) {
    return json({ erro: String(e) }, 500)
  }
})
