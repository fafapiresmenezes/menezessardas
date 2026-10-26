// Agente guardião: resumo diário de prazos próximos e próximos passos recomendados.
// Deploy: supabase functions deploy agente-guardiao

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const url = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !serviceKey) return json({ erro: 'Credenciais não disponíveis.' }, 500)

    const sb = createClient(url, serviceKey)

    // Coleta vencimentos, reajustes e documentos dos próximos 30 dias
    const hoje = new Date()
    const _30d = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000)
    const hojeStr = hoje.toISOString().split('T')[0]
    const _30dStr = _30d.toISOString().split('T')[0]

    // Contratos que vencem nos próximos 30 dias
    const { data: vencimentos } = await sb
      .from('contratos')
      .select('id, numero, imovel_id, data_vencimento, valor_mensal')
      .gte('data_vencimento', hojeStr)
      .lte('data_vencimento', _30dStr)
      .is('data_encerramento', null)

    // Reajustes (aniversários de data_ultimo_reajuste + 1 ano)
    const { data: contratos } = await sb
      .from('contratos')
      .select('id, numero, data_ultimo_reajuste, valor_mensal')
      .is('data_encerramento', null)

    const reajustes = (contratos || []).filter(c => {
      if (!c.data_ultimo_reajuste) return false
      const proxReajuste = new Date(c.data_ultimo_reajuste)
      proxReajuste.setFullYear(proxReajuste.getFullYear() + 1)
      return proxReajuste >= hoje && proxReajuste <= _30d
    })

    // Documentos que vencem
    const { data: documentos } = await sb
      .from('documentos')
      .select('id, nome, contrato_id, data_vencimento')
      .gte('data_vencimento', hojeStr)
      .lte('data_vencimento', _30dStr)

    const totalVencimento = (vencimentos || []).length
    const totalReajuste = reajustes.length
    const totalDocumentos = (documentos || []).length
    const receitaEmRisco = (vencimentos || []).reduce((sum, c) => sum + (c.valor_mensal || 0), 0)

    const resumo = {
      data: hojeStr,
      periodo: '30 dias',
      vencimentos: totalVencimento,
      reajustes: totalReajuste,
      documentos: totalDocumentos,
      receitaEmRisco: Math.round(receitaEmRisco),
      proximosPassos: [] as string[],
    }

    // Próximos passos recomendados
    if (totalVencimento > 0) {
      resumo.proximosPassos.push(
        `${totalVencimento} contrato(s) vencem nos próximos 30 dias. Revisar renovação ou encerramento.`
      )
    }
    if (totalReajuste > 0) {
      resumo.proximosPassos.push(`${totalReajuste} reajuste(s) anual(ais) programado(s). Executar cálculo e notificar inquilino.`)
    }
    if (totalDocumentos > 0) {
      resumo.proximosPassos.push(`${totalDocumentos} documento(s) vence(m). Solicitar renovação ou dispensa.`)
    }
    if (totalVencimento === 0 && totalReajuste === 0 && totalDocumentos === 0) {
      resumo.proximosPassos.push('Nenhum evento programado nos próximos 30 dias.')
    }

    // Registra o resumo em uma tabela de alertas (opcional)
    try {
      await sb.from('alertas').insert({
        tipo: 'resumo_diario',
        descricao: `Resumo: ${totalVencimento} vencimentos, ${totalReajuste} reajustes, ${totalDocumentos} docs; receita em risco: R$ ${resumo.receitaEmRisco.toLocaleString('pt-BR')}`,
        dados_json: resumo,
        lido: false,
      })
    } catch (_) {
      // Tabela de alertas pode não existir ainda
    }

    return json(resumo)
  } catch (e) {
    return json({ erro: String(e) }, 500)
  }
})
