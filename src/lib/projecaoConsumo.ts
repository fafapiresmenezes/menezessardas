// Passo 49: projeção do gasto do mês e sugestão de teto, só com aritmética sobre o consumo registrado.
// Projeção = gasto até hoje × (dias do mês ÷ dias decorridos). Sugestão de teto = o maior entre a projeção e a
// média dos últimos 3 meses fechados, com folga de 20%, arredondado para cima de 10 em 10 reais (mínimo R$ 50).
export type MesConsumo = { mes: string; brl: number }
export function projetarMes(gastoAteHoje: number, hoje: Date): { projecao: number; diasDecorridos: number; diasMes: number } {
  const diasMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()
  const diasDecorridos = Math.max(1, hoje.getDate())
  return { projecao: Math.round((gastoAteHoje * diasMes / diasDecorridos) * 100) / 100, diasDecorridos, diasMes }
}
export function sugerirTeto(projecao: number, mesesAnteriores: MesConsumo[]): { teto: number; base: 'projeção' | 'média dos meses anteriores'; media: number } {
  const ultimos = [...mesesAnteriores].sort((a, b) => b.mes.localeCompare(a.mes)).slice(0, 3)
  const media = ultimos.length ? ultimos.reduce((s, m) => s + m.brl, 0) / ultimos.length : 0
  const base = media > projecao ? 'média dos meses anteriores' : 'projeção'
  const bruto = Math.max(projecao, media) * 1.20
  return { teto: Math.max(50, Math.ceil(bruto / 10) * 10), base, media: Math.round(media * 100) / 100 }
}
