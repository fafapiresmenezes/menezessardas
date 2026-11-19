/**
 * Estudos para o governo — DEMONSTRAÇÃO, dados inventados. Grafia de Angola.
 * Regra da casa (18/11/2026): nada de predição entra sem calibração provada; o tipo fica fechado.
 * Todo o número vem dos dados de demonstração da própria plataforma; a versão real liga fontes oficiais.
 */
import type { Item } from '@/lib/hierarquiaCorporativa'

export interface TipoEstudo {
  id: string; nome: string; paraQue: string
  fechado?: string // motivo pelo qual ainda não produz estudos
}

export const TIPOS_ESTUDO: TipoEstudo[] = [
  { id: 'impacto', nome: 'Impacto económico', paraQue: 'Quanto um projecto devolve ao país: emprego directo, compras locais e receita pública, sempre com a conta aberta e a fonte de cada número.' },
  { id: 'mercado', nome: 'Mercado e procura', paraQue: 'O que o mercado precisa e quem já serve essa procura, para decidir onde investir, com fontes públicas citadas.' },
  { id: 'sector', nome: 'Nota sectorial', paraQue: 'O retrato de um sector (obras, água, logística): regras aplicáveis pelo número da lei, riscos e prazos típicos.' },
  { id: 'predicao', nome: 'Predição', paraQue: 'Prever prazos e custos a partir do histórico.', fechado: 'Só entra no ar com calibração provada (medida contra casos reais e dentro da meta). Até lá, nenhuma previsão é publicada.' },
]

/** Fontes vivas: dados abertos que alimentam os estudos na versão real. Sem predição; só observação citada. */
export interface FonteViva { id: string; nome: string; oQueDa: string; ondeEntra: string; licenca: string }
export const FONTES_VIVAS: FonteViva[] = [
  { id: 'sentinel', nome: 'Satélites Sentinel (programa Copernicus, União Europeia)', oQueDa: 'Imagens abertas e regulares do terreno: o avanço visível de uma obra, a mancha de água, a estrada a abrir. O Sentinel-1 (radar) vê mesmo com nuvens.', ondeEntra: 'Carteira e Medição (avanço físico observado, lado a lado com o boletim), Estudos de impacto (antes e depois da obra).', licenca: 'Dados abertos Copernicus, uso livre com citação.' },
  { id: 'landsat', nome: 'Landsat (NASA/USGS)', oQueDa: 'Arquivo de décadas de imagens do mesmo lugar: a história do terreno antes do projecto.', ondeEntra: 'Estudos de impacto e notas sectoriais (linha de base histórica).', licenca: 'Domínio público (USGS).' },
  { id: 'gdelt', nome: 'GDELT Project', oQueDa: 'Registo aberto e contínuo de eventos noticiados no mundo, por país e tema: protestos, decisões de governo, acontecimentos económicos, com a ligação a cada notícia.', ondeEntra: 'Riscos e litígios (contexto do país, com a notícia citada) e estudos de mercado. Observação citada, nunca previsão.', licenca: 'Dados abertos, citação ao GDELT Project.' },
]

export interface SeccaoEstudo { titulo: string; corpo: string }
export interface EstudoDemo {
  id: string; tipo: string; titulo: string; data: string; estado: 'exemplo'
  resumo: string
  seccoes: SeccaoEstudo[]
  fontes: string[]
  item: Item
}

export const ESTUDOS_DEMO: EstudoDemo[] = [
  {
    id: 'e1', tipo: 'impacto', titulo: 'Impacto económico da Estrada do Planalto, lote 2 (exemplo)', data: '2026-11-18', estado: 'exemplo',
    resumo: 'Exemplo de estudo de impacto, feito só com os dados de demonstração da plataforma, para mostrar o molde: pergunta, método, contas abertas, limites e fontes.',
    seccoes: [
      { titulo: 'Pergunta', corpo: 'Quanto fica no país do valor contratado da obra, através de pagamentos a fornecedores e de medições executadas?' },
      { titulo: 'Método', corpo: 'Somam-se os pagamentos do projecto por estado (pagos, aprovados, em análise) e compara-se com o valor do contrato. A conta é a mesma que os ecrãs de Pagamentos e Contratos mostram: um facto, uma verdade.' },
      { titulo: 'O que os dados de demonstração dizem', corpo: 'No exemplo, o contrato do lote 2 tem duas medições na fila (uma paga, uma aprovada) e o avanço físico está nos 42%. O estudo real juntaria o emprego directo e as compras locais declaradas pelo empreiteiro.' },
      { titulo: 'Limites', corpo: 'Este exemplo usa apenas dados inventados da demonstração. Não há aqui nenhum número real de Angola: a versão real liga as fontes oficiais listadas em baixo e cada número sai com a fonte ao lado.' },
    ],
    fontes: [
      'Dados de demonstração da própria plataforma (contratos, pagamentos e medições de exemplo).',
      'Na versão real: Instituto Nacional de Estatística de Angola (INE), Banco Nacional de Angola (BNA) e Diário da República, citados número a número.',
      'Regras de contratação pública de Angola citadas pelo número da lei na versão real.',
    ],
    item: { pais: 'AO', setor: 'obra', projeto: 'estrada' },
  },
  {
    id: 'e2', tipo: 'sector', titulo: 'Nota sectorial: água e saneamento em Angola (exemplo)', data: '2026-11-18', estado: 'exemplo',
    resumo: 'Exemplo de nota sectorial com o molde completo, usando o projecto de demonstração da Estação de tratamento de água.',
    seccoes: [
      { titulo: 'Pergunta', corpo: 'Que regras, riscos e prazos típicos deve um investidor esperar num projecto de tratamento de água?' },
      { titulo: 'Método', corpo: 'Parte-se dos riscos e licenças registados na plataforma para o projecto (licença ambiental, caução de garantia) e organiza-se o retrato por tema: licenciamento, garantias, pagamentos.' },
      { titulo: 'O que os dados de demonstração dizem', corpo: 'No exemplo, os dois avisos do projecto são a caução a renovar até 30/11 e a licença ambiental da fase 2: é exactamente o par de temas (garantias e licenciamento) que uma nota sectorial real desenvolveria, com a lei pelo número.' },
      { titulo: 'Limites', corpo: 'Nota de exemplo, sem números reais do sector. A versão real cita a legislação de águas e de ambiente de Angola pelo número e usa dados oficiais com fonte.' },
    ],
    fontes: [
      'Dados de demonstração da própria plataforma (riscos, garantias e licenças de exemplo).',
      'Na versão real: legislação de Angola citada pelo número no Diário da República e dados das autoridades do sector, com fonte em cada número.',
    ],
    item: { pais: 'AO', setor: 'conformidade', projeto: 'agua' },
  },
]
