// Erro #8 do planejamento (capítulo 10): o caderno tinha 21 serviços em 11 eixos, com títulos no
// formato do serviço e cheios de sigla. Aqui estão os 21 reorganizados em 6 FAMÍLIAS, com o nome, a
// promessa e o "o que levar à conversa" escritos pela dor de quem compra — tudo tirado do capítulo 10,
// sem inventar entrega nem número. A tela do caderno (atrás de senha) usa estes dados.
//
// "quem assina": decisão de M (14/11/2026) — mostrar o perfil ideal + "equipe em formação", sem
// inventar nome. Texto único e honesto em QUEM_ASSINA.

export const FAMILIAS = [
  { id: 'dados-seguranca', nome: 'Dados e segurança', descricao: 'Proteção de dados pessoais e segurança digital, do inventário ao plano de incidente.' },
  { id: 'inteligencia-artificial', nome: 'Inteligência artificial', descricao: 'Uso de inteligência artificial com regra escrita e pessoa supervisionando.' },
  { id: 'bancos', nome: 'Bancos e ativos digitais', descricao: 'Pagamentos, criptoativos e dados financeiros dentro das regras do Banco Central.' },
  { id: 'integridade-clima', nome: 'Integridade e clima', descricao: 'Programas contra corrupção e risco jurídico de clima e sustentabilidade.' },
  { id: 'leis-conflitos', nome: 'Leis e conflitos', descricao: 'Acompanhamento de leis em discussão e soluções de conflito antes do processo.' },
  { id: 'cursos-estudos', nome: 'Cursos e estudos', descricao: 'Formações sob encomenda e estudos jurídicos assinados.' },
] as const

export type FamiliaId = (typeof FAMILIAS)[number]['id']

/** Texto honesto do campo "quem assina", escolhido por M em 14/11/2026 (opção A). */
export const QUEM_ASSINA =
  'Um profissional habilitado, com nome, formação e registro na proposta, antes de qualquer pagamento. A equipe do Instituto está em formação.'

export type FichaCaderno = {
  numero: number
  familia: FamiliaId
  /** Nome pela dor do cliente, sem sigla nem número de lei. */
  nome: string
  /** O que muda e em quanto tempo; uma linha, sem "garantimos". */
  promessa: string
  /** O que o comprador leva à conversa de escopo. */
  leve: string
  /** Marca o que alguém tem de provar antes de publicar ("precisa de lastro"). */
  precisaLastro: boolean
}

export const CADERNO: FichaCaderno[] = [
  // Dados e segurança
  { numero: 1, familia: 'dados-seguranca', nome: 'Dados do cidadão em ordem', promessa: 'O órgão sabe que dados guarda, onde está o risco e o que fazer.', leve: 'A lista dos sistemas que guardam dados de cidadãos.', precisaLastro: false },
  { numero: 18, familia: 'dados-seguranca', nome: 'Preparo legal para vazamento de dados', promessa: 'O que a lei exige e quem faz o quê num incidente.', leve: 'Os contratos com fornecedores de tecnologia.', precisaLastro: true },
  { numero: 21, familia: 'dados-seguranca', nome: 'Sigilo à prova de computador quântico', promessa: 'Plano para trocar as cifras antes que um computador quântico as abra.', leve: 'A lista de sistemas com assinatura digital.', precisaLastro: true },
  // Inteligência artificial
  { numero: 4, familia: 'inteligencia-artificial', nome: 'Inteligência artificial no tribunal, com regra', promessa: 'Que usos o tribunal pode manter, com que regra e quem supervisiona.', leve: 'A lista das ferramentas em uso.', precisaLastro: true },
  { numero: 9, familia: 'inteligencia-artificial', nome: 'Inventário e risco da inteligência artificial', promessa: 'Que sistemas a organização tem, o risco de cada um e o que ajustar antes da lei.', leve: 'A lista das áreas que usam.', precisaLastro: true },
  { numero: 11, familia: 'inteligencia-artificial', nome: 'Ouvidoria com inteligência artificial supervisionada', promessa: 'O desenho de uma ouvidoria que usa inteligência artificial com pessoa conferindo.', leve: 'O volume mensal de pedidos.', precisaLastro: false },
  { numero: 20, familia: 'inteligencia-artificial', nome: 'Teste supervisionado pela autoridade de dados', promessa: 'Apoio da candidatura ao último relatório, no programa de testes da autoridade.', leve: 'A descrição do sistema a testar.', precisaLastro: false },
  // Bancos e ativos digitais
  { numero: 2, familia: 'bancos', nome: 'Teste supervisionado pelo Banco Central', promessa: 'O estudo que sustenta a candidatura ao ambiente de testes.', leve: 'Um resumo do produto a testar.', precisaLastro: true },
  { numero: 5, familia: 'bancos', nome: 'Regras internas para operar criptoativos', promessa: 'Normas, contratos e controles alinhados às regras do Banco Central.', leve: 'Os contratos e normas internas atuais.', precisaLastro: true },
  { numero: 10, familia: 'bancos', nome: 'Dados financeiros compartilhados dentro da regra', promessa: 'O que três reguladores exigem de quem compartilha dados de clientes.', leve: 'O termo de uso e autorização atuais.', precisaLastro: false },
  { numero: 16, familia: 'bancos', nome: 'Recebíveis, imóveis e carbono em ativo digital', promessa: 'Como transformar esses bens em ativo digital dentro das regras.', leve: 'A descrição do ativo e do emissor.', precisaLastro: true },
  // Integridade e clima
  { numero: 3, familia: 'integridade-clima', nome: 'Programa de integridade que se comprova', promessa: 'Um programa contra corrupção montado, em uso e medido.', leve: 'O código de conduta e contratos públicos atuais.', precisaLastro: true },
  { numero: 13, familia: 'integridade-clima', nome: 'Risco de ação judicial sobre clima', promessa: 'As ações sobre clima, no Brasil e fora, e o risco para a organização.', leve: 'As atividades e regiões que preocupam.', precisaLastro: false },
  { numero: 17, familia: 'integridade-clima', nome: 'Sustentabilidade com base legal', promessa: 'Regras, relatórios e papéis do conselho para as exigências do Brasil e da Europa.', leve: 'O último relatório de sustentabilidade.', precisaLastro: false },
  // Leis e conflitos
  { numero: 7, familia: 'leis-conflitos', nome: 'Observatório das leis do seu setor', promessa: 'Toda semana, o que andou nos projetos de lei do setor.', leve: 'Os três temas que mais preocupam.', precisaLastro: false },
  { numero: 8, familia: 'leis-conflitos', nome: 'Plataformas digitais: como outros países regulam', promessa: 'A lei europeia, a britânica e a proposta brasileira, lado a lado.', leve: 'A pergunta do estudo.', precisaLastro: true },
  { numero: 12, familia: 'leis-conflitos', nome: 'Acordo antes do processo', promessa: 'Regras de mediação e conciliação para os assuntos que mais geram processo.', leve: 'Os cinco assuntos com mais processos.', precisaLastro: false },
  { numero: 15, familia: 'leis-conflitos', nome: 'Núcleo de causas de interesse público', promessa: 'Um núcleo permanente para atuar sem cobrar em causas de direitos fundamentais.', leve: 'As causas que a organização apoia.', precisaLastro: false },
  // Cursos e estudos
  { numero: 6, familia: 'cursos-estudos', nome: 'Direito digital para a equipe jurídica', promessa: 'Curso de 60 a 120 horas, com aulas ao vivo.', leve: 'O número de alunos e os temas.', precisaLastro: true },
  { numero: 14, familia: 'cursos-estudos', nome: 'Formação em arbitragem de tributos', promessa: 'Curso de 80 a 120 horas sobre arbitragem de tributos.', leve: 'O número de alunos e a experiência.', precisaLastro: true },
  { numero: 19, familia: 'cursos-estudos', nome: 'Estudo jurídico sob encomenda', promessa: 'Um estudo assinado para sustentar uma tese, uma defesa ou uma posição pública.', leve: 'A pergunta e o prazo do caso.', precisaLastro: true },
]

/** A escada de compra de cada família (capítulo 10): entrada, principal, programa anual. */
export const ESCADA: Record<FamiliaId, { entrada: string; principal: string; anual: string }> = {
  'dados-seguranca': { entrada: 'Lista dos dados guardados (1ª entrega do nº 01)', principal: 'Dados do cidadão em ordem (01) ou Preparo para vazamento (18)', anual: 'Observatório (07) no tema de dados' },
  'inteligencia-artificial': { entrada: 'Lista dos sistemas em uso (1ª entrega do nº 09)', principal: 'Inventário e risco (09) ou IA no tribunal (04)', anual: 'Teste pela autoridade (20), por ciclo' },
  'bancos': { entrada: 'Retrato diante das regras (1ª entrega do nº 05)', principal: 'Regras de criptoativos (05) ou Teste no Banco Central (02)', anual: 'Observatório (07) no tema financeiro' },
  'integridade-clima': { entrada: 'Avaliação de riscos (1ª entrega do nº 03)', principal: 'Programa de integridade (03) ou Sustentabilidade com base legal (17)', anual: 'Relatório anual (5ª entrega do 03)' },
  'leis-conflitos': { entrada: 'Diagnóstico dos conflitos repetidos (1ª entrega do nº 12)', principal: 'Acordo antes do processo (12) ou Regulação comparada (08)', anual: 'Observatório (07) e Núcleo (15), anuais e renováveis' },
  'cursos-estudos': { entrada: 'Decisões dos tribunais (2ª entrega do nº 19)', principal: 'Estudo sob encomenda (19)', anual: 'Uma turma por ano (06 ou 14)' },
}

export const familiasComProdutos = () =>
  FAMILIAS.map(f => ({ ...f, fichas: CADERNO.filter(c => c.familia === f.id) }))
