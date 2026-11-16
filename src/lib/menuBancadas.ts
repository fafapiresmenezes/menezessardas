/**
 * Menu e rotas para bancadas colaborativas
 */

export const rotasBancadas = {
  listagemPublica: '/bancadas-colaborativas',
  inscricao: '/bancadas-colaborativas',
  contato: 'mailto:bancadas@theye.club'
}

export const menuBancadas = {
  titulo: 'Bancadas Colaborativas',
  descricao: 'Participe como especialista, doutorando ou researcher',
  link: rotasBancadas.listagemPublica,
  icone: 'Users',
  categoria: 'Instituto',
  visivel: true,
  ordenacao: 1
}

/**
 * Área de interesse com emoji para melhor visualização
 */
export const AREAS_COM_EMOJI: Record<string, { titulo: string; emoji: string }> = {
  direito: { titulo: 'Predição Jurídica', emoji: '⚖️' },
  engenharia: { titulo: 'Engenharia', emoji: '🔧' },
  saude: { titulo: 'Saúde', emoji: '🏥' },
  ambiental: { titulo: 'Ambiental', emoji: '🌍' },
  cyber: { titulo: 'Cibersegurança', emoji: '🔒' },
  quantum: { titulo: 'Quantum Computing', emoji: '⚛️' },
  social: { titulo: 'Serviços Sociais', emoji: '🤝' }
}

/**
 * URLs relacionadas
 */
export const urlsBancadas = {
  pagina: '/bancadas-colaborativas',
  email: 'bancadas@theye.club',
  site: 'theye.club/bancadas-colaborativas',
  cnpj: '34.028.316/0001-14'
}

/**
 * Textos padrão para uso na UI
 */
export const textosBancadas = {
  titulo_pagina: 'Bancadas Colaborativas THEYE',
  subtitulo: 'Participe como especialista, doutorando ou researcher',
  cta_principal: 'Inscrever-se nas Bancadas',
  descricao_breve: 'Núcleos colaborativos de pesquisa com profissionais doutores e PhDs',

  tabs: {
    bancadas: 'Bancadas em Formação',
    inscricao: 'Inscrever-se'
  },

  formulario: {
    nome: 'Nome Completo',
    titulo: 'Título Acadêmico/Profissional',
    instituicao: 'Instituição',
    pais: 'País',
    areas: 'Áreas de Interesse',
    cv: 'CV ou LinkedIn',
    email: 'Email de Contato',
    termos: 'Concordo com os termos de participação',
    enviar: 'Inscrever-se',
    enviando: 'Enviando...'
  },

  mensagens: {
    sucesso: 'Inscrição enviada com sucesso! Em breve entraremos em contato.',
    erro_generico: 'Erro ao enviar inscrição. Tente novamente.',
    campos_obrigatorios: 'Por favor, preencha todos os campos obrigatórios.',
    termos_obrigatorios: 'Você deve concordar com os termos para se inscrever.'
  },

  status: {
    preparacao: 'Em Preparação',
    aceitando: 'Aceitando Inscrições',
    operacao: 'Em Operação'
  }
}
