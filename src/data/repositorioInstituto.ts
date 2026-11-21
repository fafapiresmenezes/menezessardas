/**
 * Fase F4 do plano v2 (passo F4-01): o Repositório da área administrativa.
 *
 * Um lugar só que junta as sete peças de conhecimento do Instituto: Atlas, biblioteca,
 * agentes, white papers, benchmarks, universidades e bancos de dados. A regra do passo é dura:
 * cada peça com a licença à vista e com link à fonte. Por isso este arquivo diz, de cada bloco,
 * o que JÁ está no repositório e o que ainda falta trazer — com honestidade, sem inventar fonte.
 *
 * Um bloco só fica "pronto" quando a peça dele existe de verdade e aponta para a origem. O que
 * depende de importar de fora (o Atlas do computador de M, a biblioteca de 2.779 itens) fica
 * "a trazer", dizendo exatamente o que falta, em vez de aparecer como pronto vazio.
 */
import { AGENTES_ADMINISTRACAO } from './agentesAdministracao'
import agentesInstituto from './agentes-instituto.json'

export type EstadoBloco = 'pronto' | 'parcial' | 'a-trazer'

export interface BlocoRepositorio {
  chave: string
  titulo: string
  resumo: string
  estado: EstadoBloco
  /** Quantas peças já estão no repositório, quando dá para contar. */
  contagem?: number
  /** O que ainda falta para o bloco ficar completo, dito sem rodeio. */
  oQueFalta?: string
  /** Para onde a pessoa vai ver a peça viva, quando ela já existe. */
  rotaViva?: string
  /** A fonte/licença da peça, à vista como o passo exige. */
  fonte?: string
}

const totalAgentes = AGENTES_ADMINISTRACAO.length + (agentesInstituto.total ?? 0)

export const BLOCOS_REPOSITORIO: BlocoRepositorio[] = [
  {
    chave: 'agentes',
    titulo: 'Agentes',
    resumo: 'As fichas dos agentes: os 20 da administração e o catálogo com ementa acadêmica.',
    estado: 'pronto',
    contagem: totalAgentes,
    rotaViva: '/gestao-instituto?aba=agentes',
    fonte: 'Fichas versionadas no repositório (src/data/agentes) e catálogo com ementa por fonte aberta.',
  },
  {
    chave: 'atlas',
    titulo: 'Atlas',
    resumo: 'O Atlas-MVP do Instituto, a base ontológica de onde o resto se liga.',
    estado: 'a-trazer',
    oQueFalta: 'Copiar ATLAS_MVP_COMPLETO.txt e CATALOGO_FONTES.csv do computador de M, com hash e sem alterar o original. Depende de M autorizar o acesso ao computador dele.',
    fonte: 'Original no computador de M; nunca modificado, só copiado com hash.',
  },
  {
    chave: 'biblioteca',
    titulo: 'Biblioteca',
    resumo: 'A biblioteca de artigos de acesso aberto, com licença e nicho em cada item.',
    estado: 'a-trazer',
    oQueFalta: 'Trazer biblioteca-v1.json (2.779 itens de acesso aberto) e estender com licença CC-BY/MIT, resumo curto e nicho (biblioteca-v2). Preservar o v1.',
    fonte: 'OpenAlex, arXiv, Zenodo — só acesso aberto, licença por item.',
  },
  {
    chave: 'white-papers',
    titulo: 'White papers',
    resumo: 'Os estudos de referência lidos e resumidos para formar o produto, sem copiar.',
    estado: 'a-trazer',
    oQueFalta: 'É a fase F6 inteira (105 estudos, 15 passos × 7). Cada estudo entra com resumo próprio, licença e atribuição — nunca cópia.',
    fonte: 'Cada white paper com a sua licença e a sua atribuição.',
  },
  {
    chave: 'bench',
    titulo: 'Benchmarks',
    resumo: 'As melhores ferramentas de cada nicho, o que cada uma faz e se valeu.',
    estado: 'a-trazer',
    oQueFalta: 'É a fase F5 (as 10 melhores ferramentas de cada um dos 10 nichos). Cada ferramenta com o que faz, quanto cobra, de quem é e a fonte.',
    fonte: 'Cada ferramenta com a sua página de origem.',
  },
  {
    chave: 'universidades',
    titulo: 'Universidades',
    resumo: 'O mapa das universidades de referência que alimentam as fichas dos agentes.',
    estado: 'a-trazer',
    oQueFalta: 'Montar o mapa das universidades citadas, cada uma com a área e a fonte. Hoje elas aparecem dentro das fichas dos agentes, ainda não num mapa só.',
    fonte: 'Página oficial de cada universidade.',
  },
  {
    chave: 'bancos',
    titulo: 'Bancos de dados',
    resumo: 'Os bancos de dados de alta qualidade que os agentes consultam, por região e área.',
    estado: 'a-trazer',
    oQueFalta: 'Montar o catálogo (nome, url, região, categoria, licença, forma de acesso). Hoje eles aparecem dentro das fichas dos agentes, ainda não num catálogo buscável; cada linha entra só com fonte verificada.',
    fonte: 'Página oficial de cada banco de dados.',
  },
]

export const ROTULO_BLOCO: Record<EstadoBloco, string> = {
  'pronto': 'No repositório',
  'parcial': 'Em parte',
  'a-trazer': 'A trazer',
}
