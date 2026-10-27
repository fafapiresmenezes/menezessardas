// S20: Exporta vencimentos de contratos em iCal para Google Calendar
// Deploy: supabase functions deploy exportar-calendario

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

interface Contrato {
  id: string
  imovel_endereco: string
  locatario_fornecedor: string
  data_vencimento: string | null
  valor_periodico: number
}

function gerarIcal(contratos: Contrato[]): string {
  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Menezes Sardas//Contratos//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Vencimentos de Contratos',
    'X-WR-TIMEZONE:America/Sao_Paulo',
  ]

  const agora = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  for (const c of contratos) {
    if (!c.data_vencimento) continue

    const [ano, mes, dia] = c.data_vencimento.split('-')
    const dataVence = `${ano}${mes}${dia}`

    // Aviso 7 dias antes
    const dataAvisoPre = new Date(c.data_vencimento)
    dataAvisoPre.setDate(dataAvisoPre.getDate() - 7)
    const dataAvisoFormatada = dataAvisoPre.toISOString().split('T')[0].replace(/-/g, '')

    linhas.push(
      'BEGIN:VEVENT',
      `UID:${c.id}@menezes-sardas`,
      `DTSTAMP:${agora}`,
      `DTSTART:${dataVence}`,
      `DTSTART;VALUE=DATE:${dataVence}`,
      `SUMMARY:VENCIMENTO - ${c.imovel_endereco.substring(0, 40)}`,
      `DESCRIPTION:Contrato de ${c.locatario_fornecedor}\\nValor: R$ ${c.valor_periodico.toFixed(2)}`,
      `LOCATION:${c.imovel_endereco}`,
      'BEGIN:VALARM',
      'TRIGGER:-P7D',
      'ACTION:DISPLAY',
      `DESCRIPTION:Vencimento de contrato em 7 dias`,
      'END:VALARM',
      'END:VEVENT',
    )
  }

  linhas.push('END:VCALENDAR')
  return linhas.join('\r\n')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const url = new URL(req.url)
    const formato = url.searchParams.get('formato') || 'ical'

    // Query os contratos com vencimento
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ erro: 'Autenticação necessária' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Usar Supabase client para buscar contratos
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    const resp = await fetch(`${supabaseUrl}/rest/v1/contratos?select=id,imovel_id,locatario_fornecedor,data_vencimento,valor_periodico,imoveis(endereco)&data_vencimento=not.is.null&data_vencimento=gte.${new Date().toISOString().split('T')[0]}`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': authHeader,
      },
    })

    if (!resp.ok) {
      return new Response(JSON.stringify({ erro: 'Erro ao buscar contratos' }), {
        status: resp.status,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const data = await resp.json() as any[]
    const contratos: Contrato[] = data.map((c: any) => ({
      id: c.id,
      imovel_endereco: c.imoveis?.endereco || 'Imóvel',
      locatario_fornecedor: c.locatario_fornecedor || 'Sem nome',
      data_vencimento: c.data_vencimento,
      valor_periodico: c.valor_periodico || 0,
    }))

    if (formato === 'ical') {
      const ical = gerarIcal(contratos)
      return new Response(ical, {
        headers: {
          ...cors,
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': 'attachment; filename="contratos.ics"',
        },
      })
    }

    // Formato Google Calendar (URL)
    const evento = contratos[0]
    if (!evento) {
      return new Response(JSON.stringify({ erro: 'Nenhum contrato com vencimento próximo' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const googleCalendarUrl = `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(
      `Vencimento: ${evento.imovel_endereco}`,
    )}&dates=${evento.data_vencimento?.replace(/-/g, '')}/${evento.data_vencimento?.replace(/-/g, '')}&ctz=America/Sao_Paulo`

    return new Response(JSON.stringify({ url: googleCalendarUrl, total: contratos.length }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ erro: String(e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
