import { supabase } from '@/lib/supabase'

export interface InscricaoBancada {
  nome_completo: string
  titulo_academico: string
  instituicao: string
  pais: string
  areas_interesse: string[]
  cv_linkedin: string
  email: string
  concorda_termos: boolean
  data_inscricao?: string
}

export async function salvarInscricaoBancada(inscricao: InscricaoBancada): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('bancadas_inscritos')
      .insert([{
        nome_completo: inscricao.nome_completo,
        titulo_academico: inscricao.titulo_academico,
        instituicao: inscricao.instituicao,
        pais: inscricao.pais,
        areas_interesse: inscricao.areas_interesse,
        cv_linkedin: inscricao.cv_linkedin,
        email: inscricao.email,
        concorda_termos: inscricao.concorda_termos,
        data_inscricao: new Date().toISOString()
      }])

    if (error) {
      console.error('Erro ao salvar inscrição:', error)
      return false
    }
    return true
  } catch (e) {
    console.error('Erro inesperado:', e)
    return false
  }
}

export const AREAS_BANCADAS = [
  'direito',
  'engenharia',
  'saude',
  'ambiental',
  'cyber',
  'quantum',
  'social'
] as const

export const STATUS_BANCADAS = {
  preparacao: 'Preparação',
  aceitando: 'Aceitando Inscrições',
  operacao: 'Em Operação'
}

export const DESCRICOES_BANCADAS: Record<string, { titulo: string; descricao: string; status: keyof typeof STATUS_BANCADAS }> = {
  direito: {
    titulo: 'Bancada de Predição Jurídica',
    descricao: 'Aplicações de IA em predição de desfechos judiciais, análise jurisprudencial e conformidade legal.',
    status: 'aceitando'
  },
  engenharia: {
    titulo: 'Bancada de Engenharia',
    descricao: 'Pesquisa em otimização de processos, simulação computacional e inovação em sistemas de engenharia.',
    status: 'aceitando'
  },
  saude: {
    titulo: 'Bancada de Saúde',
    descricao: 'Estudos em predição de diagnósticos, epidemiologia computacional e análise de dados clínicos.',
    status: 'preparacao'
  },
  ambiental: {
    titulo: 'Bancada Ambiental',
    descricao: 'Modelagem climática, detecção de anomalias ambientais e sustentabilidade baseada em dados.',
    status: 'preparacao'
  },
  cyber: {
    titulo: 'Bancada de Cibersegurança',
    descricao: 'LGPD, detecção de anomalias, criptografia pós-quântica e segurança de dados.',
    status: 'aceitando'
  },
  quantum: {
    titulo: 'Bancada de Quantum Computing',
    descricao: 'Simulação quântica, otimização e criptografia pós-quântica.',
    status: 'preparacao'
  },
  social: {
    titulo: 'Bancada de Serviços Sociais',
    descricao: 'Aplicações de IA para impacto social, análise de políticas públicas e dados de saúde social.',
    status: 'operacao'
  }
}

// Template de email para empresas já contactadas e novos contatos
export const emailBancadasTemplate = `
Detalhe adicional:

O Instituto está formando BANCADAS E NÚCLEOS COLABORATIVOS com profissionais doutores e PhDs.
Esses núcleos funcionam como consórcios colaborativos onde profissionais:
- NÃO precisam fazer parte do estatuto legal (legislação brasileira permite)
- Podem se chancelar com seus nomes/credenciais
- Assinam contratos específicos por projeto (temporário, direto, ou conforme a necessidade)
- Trabalham de forma colaborativa e transparente

Se você ou sua instituição deseja participar das bancadas de pesquisa em:
- Predição Jurídica
- Engenharia
- Saúde
- Ambiental
- Cibersegurança
- Quantum Computing
- Serviços Sociais

Favor contactar: bancadas@theye.club

Toda participação é rastreada por smart contract para transparência total.
`

// Template para empresas de IA
export const emailEmpresasIATemplate = (nomeEmpresa: string): string => `
Assunto: [CNPJ Instituto] — Participação em Pesquisa Colaborativa (Non-Profit) — Cybersecurity, Quantum Computing

Prezados,

O Instituto de Ontologia com Soluções Multidisciplinares é uma instituição non-profit brasileira
dedicada a pesquisa colaborativa em áreas estratégicas:

- Cybersecurity (LGPD, detecção de anomalias)
- Quantum Computing (simulação, otimização, criptografia pós-quântica)
- Predição (jurídica, saúde, ambiental, financeira)

Estamos convidando a ${nomeEmpresa} para:
1. Fornecer créditos de API/compute para pesquisa
2. Participar de nossa banca colaborativa (smart contract, transparência total)
3. Acessar resultados de pesquisa em tempo real

Modelo: Consórcio colaborativo, sem fins lucrativos, com pesquisadores doutores/PhDs de universidades
brasileiras e internacionais.

Visite: theye.club/bancadas-colaborativas

CNPJ: 34.028.316/0001-14
Email: contato@theye.club

Agradecemos pela consideração.
`
