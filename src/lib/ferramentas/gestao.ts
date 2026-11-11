// Theye Suporte Jurídico — gestão do escritório, negociação e bem-estar (economia comportamental e psicologia aplicada à advocacia).
import { arred } from './base'

export function simularHonorarios(fixo: number, parcelas: number, pctExito: number, proveito: number, probExito: number) {
  const exito = proveito * pctExito / 100
  return { parcela: arred(fixo / Math.max(1, parcelas)), exitoSeGanhar: arred(exito), esperado: arred(fixo + exito * probExito / 100), maximo: arred(fixo + exito) }
}

/** Valor mínimo da hora: (custos + pró-labore) / horas faturáveis, com margem e tributos por dentro. */
export function valorHora(custos: number, proLabore: number, horas: number, margemPct: number, tributosPct: number) {
  if (horas <= 0) throw new Error('Informe as horas faturáveis por mês')
  const base = (custos + proLabore) / horas
  const divisor = 1 - (margemPct + tributosPct) / 100
  if (divisor <= 0) throw new Error('Margem + tributos precisam somar menos de 100%')
  return { custoHora: arred(base), valorHora: arred(base / divisor), faturamentoMeta: arred(base / divisor * horas) }
}

/** Valor esperado do processo vs. proposta de acordo, trazido a valor presente. */
export function acordoOuProcesso(pedido: number, probExito: number, custos: number, honorariosPct: number, meses: number, taxaMensal: number, proposta: number) {
  const liquidoSeGanhar = pedido * (1 - honorariosPct / 100)
  const esperado = liquidoSeGanhar * probExito / 100 - custos
  const presente = esperado / (1 + taxaMensal / 100) ** meses
  const propostaLiquida = proposta * (1 - honorariosPct / 100)
  const diferenca = propostaLiquida - presente
  return {
    esperado: arred(esperado), presente: arred(presente), propostaLiquida: arred(propostaLiquida), diferenca: arred(diferenca),
    recomendacao: diferenca >= 0 ? 'A proposta supera o valor esperado do processo: tende a valer o acordo.' : 'A proposta fica abaixo do valor esperado: há espaço para contraproposta.',
    contraproposta: arred(Math.max(proposta, presente / (1 - honorariosPct / 100))),
  }
}

export function eisenhower(texto: string) {
  const q = { fazer: [] as string[], agendar: [] as string[], delegar: [] as string[], eliminar: [] as string[] }
  for (const bruta of texto.split('\n')) {
    const l = bruta.trim(); if (!l) continue
    const u = /#urgente\b/i.test(l), i = /#importante\b/i.test(l)
    const t = l.replace(/#(urgente|importante)\b/gi, '').replace(/\s+/g, ' ').trim()
    ;(u && i ? q.fazer : !u && i ? q.agendar : u ? q.delegar : q.eliminar).push(t)
  }
  return q
}

const hhmm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
/** Blocos de foco (técnica Pomodoro, 25/5, ou 50/10), com pausa longa a cada 4 blocos. */
export function blocosDeFoco(texto: string, inicio: string, foco: number, pausa: number) {
  const [h, m] = inicio.split(':').map(Number)
  let t = (h || 0) * 60 + (m || 0), bloco = 0
  const agenda: { de: string; ate: string; o_que: string }[] = []
  const tarefas = texto.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [nome, min] = l.split(';'); return { nome: nome.trim(), min: Math.max(5, Number(min) || foco) } })
  for (const tarefa of tarefas) {
    let resta = tarefa.min
    while (resta > 0) {
      const dur = Math.min(foco, resta)
      agenda.push({ de: hhmm(t), ate: hhmm(t + dur), o_que: tarefa.nome }); t += dur; resta -= dur; bloco++
      const p = bloco % 4 === 0 ? Math.max(15, pausa * 3) : pausa
      agenda.push({ de: hhmm(t), ate: hhmm(t + p), o_que: bloco % 4 === 0 ? 'Pausa longa (levante, beba água)' : 'Pausa curta' }); t += p
    }
  }
  if (agenda.length) agenda.pop()
  return { agenda, blocos: bloco, termino: agenda.length ? agenda[agenda.length - 1].ate : inicio }
}

/** Check-in de carga de trabalho. Não é diagnóstico: aponta sinais de sobrecarga e caminhos de apoio. */
export function checkinCarga(horasSemana: number, noitesSonoCurto: number, diasSemPausa: number, exaustao: number) {
  let pontos = 0
  if (horasSemana > 60) pontos += 3; else if (horasSemana > 50) pontos += 2; else if (horasSemana > 44) pontos += 1
  pontos += noitesSonoCurto >= 5 ? 3 : noitesSonoCurto >= 3 ? 2 : noitesSonoCurto >= 1 ? 1 : 0
  pontos += diasSemPausa >= 5 ? 2 : diasSemPausa >= 3 ? 1 : 0
  pontos += Math.max(0, Math.min(4, exaustao))
  const nivel = pontos >= 8 ? 'alto' : pontos >= 4 ? 'moderado' : 'baixo'
  const dicas = nivel === 'alto'
    ? ['Converse com alguém de confiança e considere procurar um profissional de saúde mental.', 'Redistribua prazos não fatais com a equipe ainda esta semana.', 'Se estiver em sofrimento intenso, o CVV atende 24 horas pelo telefone 188 ou em cvv.org.br.']
    : nivel === 'moderado'
      ? ['Proteja 1 bloco de foco por dia sem e-mail e WhatsApp.', 'Faça pausas curtas entre peças (técnica de blocos de foco).', 'Defina um horário de encerramento e avise os clientes do canal de urgência.']
      : ['Mantenha a rotina: pausas, sono e limites de horário estão funcionando.']
  return { pontos, nivel, dicas }
}
