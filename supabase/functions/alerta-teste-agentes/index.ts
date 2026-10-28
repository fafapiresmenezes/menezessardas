// Alerta quando teste-agentes falha — M22 backlog
// Chamado via pg_cron diário; verifica status e notifica M

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

interface TesteStatus {
  data: string
  agente: string
  resultado: 'sucesso' | 'erro' | 'timeout'
  erro?: string
}

async function verificarTestesRecentes(): Promise<{ falhas: TesteStatus[], total: number }> {
  const ontem = new Date()
  ontem.setDate(ontem.getDate() - 1)

  const { data, error } = await supabase
    .from('teste_agentes_log')
    .select('*')
    .gte('data', ontem.toISOString())
    .order('data', { ascending: false })
    .limit(20)

  if (error) {
    return { falhas: [], total: 0 }
  }

  const testes = data as any[] || []
  const falhas = testes.filter(t => t.resultado !== 'sucesso') as TesteStatus[]

  return { falhas, total: testes.length }
}

async function enviarAlerta(falhas: TesteStatus[]): Promise<void> {
  if (falhas.length === 0) return

  const { data: admins } = await supabase
    .from('usuarios')
    .select('email')
    .eq('funcao', 'admin')
    .limit(5)

  const admin_emails = (admins as any[] || []).map(a => a.email).filter(Boolean)
  if (!admin_emails.length) return

  // Registra alerta na tabela de alertas
  await supabase
    .from('alertas')
    .insert([{
      tipo: 'teste-agentes-falha',
      descricao: `${falhas.length} testes falharam nas últimas 24h`,
      prioridade: falhas.length > 3 ? 'alta' : 'média',
      data: new Date().toISOString(),
      dados: { falhas },
    }])
    .select()

  console.log(`Alerta enviado: ${falhas.length} testes falharam`)
}

Deno.serve(async () => {
  try {
    const { falhas, total } = await verificarTestesRecentes()

    if (falhas.length > 0) {
      await enviarAlerta(falhas)
    }

    return new Response(
      JSON.stringify({
        status: 'ok',
        testes_total: total,
        testes_falhas: falhas.length,
        testes: falhas.map(f => ({ agente: f.agente, resultado: f.resultado, erro: f.erro })),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    return new Response(JSON.stringify({ erro: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
