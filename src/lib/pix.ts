// PIX estático (BR Code, padrão EMV do Banco Central) gerado na hora, sem API bancária.
// O cliente paga lendo o QR ou colando o código "copia e cola" no aplicativo do banco.
const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 .-]/g, '').replace(/\s+/g, ' ').trim()
const campo = (id: string, v: string) => id + String(v.length).padStart(2, '0') + v

export function crc16(s: string): string {
  let crc = 0xffff
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export function codigoPix(p: { chave: string; nome: string; cidade: string; valor?: number; referencia?: string; descricao?: string }): string {
  const info = campo('00', 'br.gov.bcb.pix') + campo('01', p.chave.trim()) + (p.descricao ? campo('02', semAcento(p.descricao).slice(0, 40)) : '')
  const ref = (p.referencia ? semAcento(p.referencia).replace(/\s+/g, '').slice(0, 25) : '') || '***'
  let s = campo('00', '01') + campo('26', info) + campo('52', '0000') + campo('53', '986')
  if (p.valor && p.valor > 0) s += campo('54', p.valor.toFixed(2))
  s += campo('58', 'BR') + campo('59', semAcento(p.nome).slice(0, 25) || 'Recebedor') + campo('60', semAcento(p.cidade).slice(0, 15) || 'Rio de Janeiro') + campo('62', campo('05', ref)) + '6304'
  return s + crc16(s)
}
