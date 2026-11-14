// Habilidade 2 do replanejamento de mercado (14/11/2026): posicionamento de marca e mensagem
// central para cada uma das 6 famílias do caderno (src/data/caderno-familias.ts).
//
// Regra do próprio capítulo 02 do planejamento, aplicada aqui: nenhuma mensagem promete número não
// medido, nem cria urgência artificial. A "prova exigida" de cada mensagem aponta para uma entrega
// real já descrita no caderno (CADERNO/ESCADA) — nunca para um número inventado.
import { FAMILIAS, CADERNO, type FamiliaId } from './caderno-familias'

export interface PosicionamentoFamilia {
  familia: FamiliaId
  /** A única frase que a família tenta fixar na cabeça de quem compra. Uma promessa, sem adjetivo vazio. */
  mensagemCentral: string
  /** O que esta família sabe fazer que uma banca genérica não entrega pronto (processo, não opinião). */
  diferencial: string
  /** Aponta para uma entrega real do caderno que comprova a mensagem — nunca um número sem fonte. */
  provaExigida: string
  /** O que a mensagem desta família nunca pode dizer. */
  nuncaDizer: string
}

export const POSICIONAMENTO_FAMILIAS: PosicionamentoFamilia[] = [
  {
    familia: 'dados-seguranca',
    mensagemCentral: 'Antes que o titular pergunte ou o incidente aconteça, a organização já sabe o que guarda e o que fazer.',
    diferencial: 'Entrega um inventário de dados e um plano de incidente verificáveis, não um parecer genérico sobre LGPD.',
    provaExigida: 'A primeira entrega do nº 01 (lista dos sistemas que guardam dados) — ESCADA["dados-seguranca"].entrada.',
    nuncaDizer: 'Nunca prometer "zero risco de multa" ou "aprovação garantida" num órgão fiscalizador.',
  },
  {
    familia: 'inteligencia-artificial',
    mensagemCentral: 'Usar inteligência artificial com regra escrita e alguém responsável por ela, antes que a lei exija.',
    diferencial: 'Entrega inventário e regra de supervisão por sistema de IA, não um princípio abstrato de "IA responsável".',
    provaExigida: 'A primeira entrega do nº 09 (lista das áreas que usam IA) — ESCADA["inteligencia-artificial"].entrada.',
    nuncaDizer: 'Nunca prometer que um sistema de IA "nunca vai errar" ou que supervisão humana elimina todo risco.',
  },
  {
    familia: 'bancos',
    mensagemCentral: 'Lançar o produto financeiro ou de ativo digital sabendo exatamente qual regra do Banco Central se aplica, antes de lançar.',
    diferencial: 'Entrega o retrato do produto frente às regras vigentes, não uma opinião sobre o futuro da regulação.',
    provaExigida: 'A primeira entrega do nº 05 (retrato diante das regras) — ESCADA["bancos"].entrada.',
    nuncaDizer: 'Nunca prometer aprovação em sandbox regulatório — essa decisão é do Banco Central, não do Instituto.',
  },
  {
    familia: 'integridade-clima',
    mensagemCentral: 'Comprovar o programa de integridade com prova, não só com um código de conduta guardado na gaveta.',
    diferencial: 'Entrega avaliação de risco mensurável e relatório, não um modelo de código de conduta genérico.',
    provaExigida: 'A primeira entrega do nº 03 (avaliação de riscos) — ESCADA["integridade-clima"].entrada.',
    nuncaDizer: 'Nunca prometer manutenção ou renovação de contrato público — isso depende do órgão contratante, não do programa de integridade.',
  },
  {
    familia: 'leis-conflitos',
    mensagemCentral: 'Saber toda semana o que mudou na lei do seu setor antes que a mudança chegue pronta.',
    diferencial: 'Entrega observatório contínuo com os projetos de lei reais em tramitação, não um resumo genérico de "tendências regulatórias".',
    provaExigida: 'A primeira entrega do nº 12 (diagnóstico dos conflitos repetidos) — ESCADA["leis-conflitos"].entrada.',
    nuncaDizer: 'Nunca prever o resultado de uma votação ou de um julgamento como certeza.',
  },
  {
    familia: 'cursos-estudos',
    mensagemCentral: 'Formar a equipe jurídica no tema novo antes que ele apareça num caso real sem ninguém preparado.',
    diferencial: 'Entrega curso sob encomenda no tema específico da equipe, não um curso de catálogo genérico.',
    provaExigida: 'A segunda entrega do nº 19 (decisões dos tribunais) — ESCADA["cursos-estudos"].entrada.',
    nuncaDizer: 'Nunca prometer aprovação em prova, concurso ou exame como resultado do curso.',
  },
]

export const posicionamentoDaFamilia = (f: FamiliaId): PosicionamentoFamilia => {
  const p = POSICIONAMENTO_FAMILIAS.find(x => x.familia === f)
  if (!p) throw new Error(`Família sem posicionamento: ${f}`)
  return p
}

/** Toda mensagem central deve ter pelo menos uma ficha do caderno que a sustente (prova real, não abstrata). */
export const familiaTemFichaDeProva = (f: FamiliaId): boolean =>
  CADERNO.some(c => c.familia === f)

export { FAMILIAS }
