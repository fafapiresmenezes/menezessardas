/**
 * Passo D1 do plano THEYE: a rede de opinião do Instituto, pela única parte que não pode ficar só
 * no documento — o que se coleta, de quem, para quê, por quanto tempo, e o que nunca se faz.
 *
 * O produto inteiro está em rede/D1-rede-social-e-game.md. Aqui fica a lista que a tela de aceite
 * vai ler e que os testes trancam, para a promessa do termo e o comportamento do sistema não se
 * separarem com o tempo.
 */

export type Base = 'consentimento' | 'legitimo_interesse' | 'obrigacao_legal'

export interface Dado {
  o_que: string
  para_que: string
  base: Base
  /** Dias até apagar. null = enquanto a conta existir, e some junto com ela. */
  guardar_dias: number | null
  /** Vai para fora do Instituto em algum agregado? */
  sai_agregado: boolean
}

/** Tudo o que a rede coleta. Se não está aqui, não se coleta: a tela de aceite lê esta lista. */
export const DADOS: Dado[] = [
  { o_que: 'Apelido escolhido por você', para_que: 'Aparecer ao lado do seu voto dentro da rede', base: 'consentimento', guardar_dias: null, sai_agregado: false },
  { o_que: 'E-mail', para_que: 'Entrar na conta e recuperar a senha', base: 'consentimento', guardar_dias: null, sai_agregado: false },
  { o_que: 'Voto em enquete', para_que: 'Formar o resultado da enquete', base: 'consentimento', guardar_dias: 730, sai_agregado: true },
  { o_que: 'Estado (UF) que você informar', para_que: 'Separar o resultado por região', base: 'consentimento', guardar_dias: 730, sai_agregado: true },
  { o_que: 'Faixa etária que você informar', para_que: 'Separar o resultado por faixa e aplicar a regra de menores', base: 'consentimento', guardar_dias: 730, sai_agregado: true },
  { o_que: 'Pontuação no jogo', para_que: 'Mostrar o seu próprio histórico', base: 'consentimento', guardar_dias: 365, sai_agregado: false },
]

/**
 * O que a rede nunca faz, por decisão e não por falta de tempo. Cada linha aqui é um limite
 * permanente do plano, e está trancada em teste.
 */
export const NUNCA = [
  'Não analisa rosto, emoção, mentira nem perfil psicológico de ninguém.',
  'Não vasculha a rede social de ninguém: o que entra é o que a pessoa responde aqui dentro.',
  'Não vende nem entrega o voto de uma pessoa identificada; o que sai do Instituto é sempre agregado.',
  'Não usa nome, imagem nem semelhança de pessoa real no jogo.',
  'Não mostra resultado de enquete com menos de 10 votos, para ninguém reconhecer quem respondeu.',
  'Não faz propaganda eleitoral nem recomenda voto em pessoa ou partido.',
] as const

/** Abaixo deste número de votos, o agregado não sai: com poucos votos, agregado identifica gente. */
export const MINIMO_PARA_AGREGADO = 10

export const IDADE_MINIMA = 16
export const IDADE_SEM_RESPONSAVEL = 18

export type Participacao =
  | { pode: false; motivo: string }
  | { pode: true; exigeResponsavel: boolean; motivo: string }

/**
 * Regra de menores, escrita uma vez e usada em todo lugar: abaixo de 16 não entra; de 16 a 17 entra
 * com responsável; 18 ou mais entra sozinho. A LGPD trata dado de criança e adolescente com
 * cuidado próprio (art. 14), e enquete de opinião política não é lugar para improvisar isso.
 */
export function participacao(idade: number): Participacao {
  if (!Number.isFinite(idade) || idade < 0) return { pode: false, motivo: 'Idade não informada.' }
  if (idade < IDADE_MINIMA) return { pode: false, motivo: `A rede é para quem tem ${IDADE_MINIMA} anos ou mais.` }
  if (idade < IDADE_SEM_RESPONSAVEL) {
    return { pode: true, exigeResponsavel: true, motivo: `De ${IDADE_MINIMA} a ${IDADE_SEM_RESPONSAVEL - 1} anos, é preciso o aceite de quem responde por você.` }
  }
  return { pode: true, exigeResponsavel: false, motivo: 'Maior de idade: o aceite é só seu.' }
}

/** O agregado só sai com votos suficientes. Devolve o motivo quando não sai, para a tela dizer. */
export function podeMostrarAgregado(votos: number): { pode: boolean; motivo: string } {
  return votos >= MINIMO_PARA_AGREGADO
    ? { pode: true, motivo: `${votos} votos.` }
    : { pode: false, motivo: `Precisa de pelo menos ${MINIMO_PARA_AGREGADO} votos; há ${votos}.` }
}

/** Os dados que somem sozinhos, e em quantos dias. O resto some junto com a conta. */
export const comPrazo = (): Dado[] => DADOS.filter(d => d.guardar_dias !== null)

export const saiEmAgregado = (): Dado[] => DADOS.filter(d => d.sai_agregado)

/** Toda coleta precisa de uma finalidade escrita: sem isso, o item não entra na lista. */
export const semFinalidade = (): Dado[] => DADOS.filter(d => !d.para_que.trim())
