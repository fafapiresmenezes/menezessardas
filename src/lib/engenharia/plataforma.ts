// Passos E2 e E7 do plano mestre THEYE v4: a mesma plataforma falando engenharia, e os estudos do Instituto
// vendáveis a órgãos públicos. Tudo aqui é demonstração até a separação completa por organização (A28).

export interface Equivalencia { direito: string; engenharia: string; tela: string; explicacao: string }

export const EQUIVALENCIAS: Equivalencia[] = [
  { direito: 'Escritório', engenharia: 'Empresa ou órgão de engenharia', tela: 'Entrada', explicacao: 'Cada empresa vê só os seus projetos, como cada escritório vê só os seus processos.' },
  { direito: 'Meu dia (prazos e intimações)', engenharia: 'Meu dia (marcos de obra, vistorias e entregas)', tela: 'Meu dia', explicacao: 'O que vence hoje: medição, entrega de projeto, vistoria, renovação de ART ou de licença.' },
  { direito: 'Carteira de processos', engenharia: 'Projetos e obras', tela: 'Projetos e obras', explicacao: 'Cada projeto ou obra com cliente, responsável técnico, ART, fase e documentos.' },
  { direito: 'Prazos processuais', engenharia: 'Cronograma físico-financeiro', tela: 'Cronograma', explicacao: 'Etapas, caminho crítico e quanto foi medido e pago em cada uma.' },
  { direito: 'Peças (petições, contratos)', engenharia: 'Memoriais de cálculo, memoriais descritivos e laudos', tela: 'Memoriais e laudos', explicacao: 'O robô redige o rascunho com as contas à vista; o engenheiro confere e assina.' },
  { direito: 'Sócio, gestor, pleno, júnior', engenharia: 'Responsável técnico, coordenador, engenheiro pleno, júnior, estagiário', tela: 'Equipe', explicacao: 'O responsável técnico e o coordenador veem tudo; cada engenheiro vê os seus projetos.' },
  { direito: 'Consultores por matéria do direito', engenharia: 'Consultores por matéria de engenharia', tela: 'Consultores', explicacao: 'Um consultor para cada matéria do catálogo, citando a norma pelo número e mostrando a conta.' },
  { direito: 'OAB e procuração', engenharia: 'Crea, ART e RRT', tela: 'Equipe', explicacao: 'Registro profissional e anotação de responsabilidade técnica de cada trabalho.' },
]

export interface EstudoEngenharia {
  id: string
  nome: string
  tema: 'IA' | 'Cibersegurança' | 'Nuvem' | 'Superinteligência' | 'Dados e geoinformação' | 'Infraestrutura'
  escopo: string
  metodo: string
  semanas: number
  entregavel: string
  contratacao: string
}

const DISPENSA = 'Contratação direta por inexigibilidade, serviço técnico especializado com notória especialização (Lei 14.133/2021, art. 74, III) ou licitação por técnica e preço (art. 36), conforme parecer do braço jurídico.'
const LICITA = 'Licitação por técnica e preço ou melhor técnica (Lei 14.133/2021, arts. 33 a 37), com termo de referência do Instituto.'

export const ESTUDOS_ENGENHARIA: EstudoEngenharia[] = [
  { id: 'ia-inspecao-pontes', nome: 'Inspeção de pontes e viadutos com IA', tema: 'IA', escopo: 'Detecção de fissuras, corrosão e desplacamento em obras de arte especiais a partir de fotos e drone.', metodo: 'Visão computacional treinada com imagens rotuladas por engenheiro; amostra conferida em campo.', semanas: 12, entregavel: 'Mapa de criticidade das obras, laudo por estrutura e plano de manutenção priorizado.', contratacao: DISPENSA },
  { id: 'ia-pavimento', nome: 'Diagnóstico de pavimentos urbanos por imagem', tema: 'IA', escopo: 'Levantamento de defeitos do pavimento em toda a malha municipal.', metodo: 'Câmera veicular e classificação automática dos defeitos; índice de condição por trecho.', semanas: 10, entregavel: 'Inventário georreferenciado, índice por rua e orçamento de restauração.', contratacao: LICITA },
  { id: 'ia-orcamento-obras', nome: 'Auditoria de orçamentos de obras públicas com IA', tema: 'IA', escopo: 'Conferência de planilhas contra SINAPI e SICRO, sobrepreço e jogo de planilha.', metodo: 'Leitura automática de planilhas, comparação com referências oficiais e curva ABC.', semanas: 6, entregavel: 'Relatório de achados por item com economia estimada.', contratacao: DISPENSA },
  { id: 'ia-governanca', nome: 'Política de uso de IA para secretarias de obras', tema: 'IA', escopo: 'Regras de uso de IA em projeto, fiscalização e licitação, com gestão de risco.', metodo: 'Inventário de usos, avaliação de risco pela ISO/IEC 23894 e NIST AI RMF, consulta às equipes.', semanas: 8, entregavel: 'Política, matriz de riscos e plano de capacitação.', contratacao: DISPENSA },
  { id: 'ciber-saneamento', nome: 'Cibersegurança de sistemas de água e esgoto', tema: 'Cibersegurança', escopo: 'Avaliação dos sistemas de automação (SCADA) de captação, tratamento e distribuição.', metodo: 'Mapa de ativos e zonas pela IEC 62443, teste de segmentação e plano de resposta a incidentes.', semanas: 10, entregavel: 'Relatório de maturidade, lista de correções priorizadas e exercício de incidente.', contratacao: LICITA },
  { id: 'ciber-energia', nome: 'Cibersegurança de subestações e iluminação pública', tema: 'Cibersegurança', escopo: 'Redes de telegestão de iluminação e subestações municipais.', metodo: 'IEC 62443 e IEC 61850; revisão de acesso remoto e de fornecedores.', semanas: 8, entregavel: 'Diagnóstico, arquitetura-alvo e cláusulas de segurança para contratos.', contratacao: LICITA },
  { id: 'ciber-obras-dados', nome: 'Proteção de dados em projetos e obras públicas', tema: 'Cibersegurança', escopo: 'Plantas, cadastros e dados pessoais tratados em projetos e fiscalização.', metodo: 'Relatório de impacto pela LGPD, controles da ISO/IEC 27001 e 27701.', semanas: 6, entregavel: 'Relatório de impacto, política de classificação e plano de adequação.', contratacao: DISPENSA },
  { id: 'nuvem-bim', nome: 'Nuvem de governo para BIM e projetos', tema: 'Nuvem', escopo: 'Ambiente comum de dados para projetos em BIM do órgão.', metodo: 'Requisitos pela NBR ISO 19650 e ISO/IEC 27017; comparação de modelos de contratação de nuvem.', semanas: 8, entregavel: 'Arquitetura de referência, termo de referência e estimativa de custo.', contratacao: LICITA },
  { id: 'nuvem-soberania', nome: 'Soberania de dados e continuidade em nuvem', tema: 'Nuvem', escopo: 'Onde ficam os dados de engenharia do órgão e como continuar se o fornecedor falhar.', metodo: 'Inventário de dados, análise de localização e plano de saída.', semanas: 6, entregavel: 'Mapa de dados, plano de continuidade e cláusulas contratuais.', contratacao: DISPENSA },
  { id: 'superint-preparo', nome: 'Preparação institucional para IA avançada e superinteligência', tema: 'Superinteligência', escopo: 'Cenários de IA muito capaz aplicada a infraestrutura crítica e o que o órgão precisa decidir antes.', metodo: 'Cenários prospectivos, mapa de dependências críticas, protocolos de supervisão humana.', semanas: 10, entregavel: 'Relatório de cenários, protocolo de supervisão e plano de capacidades.', contratacao: DISPENSA },
  { id: 'superint-alinhamento', nome: 'Avaliação de agentes de IA antes de operar infraestrutura', tema: 'Superinteligência', escopo: 'Teste de agentes autônomos que propõem ou executam ações em sistemas de engenharia.', metodo: 'Bateria de avaliações de capacidade e de limites, testes em ambiente isolado, critérios de liberação.', semanas: 8, entregavel: 'Relatório de avaliação e critério de liberação por nível de autonomia.', contratacao: DISPENSA },
  { id: 'geo-risco-encostas', nome: 'Mapa de risco de encostas e inundações por satélite', tema: 'Dados e geoinformação', escopo: 'Áreas de risco geológico e hidrológico do município.', metodo: 'Imagens Sentinel e Landsat, modelo digital de terreno, chuva e vistoria por amostragem.', semanas: 12, entregavel: 'Mapa de risco, lista de moradias prioritárias e plano de obras de contenção.', contratacao: LICITA },
  { id: 'gemeo-digital', nome: 'Gêmeo digital de rede de água', tema: 'Infraestrutura', escopo: 'Modelo hidráulico calibrado da rede para reduzir perdas.', metodo: 'Cadastro, macromedição, calibração do modelo e setorização.', semanas: 16, entregavel: 'Modelo calibrado, plano de redução de perdas e indicadores.', contratacao: LICITA },
  { id: 'patrimonio-predial', nome: 'Inspeção predial de prédios públicos', tema: 'Infraestrutura', escopo: 'Escolas, postos de saúde e prédios administrativos.', metodo: 'Inspeção pela NBR 16747 com apoio de IA nas fotos; priorização por risco.', semanas: 10, entregavel: 'Laudos por prédio, matriz de prioridade e orçamento de manutenção.', contratacao: LICITA },
]
