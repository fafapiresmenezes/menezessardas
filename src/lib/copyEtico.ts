// Habilidade 5 do replanejamento de mercado (14/11/2026): revisor de copy (persuasão ética, sem
// manipulação). Regras do capítulo 02 do planejamento, aplicadas a qualquer texto de venda antes
// de publicar: nada de promessa não medida, escassez inventada, depoimento sem fonte ou garantia
// de resultado que não é do Instituto decidir (aprovação de regulador, tribunal, licitação, prova).
//
// Função pura: não decide publicar nada por conta própria. Toda peça de venda ainda passa por
// revisão humana antes de ir ao cliente (capítulo 10, "quem assina").

export interface ProblemaDeCopy {
  termo: string
  motivo: string
}

const REGRAS: { padrao: RegExp; motivo: string }[] = [
  { padrao: /garant/i, motivo: 'promete garantia de resultado — nenhum serviço do Instituto garante resultado de terceiro' },
  { padrao: /zero risco/i, motivo: 'promete "zero risco" — risco jurídico nunca é zero' },
  { padrao: /aprovação garantida/i, motivo: 'promete aprovação de um regulador, tribunal ou licitação — essa decisão não é do Instituto' },
  { padrao: /últim[ao]s?\s+(vaga|chance|unidade)/i, motivo: 'cria escassez sem base real verificável' },
  { padrao: /só hoje|apenas hoje|só até/i, motivo: 'cria urgência artificial sem prazo real' },
  { padrao: /\bo melhor\b|\bo único\b|\bnúmero 1\b/i, motivo: 'superlativo sem fonte que o comprove' },
  { padrao: /\d+%\s+de\s+(sucesso|aprovação|acerto)/i, motivo: 'número de sucesso/aprovação sem fonte — toda estatística precisa de fonte e data' },
]

/**
 * Revisa um texto de venda contra as regras do capítulo 02. Retorna a lista de problemas
 * encontrados (vazia quando o texto passa). Não corrige o texto — só aponta, porque a correção é
 * decisão de quem escreve e de quem assina.
 */
export function revisarTexto(texto: string): ProblemaDeCopy[] {
  const problemas: ProblemaDeCopy[] = []
  for (const regra of REGRAS) {
    const achado = texto.match(regra.padrao)
    if (achado) problemas.push({ termo: achado[0], motivo: regra.motivo })
  }
  return problemas
}

export const textoPassaNaRevisao = (texto: string): boolean => revisarTexto(texto).length === 0

/** Para usar em teste-trava de outros arquivos de copy (posicionamento, caderno, etc). */
export const PADROES_PROIBIDOS = REGRAS.map(r => r.padrao)
