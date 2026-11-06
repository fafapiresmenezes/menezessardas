// Passo D13 (Diamante): parcelas de honorários. Plano mensal com centavos na última parcela
// (mesma regra da RPC gerar_parcelas) e situação de cada parcela pelo vencimento.
export type Parcela = { id: number; caso_id: string; numero: number; vencimento: string; valor: number; pago_em: string | null; pagamento_id: number | null }

export function planoParcelas(total: number, quantidade: number, primeiro: string): { numero: number; vencimento: string; valor: number }[] {
  if (!(total > 0) || !(quantidade >= 1) || !/^\d{4}-\d{2}-\d{2}$/.test(primeiro)) return []
  const n = Math.min(120, Math.floor(quantidade))
  const base = Math.floor((total / n) * 100) / 100
  const [a, m, d] = primeiro.split('-').map(Number)
  return Array.from({ length: n }, (_, i) => {
    const mes = m - 1 + i
    const ano = a + Math.floor(mes / 12)
    const ultimoDia = new Date(Date.UTC(ano, (mes % 12) + 1, 0)).getUTCDate()
    const dia = Math.min(d, ultimoDia)
    const venc = `${ano}-${String((mes % 12) + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    const valor = i === n - 1 ? Math.round((total - base * (n - 1)) * 100) / 100 : base
    return { numero: i + 1, vencimento: venc, valor }
  })
}

export type SituacaoParcela = { codigo: 'paga' | 'atrasada' | 'vence_breve' | 'em_dia'; rotulo: string; dias: number | null }
export function situacaoParcela(p: Pick<Parcela, 'vencimento' | 'pago_em'>, hoje = new Date()): SituacaoParcela {
  if (p.pago_em) return { codigo: 'paga', rotulo: 'Paga', dias: null }
  const h = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const [a, m, d] = p.vencimento.slice(0, 10).split('-').map(Number)
  const dias = Math.round((Date.UTC(a, m - 1, d) - h) / 86400000)
  if (dias < 0) return { codigo: 'atrasada', rotulo: `Atrasada ${-dias} dia${dias === -1 ? '' : 's'}`, dias }
  if (dias === 0) return { codigo: 'vence_breve', rotulo: 'Vence hoje', dias }
  if (dias <= 7) return { codigo: 'vence_breve', rotulo: `Vence em ${dias} dia${dias === 1 ? '' : 's'}`, dias }
  return { codigo: 'em_dia', rotulo: 'Em dia', dias }
}

// Resumo das parcelas de um caso para a tela e para o e-mail: quantas pagas, em aberto e atrasadas.
export function resumoParcelas(ps: Parcela[], hoje = new Date()) {
  const r = { total: ps.length, pagas: 0, abertas: 0, atrasadas: 0, valorAberto: 0, valorAtrasado: 0 }
  for (const p of ps) {
    const s = situacaoParcela(p, hoje)
    if (s.codigo === 'paga') r.pagas++
    else { r.abertas++; r.valorAberto += Number(p.valor); if (s.codigo === 'atrasada') { r.atrasadas++; r.valorAtrasado += Number(p.valor) } }
  }
  r.valorAberto = Math.round(r.valorAberto * 100) / 100; r.valorAtrasado = Math.round(r.valorAtrasado * 100) / 100
  return r
}
