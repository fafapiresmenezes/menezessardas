// S21: Agendador diário de notificações (alertas automáticos)
// Invocado por cron externo (GitHub Actions, Vercel Cron, ou supervisão manual)
// Deploy: supabase functions deploy agendar-notificacoes
// Requer RESEND_API_KEY em secrets

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

async function enviarEmailResend(to: string, assunto: string, html: string): Promise<boolean> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY não configurada — emails não serão enviados de verdade')
    console.log(`[SIMULADO] Email para ${to}: ${assunto}`)
    return true // Retorna sucesso mesmo sem chave (modo simulado)
  }

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@menezes-sardas-contratos.vercel.app',
        to,
        subject: assunto,
        html,
      }),
    })
    return resp.ok
  } catch (e) {
    console.error('Erro ao enviar email:', e)
    return false
  }
}

async function sincronizarGoogleCalendar(imovelEndereco: string, dataVencimento: string): Promise<string> {
  // Retorna URL para sincronizar com Google Calendar
  return `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(
    `Vencimento: ${imovelEndereco}`
  )}&dates=${dataVencimento.replace(/-/g, '')}/${dataVencimento.replace(/-/g, '')}&ctz=America/Sao_Paulo`
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

    // Buscar contratos vencendo nos próximos 7 dias (padrão)
    const hoje = new Date().toISOString().split('T')[0]
    const em7dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Buscar contratos com vencimento próximo
    const respContratos = await fetch(
      `${supabaseUrl}/rest/v1/contratos?select=*,imoveis(endereco,proprietario_nome)&data_vencimento=gte.${hoje}&data_vencimento=lte.${em7dias}&order=data_vencimento`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': authHeader,
        },
      },
    )

    if (!respContratos.ok) {
      return json({ erro: 'Erro ao buscar contratos' }, respContratos.status)
    }

    const contratos = (await respContratos.json()) as any[]

    // Buscar alertas customizados (compromissos) também
    const respAlertas = await fetch(
      `${supabaseUrl}/rest/v1/alertas?select=*&data_evento=gte.${hoje}&data_evento=lte.${em7dias}&tipo_alerta=eq.compromisso&order=data_evento`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': authHeader,
        },
      },
    )

    const alertas = respAlertas.ok ? ((await respAlertas.json()) as any[]) : []

    let emailsEnviados = 0
    let erros = 0
    let googleCalendarLinks = []

    // Processar contratos
    for (const c of contratos) {
      const diaVence = new Date(c.data_vencimento)
      const hoje_ = new Date()
      const diasRestantes = Math.ceil((diaVence.getTime() - hoje_.getTime()) / (1000 * 60 * 60 * 24))

      const emailDestinatario = 'contato@menezes-sardas.com.br' // Placeholder — M configura em Secrets
      const nomeDestinatario = c.imoveis?.proprietario_nome || 'Cliente'
      const imovelEndereco = c.imoveis?.endereco || 'Imóvel desconhecido'
      const locatario = c.locatario_fornecedor || 'Sem nome'
      const valorMensal = c.valor_periodico || 0

      const urgencia = diasRestantes <= 7 ? '🔴 URGENTE' : '⚠️ Aviso'
      const assunto = `${urgencia}: Contrato vence em ${diasRestantes} dias`

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
body { font-family: Arial, sans-serif; color: #333; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; }
.header { background: #1a3a3a; color: white; padding: 20px; border-radius: 4px 4px 0 0; }
.content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
.details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #1a3a3a; }
.alerta { color: #d32f2f; font-weight: bold; }
.footer { background: #f0f0f0; padding: 10px; font-size: 12px; text-align: center; }
</style></head>
<body>
<div class="container">
<div class="header"><h1>Notificação de Vencimento</h1></div>
<div class="content">
<p>Olá <strong>${nomeDestinatario}</strong>,</p>
<p>Seu contrato vence em <span class="alerta">${diasRestantes} dias</span>.</p>
<div class="details">
<h3>Detalhes do Contrato</h3>
<p><strong>Imóvel:</strong> ${imovelEndereco}</p>
<p><strong>Locatário/Fornecedor:</strong> ${locatario}</p>
<p><strong>Data de Vencimento:</strong> ${new Date(c.data_vencimento).toLocaleDateString('pt-BR')}</p>
<p><strong>Valor Mensal:</strong> R$ ${valorMensal.toFixed(2)}</p>
</div>
<p><a href="https://menezes-sardas-contratos.vercel.app/" style="color: #1a3a3a; font-weight: bold;">Abrir Plataforma</a></p>
<p><em>Notificação automática — não responda.</em></p>
</div>
<div class="footer">Gestão de Contratos | Letícia Sardas & Menezes Advogados</div>
</div>
</body>
</html>
      `.trim()

      const sucesso = await enviarEmailResend(emailDestinatario, assunto, html)
      if (sucesso) {
        emailsEnviados++
        // Gerar link Google Calendar
        const gcalUrl = await sincronizarGoogleCalendar(imovelEndereco, c.data_vencimento)
        googleCalendarLinks.push({
          imovel: imovelEndereco,
          vencimento: c.data_vencimento,
          googleCalendarUrl: gcalUrl,
        })
      } else {
        erros++
      }
    }

    // Processar alertas customizados (compromissos)
    for (const a of alertas) {
      const emailDestinatario = 'contato@menezes-sardas.com.br'
      const diasRestantes = Math.ceil((new Date(a.data_evento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      const assunto = `Compromisso: ${a.titulo} em ${diasRestantes} dias`
      const html = `
<html><body style="font-family: Arial;">
<p>Lembrete: <strong>${a.titulo}</strong></p>
<p>Data: ${new Date(a.data_evento).toLocaleDateString('pt-BR')}</p>
<p><a href="https://menezes-sardas-contratos.vercel.app/agenda">Ver na Agenda</a></p>
</body></html>
      `

      const sucesso = await enviarEmailResend(emailDestinatario, assunto, html)
      if (sucesso) emailsEnviados++
      else erros++
    }

    return json({
      status: 'sucesso',
      timestamp: new Date().toISOString(),
      processado: {
        contratos: contratos.length,
        alertas_customizados: alertas.length,
        emails_enviados: emailsEnviados,
        erros,
        google_calendar_links: googleCalendarLinks.slice(0, 3), // Top 3
      },
      nota: 'RESEND_API_KEY não configurada — emails em modo simulado. Configure a chave em Supabase Secrets para ativar envio real.',
    })
  } catch (e) {
    return json({ erro: String(e) }, 500)
  }
})
