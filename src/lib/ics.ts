/**
 * Exportação de compromissos para o padrão iCalendar (.ics), que o Google
 * Agenda, o Outlook e o Apple Calendário entendem. Tudo é evento de dia
 * inteiro, com lembrete alguns dias antes.
 */
import type { Alerta } from './repositorio'

function dobrar(linha: string): string {
  // O padrão manda quebrar linhas acima de 75 octetos; mantemos simples.
  if (linha.length <= 74) return linha
  const partes: string[] = []
  let resto = linha
  partes.push(resto.slice(0, 74))
  resto = resto.slice(74)
  while (resto.length > 73) {
    partes.push(' ' + resto.slice(0, 73))
    resto = resto.slice(73)
  }
  partes.push(' ' + resto)
  return partes.join('\r\n')
}

function escapar(texto: string): string {
  return texto.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

const soData = (iso: string) => iso.replace(/-/g, '')

function proximoDia(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return soData(d.toISOString().slice(0, 10))
}

/** Monta o texto .ics com um evento de dia inteiro por compromisso. */
export function gerarICS(alertas: Alerta[], nomeCalendario = 'Compromissos contratuais'): string {
  const agora = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const linhas: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GMenezes Advogados Associados//Gestão Contratual//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    dobrar('X-WR-CALNAME:' + escapar(nomeCalendario)),
  ]

  alertas.forEach(a => {
    linhas.push('BEGIN:VEVENT')
    linhas.push(`UID:${a.id}@sardasmenezes`)
    linhas.push(`DTSTAMP:${agora}`)
    linhas.push(`DTSTART;VALUE=DATE:${soData(a.dataEvento)}`)
    linhas.push(`DTEND;VALUE=DATE:${proximoDia(a.dataEvento)}`)
    linhas.push(dobrar('SUMMARY:' + escapar(a.titulo)))
    linhas.push(dobrar('DESCRIPTION:' + escapar(a.imovel)))
    // Lembrete 7 dias antes, às 9h.
    linhas.push('BEGIN:VALARM')
    linhas.push('TRIGGER:-P7D')
    linhas.push('ACTION:DISPLAY')
    linhas.push(dobrar('DESCRIPTION:' + escapar(a.titulo + ' — ' + a.imovel)))
    linhas.push('END:VALARM')
    linhas.push('END:VEVENT')
  })

  linhas.push('END:VCALENDAR')
  return linhas.join('\r\n')
}

/** Dispara o download do arquivo .ics no navegador. */
export function baixarICS(alertas: Alerta[], nomeArquivo = 'compromissos.ics') {
  const texto = gerarICS(alertas)
  const blob = new Blob([texto], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
