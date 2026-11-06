// Bloco B02: questionário de perfil de atendimento do cliente.
// Só preferências de atendimento declaradas pelo próprio cliente, com consentimento (termo B01).
// Não há pontuação de "bom ou mau cliente", nem dado sensível, nem decisão automática.

export type Dimensao = 'canal' | 'frequencia' | 'detalhe' | 'urgencia' | 'risco' | 'objetivo' | 'envolvimento' | 'custo'
export type Opcao = { valor: string; rotulo: string }
export type Pergunta = { id: string; dimensao: Dimensao; texto: string; opcoes: Opcao[] }

export const PERGUNTAS: Pergunta[] = [
  { id: 'q1', dimensao: 'canal', texto: 'Por onde prefere receber notícias do seu caso?', opcoes: [{ valor: 'whatsapp', rotulo: 'WhatsApp' }, { valor: 'email', rotulo: 'E-mail' }, { valor: 'telefone', rotulo: 'Telefone' }, { valor: 'reuniao', rotulo: 'Reunião' }] },
  { id: 'q2', dimensao: 'frequencia', texto: 'Com que frequência quer ser atualizado?', opcoes: [{ valor: 'semanal', rotulo: 'Toda semana' }, { valor: 'quinzenal', rotulo: 'A cada 15 dias' }, { valor: 'marcos', rotulo: 'Só quando houver novidade importante' }] },
  { id: 'q3', dimensao: 'detalhe', texto: 'Como prefere as explicações?', opcoes: [{ valor: 'resumo', rotulo: 'Resumo curto, sem termos jurídicos' }, { valor: 'medio', rotulo: 'Resumo e os próximos passos' }, { valor: 'completo', rotulo: 'Completo, com fundamentos e documentos' }] },
  { id: 'q4', dimensao: 'detalhe', texto: 'Quer receber cópia das peças e decisões?', opcoes: [{ valor: 'resumo', rotulo: 'Não, só o resultado' }, { valor: 'medio', rotulo: 'Só as decisões' }, { valor: 'completo', rotulo: 'Sim, tudo' }] },
  { id: 'q5', dimensao: 'urgencia', texto: 'Quão urgente é resolver este assunto para você?', opcoes: [{ valor: 'alta', rotulo: 'Muito urgente (semanas)' }, { valor: 'media', rotulo: 'Alguns meses' }, { valor: 'baixa', rotulo: 'Sem pressa, prefiro o melhor resultado' }] },
  { id: 'q6', dimensao: 'risco', texto: 'Diante de duas saídas, qual escolhe?', opcoes: [{ valor: 'baixo', rotulo: 'Um resultado menor, porém garantido' }, { valor: 'medio', rotulo: 'Depende do caso' }, { valor: 'alto', rotulo: 'Arriscar por um resultado maior' }] },
  { id: 'q7', dimensao: 'risco', texto: 'Se o caso puder demorar anos, você:', opcoes: [{ valor: 'baixo', rotulo: 'Prefere encerrar logo' }, { valor: 'medio', rotulo: 'Aceita, se valer a pena' }, { valor: 'alto', rotulo: 'Vai até o fim' }] },
  { id: 'q8', dimensao: 'objetivo', texto: 'O que é mais importante neste caso?', opcoes: [{ valor: 'acordo', rotulo: 'Resolver com acordo' }, { valor: 'relacao', rotulo: 'Preservar a relação com a outra parte' }, { valor: 'decisao', rotulo: 'Obter uma decisão judicial' }, { valor: 'valor', rotulo: 'Recuperar ou proteger valores' }] },
  { id: 'q9', dimensao: 'objetivo', texto: 'Aceitaria uma mediação ou conciliação?', opcoes: [{ valor: 'acordo', rotulo: 'Sim, de preferência' }, { valor: 'relacao', rotulo: 'Sim, se houver respeito' }, { valor: 'decisao', rotulo: 'Só se a proposta for boa' }] },
  { id: 'q10', dimensao: 'envolvimento', texto: 'Quanto quer participar das decisões do caso?', opcoes: [{ valor: 'alto', rotulo: 'Quero decidir cada passo' }, { valor: 'medio', rotulo: 'Só as decisões importantes' }, { valor: 'baixo', rotulo: 'Confio no escritório para decidir' }] },
  { id: 'q11', dimensao: 'custo', texto: 'Sobre custos do processo (custas, perícias), prefere:', opcoes: [{ valor: 'previsivel', rotulo: 'Valor fechado e previsível' }, { valor: 'aviso', rotulo: 'Ser avisado antes de cada gasto' }, { valor: 'flexivel', rotulo: 'Flexível, conforme a estratégia' }] },
  { id: 'q12', dimensao: 'canal', texto: 'Melhor horário para contato?', opcoes: [{ valor: 'manha', rotulo: 'Manhã' }, { valor: 'tarde', rotulo: 'Tarde' }, { valor: 'noite', rotulo: 'Início da noite' }, { valor: 'qualquer', rotulo: 'Qualquer horário comercial' }] },
]

export type Respostas = Record<string, string>
export type ResultadoPerfil = { completo: boolean; respondidas: number; resumo: string[]; sugestoes: string[] }

const rot = (id: string, r: Respostas) => PERGUNTAS.find(p => p.id === id)?.opcoes.find(o => o.valor === r[id])?.rotulo
const moda = (vals: (string | undefined)[]) => {
  const c: Record<string, number> = {}; for (const v of vals) if (v) c[v] = (c[v] ?? 0) + 1
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0]
}

export function avaliarPerfil(r: Respostas): ResultadoPerfil {
  const respondidas = PERGUNTAS.filter(p => r[p.id]).length
  const resumo: string[] = []; const sugestoes: string[] = []
  const canal = rot('q1', r); const horario = rot('q12', r)
  if (canal) { resumo.push(`Contato preferido: ${canal}${horario ? `, ${horario.toLowerCase()}` : ''}.`); sugestoes.push(`Mande as atualizações por ${canal.toLowerCase()}${horario ? ` (${horario.toLowerCase()})` : ''}.`) }
  const freq = rot('q2', r); if (freq) resumo.push(`Atualizações: ${freq.toLowerCase()}.`)
  const detalhe = moda([r.q3, r.q4])
  if (detalhe) sugestoes.push(detalhe === 'resumo' ? 'Use linguagem simples e mensagens curtas, sem jargão.' : detalhe === 'completo' ? 'Envie fundamentos e cópia das peças e decisões.' : 'Envie resumo com os próximos passos e prazos.')
  const risco = moda([r.q6, r.q7])
  if (risco) { resumo.push(`Tolerância a risco: ${risco === 'baixo' ? 'baixa' : risco === 'alto' ? 'alta' : 'moderada'} (declarada pelo cliente).`); if (risco === 'baixo') sugestoes.push('Apresente sempre a opção de acordo e o cenário mais conservador.') }
  if (r.q5 === 'alta') sugestoes.push('Priorize medidas rápidas (tutela de urgência, notificação, acordo) e explique os prazos reais.')
  const objetivo = moda([r.q8, r.q9])
  if (objetivo === 'acordo' || objetivo === 'relacao') sugestoes.push('Considere mediação ou conciliação logo no início.')
  if (r.q10 === 'alto') sugestoes.push('Peça aprovação do cliente antes de cada passo relevante.')
  if (r.q11 === 'previsivel' || r.q11 === 'aviso') sugestoes.push('Informe os custos previstos por escrito antes de cada etapa.')
  return { completo: respondidas === PERGUNTAS.length, respondidas, resumo, sugestoes }
}
