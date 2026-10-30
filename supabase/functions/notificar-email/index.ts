// S20: Envia notificações de vencimento por email
// Deploy: supabase functions deploy notificar-email
// Requer RESEND_API_KEY em secrets

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

interface Notificacao {
  contrato_id: string
  email_destinatario: string
  nome_destinatario: string
  imovel_endereco: string
  locatario: string
  data_vencimento: string
  dias_restantes: number
  valor_mensal: number
}

async function enviarEmailResend(notif: Notificacao): Promise<boolean> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) {
    console.error('RESEND_API_KEY não configurada')
    return false
  }

  const urgencia = notif.dias_restantes <= 7 ? '🔴 URGENTE' : '⚠️ Aviso'
  const assunto = `${urgencia}: Contrato vence em ${notif.dias_restantes} dias`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1a3a3a; color: white; padding: 20px; border-radius: 4px 4px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .footer { background: #f0f0f0; padding: 10px; font-size: 12px; text-align: center; }
    .alerta { color: #d32f2f; font-weight: bold; }
    .details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #1a3a3a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Notificação de Vencimento de Contrato</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${notif.nome_destinatario}</strong>,</p>

      <p>Este é um aviso de que seu contrato vence em <span class="alerta">${notif.dias_restantes} dias</span>.</p>

      <div class="details">
        <h3>Informações do Contrato</h3>
        <p><strong>Imóvel:</strong> ${notif.imovel_endereco}</p>
        <p><strong>Locatário/Fornecedor:</strong> ${notif.locatario}</p>
        <p><strong>Data de Vencimento:</strong> ${new Date(notif.data_vencimento).toLocaleDateString('pt-BR')}</p>
        <p><strong>Valor Mensal:</strong> R$ ${notif.valor_mensal.toFixed(2)}</p>
      </div>

      <p>Acesse sua plataforma para visualizar todas as informações e tomar as ações necessárias:</p>
      <p><a href="https://gmenezes-advogados.vercel.app/" style="color: #1a3a3a; font-weight: bold;">Abrir Plataforma</a></p>

      <p><em>Esta é uma notificação automática. Não responda a este email.</em></p>
    </div>
    <div class="footer">
      <p>Plataforma de Gestão de Contratos Imobiliários | GMenezes Advogados Associados</p>
    </div>
  </div>
</body>
</html>
  `.trim()

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@menezes-sardas-contratos.vercel.app',
        to: notif.email_destinatario,
        subject: assunto,
        html,
      }),
    })

    return resp.ok
  } catch (e) {
    console.error('Erro ao enviar email via Resend:', e)
    return false
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ erro: 'Autenticação necessária' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    // Buscar contratos vencendo nos próximos 7 dias
    const hoje = new Date().toISOString().split('T')[0]
    const em7dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const resp = await fetch(
      `${supabaseUrl}/rest/v1/contratos?select=*,imoveis(endereco,proprietario_nome)&data_vencimento=gte.${hoje}&data_vencimento=lte.${em7dias}&order=data_vencimento`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': authHeader,
        },
      },
    )

    if (!resp.ok) {
      return json({ erro: 'Erro ao buscar contratos' }, resp.status)
    }

    const contratos = await resp.json() as any[]
    const notificacoes: Notificacao[] = []
    let enviados = 0
    let erros = 0

    for (const c of contratos) {
      const diaVence = new Date(c.data_vencimento)
      const hoje = new Date()
      const diasRestantes = Math.ceil((diaVence.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))

      // Email do proprietário/cliente
      const emailDestinatario = c.imoveis?.proprietario_nome || 'Cliente'

      const notif: Notificacao = {
        contrato_id: c.id,
        email_destinatario: 'contato@menezes-sardas.com.br', // Placeholder — usar email real depois
        nome_destinatario: emailDestinatario,
        imovel_endereco: c.imoveis?.endereco || 'Imóvel desconhecido',
        locatario: c.locatario_fornecedor || 'Sem nome',
        data_vencimento: c.data_vencimento,
        dias_restantes: diasRestantes,
        valor_mensal: c.valor_periodico || 0,
      }

      notificacoes.push(notif)

      // Enviar email
      const sucesso = await enviarEmailResend(notif)
      if (sucesso) {
        enviados++
      } else {
        erros++
      }
    }

    return json({
      total: contratos.length,
      notificacoes_geradas: notificacoes.length,
      emails_enviados: enviados,
      erros,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    return json({ erro: String(e) }, 500)
  }
})
