import { describe, expect, it } from 'vitest'
import { lerIcs } from '@/lib/ics'

const ICS = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'UID:abc-1@outlook', 'DTSTART;VALUE=DATE:20261105', 'SUMMARY:Audiência\\, 2ª Vara', 'LOCATION:Fórum Central', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:abc-2@outlook', 'DTSTART;TZID=America/Sao_Paulo:20261110T140000', 'SUMMARY:Reunião com cliente', ' continuação', 'DESCRIPTION:Sala 3', 'END:VEVENT',
  'BEGIN:VEVENT', 'SUMMARY:Sem data', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')

describe('lerIcs', () => {
  it('lê eventos com data pura e data-hora, desdobra linhas e ignora sem DTSTART', () => {
    const ev = lerIcs(ICS)
    expect(ev).toHaveLength(2)
    expect(ev[0]).toEqual({ uid: 'abc-1@outlook', titulo: 'Audiência, 2ª Vara', data: '2026-11-05', local: 'Fórum Central' })
    expect(ev[1].data).toBe('2026-11-10')
    expect(ev[1].titulo).toBe('Reunião com clientecontinuação')
    expect(ev[1].local).toBe('Sala 3')
  })
})
