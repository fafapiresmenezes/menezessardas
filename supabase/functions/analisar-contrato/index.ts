// Função no servidor: lê o contrato e devolve análise jurídica assistida.
// A chave da Anthropic fica como segredo da função (ANTHROPIC_API_KEY),
// nunca no navegador. Deploy: supabase functions deploy analisar-contrato
// Segredo: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const chave = Deno.env.get('ANTHROPIC_API_KEY')
    if (!chave) {
      return new Response(JSON.stringify({ erro: 'Chave da Anthropic não configurada no servidor.' }), {
        status: 503,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { texto, contratoId } = await req.json()
    if (!texto || typeof texto !== 'string') {
      return new Response(JSON.stringify({ erro: 'Envie o texto do contrato em "texto".' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
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
      headers: {
        'x-api-key': chave,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: MAX_TOKENS,
        system: SISTEMA,
        tools: [ferramenta],
        tool_choice: { type: 'tool', name: 'registrar_analise' },
        messages: [{ role: 'user', content: `Contrato para análise:\n\n${texto.slice(0, 40000)}` }],
      }),
    })

    if (!resp.ok) {
      const detalhe = await resp.text()
      return new Response(JSON.stringify({ erro: 'Falha na API da Anthropic.', detalhe }), {
        status: 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

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

    return new Response(JSON.stringify(analise), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ erro: String(e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
