/**
 * Ajudante "como faço": pedido de M em 13/11/2026 — um lugar onde qualquer pessoa pergunta como
 * se faz uma coisa na plataforma, e que vai acumulando aprendizado.
 *
 * Duas decisões que vale dizer por escrito:
 *
 * 1. A RESPOSTA NÃO É INVENTADA. O ajudante não chama modelo de linguagem nenhum: ele procura
 *    dentro do que a plataforma já diz de si mesma — a dica de cada tela, os passos do tour de
 *    cada tela e o glossário jurídico. Assim ele nunca ensina um caminho que não existe, responde
 *    na hora, não custa nada por pergunta e funciona com a internet ruim. Quando não acha, ele diz
 *    que não achou, em vez de encher linguiça.
 *
 * 2. O APRENDIZADO É O DA CASA, não o de um modelo. Cada pergunta fica guardada, em
 *    `configuracoes.ajudante_aprendizado`, com quantas vezes foi feita, se o ajudante achou
 *    resposta e se quem perguntou disse que resolveu. Com isso a tela mostra o que a equipe mais
 *    pergunta e, para a administração, a lista do que ninguém conseguiu responder — que é a fila
 *    do que falta explicar na plataforma. A chave é por escritório, como todas as outras.
 */
import { DICAS, gruposMenu, nomeDaTela } from '@/components/menuTelas'
import { TOURS } from '@/data/tours'
import { GLOSSARIO } from '@/data/glossario'
import { lerConfig, gravarConfig } from './config'
import { supabaseConfigurado } from './supabase'

export type Origem = 'tela' | 'passo' | 'palavra'
export interface Item { titulo: string; texto: string; rota?: string; origem: Origem }
export interface Resposta extends Item { pontos: number }

export const CHAVE_APRENDIZADO = 'ajudante_aprendizado'
const LIMITE_GUARDADO = 300

/** Palavras que aparecem em quase toda pergunta e não ajudam a escolher a resposta. */
const VAZIAS = new Set(['a','o','as','os','de','da','do','das','dos','em','no','na','nos','nas','um','uma','uns','umas','para','pra','por','com','sem','que','qual','quais','quando','onde','como','faco','faço','fazer','eu','meu','minha','seu','sua','isso','isto','e','ou','se','ao','aos','à','às','the','of'])

export const normalizar = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()

const palavras = (s: string): string[] =>
  normalizar(s).split(' ').filter(p => p.length > 2 && !VAZIAS.has(p))

/** Tudo o que a plataforma já diz de si mesma, numa lista só. */
export function baseDeConhecimento(): Item[] {
  const itens: Item[] = []
  for (const [rota, dica] of Object.entries(DICAS))
    itens.push({ titulo: nomeDaTela(rota) ?? rota, texto: dica, rota, origem: 'tela' })
  for (const [rota, tour] of Object.entries(TOURS))
    for (const passo of tour.passos)
      itens.push({ titulo: `${tour.nome}: ${passo.titulo}`, texto: passo.texto, rota, origem: 'passo' })
  for (const [termo, explicacao] of Object.entries(GLOSSARIO))
    itens.push({ titulo: termo, texto: explicacao, origem: 'palavra' })
  return itens
}

/**
 * Procura a pergunta na base. Pontua palavra no título mais alto do que no texto, porque o título
 * é o nome da tela ou do passo, e é por ele que a pessoa costuma perguntar.
 */
export function procurar(pergunta: string, limite = 5): Resposta[] {
  const termos = palavras(pergunta)
  if (!termos.length) return []
  const saida: Resposta[] = []
  for (const item of baseDeConhecimento()) {
    const t = normalizar(item.titulo)
    const x = normalizar(item.texto)
    let pontos = 0
    for (const termo of termos) {
      if (t.includes(termo)) pontos += 3
      if (x.includes(termo)) pontos += 1
    }
    if (pontos > 0) saida.push({ ...item, pontos })
  }
  return saida.sort((a, b) => b.pontos - a.pontos || a.titulo.localeCompare(b.titulo)).slice(0, limite)
}

/** Os nomes das telas, para a tela do ajudante oferecer exemplos de pergunta. */
export const exemplosDePergunta = (): string[] =>
  gruposMenu.flatMap(g => g.itens).slice(0, 6).map(i => `Como uso ${i.label}?`)

export interface Aprendido { pergunta: string; vezes: number; achou: boolean; resolveu: number; naoResolveu: number }

export async function lerAprendizado(): Promise<Aprendido[]> {
  if (!supabaseConfigurado) return []
  try {
    const c = await lerConfig([CHAVE_APRENDIZADO])
    const lista = c[CHAVE_APRENDIZADO] ? JSON.parse(c[CHAVE_APRENDIZADO]) : []
    return Array.isArray(lista) ? (lista as Aprendido[]).filter(a => a && typeof a.pergunta === 'string') : []
  } catch { return [] }
}

/** Soma esta pergunta ao que o escritório já perguntou. Nunca guarda quem perguntou. */
export async function registrarPergunta(pergunta: string, achou: boolean, resolveu?: boolean): Promise<Aprendido[]> {
  const texto = normalizar(pergunta)
  if (!texto) return lerAprendizado()
  const lista = await lerAprendizado()
  const atual = lista.find(a => normalizar(a.pergunta) === texto)
  if (atual) {
    atual.vezes += 1
    atual.achou = achou
    if (resolveu === true) atual.resolveu += 1
    if (resolveu === false) atual.naoResolveu += 1
  } else {
    lista.push({ pergunta: pergunta.trim().slice(0, 160), vezes: 1, achou, resolveu: resolveu === true ? 1 : 0, naoResolveu: resolveu === false ? 1 : 0 })
  }
  const guardar = lista.sort((a, b) => b.vezes - a.vezes).slice(0, LIMITE_GUARDADO)
  try { await gravarConfig({ [CHAVE_APRENDIZADO]: JSON.stringify(guardar) }) } catch { /* sem permissão de gravar: a resposta já foi dada */ }
  return guardar
}

/** O que a equipe mais pergunta e o ajudante conseguiu responder. */
export const maisPerguntadas = (lista: Aprendido[], n = 5): Aprendido[] =>
  lista.filter(a => a.achou).sort((a, b) => b.vezes - a.vezes).slice(0, n)

/** A fila do que falta explicar: perguntas sem resposta, ou que não resolveram. */
export const semResposta = (lista: Aprendido[], n = 10): Aprendido[] =>
  lista.filter(a => !a.achou || a.naoResolveu > a.resolveu).sort((a, b) => b.vezes - a.vezes).slice(0, n)
