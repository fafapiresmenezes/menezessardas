// Funil de vendas do escritório: do primeiro contato ao contrato assinado (vira caso com honorário).
// Métricas como as dos CRMs jurídicos: valor do funil, previsão ponderada, conversão, tempo parado e follow-ups.
export type Etapa = 'novo' | 'qualificacao' | 'reuniao' | 'proposta' | 'negociacao' | 'ganho' | 'perdido'
export type Lead = {
  id: string; nome: string; telefone: string | null; email: string | null; origem: string; area: string | null; assunto: string | null
  etapa: Etapa; valor_estimado: number; proximo_contato: string | null; motivo_perda: string | null; observacoes: string | null
  responsavel_id: string | null; caso_id: string | null; criado_em: string; etapa_desde: string
}

export const ETAPAS: { valor: Etapa; rotulo: string; chance: number; dica: string }[] = [
  { valor: 'novo', rotulo: 'Novo contato', chance: 0.1, dica: 'Responder em até 1 hora aumenta muito a chance de fechar.' },
  { valor: 'qualificacao', rotulo: 'Qualificação', chance: 0.2, dica: 'Confirme se o caso é da área do escritório, se há prazo correndo e quem decide.' },
  { valor: 'reuniao', rotulo: 'Reunião marcada', chance: 0.4, dica: 'Peça os documentos antes da reunião e use o roteiro de entrevista.' },
  { valor: 'proposta', rotulo: 'Proposta enviada', chance: 0.6, dica: 'Retorne em 2 dias úteis; proposta sem retorno esfria.' },
  { valor: 'negociacao', rotulo: 'Negociação', chance: 0.8, dica: 'Ofereça parcelamento antes de dar desconto.' },
  { valor: 'ganho', rotulo: 'Contrato fechado', chance: 1, dica: 'Converta em caso: o honorário vai para o financeiro.' },
  { valor: 'perdido', rotulo: 'Perdido', chance: 0, dica: 'Registre o motivo: é ele que mostra onde melhorar.' },
]
export const ABERTAS: Etapa[] = ['novo', 'qualificacao', 'reuniao', 'proposta', 'negociacao']
export const ORIGENS: [string, string][] = [
  ['indicacao', 'Indicação de cliente'], ['parceiro', 'Parceiro / correspondente'], ['site', 'Site'], ['instagram', 'Instagram'],
  ['google', 'Google'], ['whatsapp', 'WhatsApp'], ['evento', 'Palestra / evento'], ['instituto', 'THEYE Institute'], ['cliente_atual', 'Cliente atual (novo caso)'], ['outro', 'Outro'],
]
export const MOTIVOS_PERDA = ['Preço / honorários', 'Escolheu outro advogado', 'Desistiu de entrar com a ação', 'Sem retorno', 'Fora da área do escritório', 'Caso sem viabilidade', 'Outro']

const DIA = 86400000
const diasEntre = (a: string, b: Date) => Math.floor((b.getTime() - new Date(a.length === 10 ? `${a}T12:00:00` : a).getTime()) / DIA)

export function chance(e: Etapa) { return ETAPAS.find(x => x.valor === e)?.chance ?? 0 }
export function rotuloEtapa(e: Etapa) { return ETAPAS.find(x => x.valor === e)?.rotulo ?? e }

export function resumoFunil(leads: Lead[], agora = new Date()) {
  const abertos = leads.filter(l => ABERTAS.includes(l.etapa))
  const ganhos = leads.filter(l => l.etapa === 'ganho')
  const perdidos = leads.filter(l => l.etapa === 'perdido')
  const fechados = ganhos.length + perdidos.length
  const valorAberto = abertos.reduce((s, l) => s + Number(l.valor_estimado || 0), 0)
  const previsao = abertos.reduce((s, l) => s + Number(l.valor_estimado || 0) * chance(l.etapa), 0)
  const valorGanho = ganhos.reduce((s, l) => s + Number(l.valor_estimado || 0), 0)
  const hoje = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
  const followUps = abertos.filter(l => l.proximo_contato && l.proximo_contato <= hoje).sort((a, b) => (a.proximo_contato! < b.proximo_contato! ? -1 : 1))
  const semFollowUp = abertos.filter(l => !l.proximo_contato)
  const parados = abertos.filter(l => diasEntre(l.etapa_desde, agora) > 14)
  const porEtapa = ETAPAS.map(e => { const ls = leads.filter(l => l.etapa === e.valor); return { ...e, quantidade: ls.length, valor: ls.reduce((s, l) => s + Number(l.valor_estimado || 0), 0) } })
  const porOrigem = ORIGENS.map(([v, r]) => { const ls = leads.filter(l => l.origem === v); const g = ls.filter(l => l.etapa === 'ganho').length; const f = ls.filter(l => l.etapa === 'ganho' || l.etapa === 'perdido').length; return { origem: r, total: ls.length, ganhos: g, conversao: f ? g / f : null } }).filter(o => o.total)
  const motivos = MOTIVOS_PERDA.map(m => ({ motivo: m, quantidade: perdidos.filter(l => l.motivo_perda === m).length })).filter(m => m.quantidade).sort((a, b) => b.quantidade - a.quantidade)
  const ticket = ganhos.length ? valorGanho / ganhos.length : 0
  return { total: leads.length, abertos: abertos.length, valorAberto, previsao, valorGanho, conversao: fechados ? ganhos.length / fechados : null, ticket, followUps, semFollowUp, parados, porEtapa, porOrigem, motivos }
}

/** Próxima etapa natural (para o botão "avançar"). */
export function proximaEtapa(e: Etapa): Etapa | null {
  const i = ABERTAS.indexOf(e)
  if (i < 0) return null
  return i === ABERTAS.length - 1 ? 'ganho' : ABERTAS[i + 1]
}

/** Erros de validação ao mudar de etapa (perdido exige motivo; ganho exige valor). */
export function validarMudanca(l: Pick<Lead, 'valor_estimado'>, destino: Etapa, motivo?: string | null): string | null {
  if (destino === 'perdido' && !motivo) return 'Escolha o motivo da perda.'
  if (destino === 'ganho' && !(Number(l.valor_estimado) > 0)) return 'Informe o valor dos honorários antes de marcar como fechado.'
  return null
}

export function telefoneWhatsapp(tel: string | null): string | null {
  const d = (tel ?? '').replace(/\D/g, '')
  if (d.length < 10) return null
  return d.length <= 11 ? `55${d}` : d
}

export function mensagemRetorno(l: Pick<Lead, 'nome' | 'etapa' | 'assunto'>, escritorio = 'THEYE Institute'): string {
  const primeiro = l.nome.trim().split(/\s+/)[0]
  const sobre = l.assunto ? ` sobre ${l.assunto.trim().replace(/[.]$/, '')}` : ''
  switch (l.etapa) {
    case 'novo': case 'qualificacao': return `Olá, ${primeiro}! Aqui é da ${escritorio}. Recebemos seu contato${sobre}. Podemos conversar hoje para entender melhor e dizer como podemos ajudar?`
    case 'reuniao': return `Olá, ${primeiro}! Confirmando nossa reunião${sobre}. Se puder, envie antes os documentos que tiver (contrato, notificações, comprovantes). Até lá!`
    case 'proposta': return `Olá, ${primeiro}! Conseguiu ver a proposta de honorários${sobre}? Fico à disposição para tirar dúvidas ou ajustar a forma de pagamento.`
    case 'negociacao': return `Olá, ${primeiro}! Para seguirmos${sobre}, posso preparar o contrato de honorários com as condições que combinamos?`
    default: return `Olá, ${primeiro}! Obrigado pela confiança${sobre}.`
  }
}

/** Dados do caso criado quando o lead vira contrato. */
export function casoDoLead(l: Lead) {
  return {
    titulo: `${l.assunto?.trim() || 'Novo caso'} · ${l.nome}`.slice(0, 200), nivel: 'projeto' as const, tipo: 'caso', area: l.area || 'Cível', cliente: l.nome,
    honorario_previsto: Number(l.valor_estimado) || 0, situacao: 'a_fazer' as const, prioridade: 'media' as const, responsavel_id: l.responsavel_id,
    descricao: [`Origem: ${ORIGENS.find(o => o[0] === l.origem)?.[1] ?? l.origem}`, l.telefone && `Telefone: ${l.telefone}`, l.email && `E-mail: ${l.email}`, l.observacoes && `Observações: ${l.observacoes}`].filter(Boolean).join('\n'),
  }
}
