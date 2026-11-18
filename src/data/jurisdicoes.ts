/**
 * Leis e normas por país, como DADOS e não como código (decisão de M em 16/11/2026: acrescentar um país
 * é acrescentar linhas aqui, sem programar). Pedido de 18/11/2026: a casa de fundos internacionais trabalha em vários países.
 * Só entram diplomas identificados por número e ano. Isto é um índice de partida para a equipa jurídica:
 * a versão em vigor e as alterações posteriores têm de ser conferidas por advogado do país antes de usar.
 */
export type Tema = 'contratos_publicos' | 'obra' | 'dados' | 'anticorrupcao' | 'arbitragem' | 'investimento'

export const rotuloTema: Record<Tema, string> = {
  contratos_publicos: 'Contratos públicos', obra: 'Contratos de obra', dados: 'Protecção de dados',
  anticorrupcao: 'Anticorrupção e branqueamento', arbitragem: 'Arbitragem', investimento: 'Investimento',
}

export interface Norma { tema: Tema; nome: string; referencia: string }
export interface Jurisdicao { id: string; nome: string; moeda: string; lingua: string; normas: Norma[] }

export const JURISDICOES: Jurisdicao[] = [
  {
    id: 'AO', nome: 'Angola', moeda: 'Kwanza (Kz)', lingua: 'Português',
    normas: [
      { tema: 'contratos_publicos', nome: 'Lei dos Contratos Públicos', referencia: 'Lei n.º 41/20, de 23 de Dezembro' },
      { tema: 'investimento', nome: 'Lei do Investimento Privado', referencia: 'Lei n.º 10/18, de 26 de Junho' },
      { tema: 'dados', nome: 'Lei da Protecção de Dados Pessoais', referencia: 'Lei n.º 22/11, de 17 de Junho' },
      { tema: 'anticorrupcao', nome: 'Prevenção e combate ao branqueamento de capitais', referencia: 'Lei n.º 5/20, de 27 de Janeiro' },
      { tema: 'arbitragem', nome: 'Lei da Arbitragem Voluntária', referencia: 'Lei n.º 16/03, de 25 de Julho' },
    ],
  },
  {
    id: 'NA', nome: 'Namíbia', moeda: 'Dólar namibiano (N$)', lingua: 'Inglês',
    normas: [
      { tema: 'contratos_publicos', nome: 'Public Procurement Act', referencia: 'Act 15 of 2015' },
      { tema: 'anticorrupcao', nome: 'Anti-Corruption Act', referencia: 'Act 8 of 2003' },
      { tema: 'anticorrupcao', nome: 'Financial Intelligence Act', referencia: 'Act 13 of 2012' },
    ],
  },
  {
    id: 'BR', nome: 'Brasil', moeda: 'Real (R$)', lingua: 'Português',
    normas: [
      { tema: 'contratos_publicos', nome: 'Lei de Licitações e Contratos Administrativos', referencia: 'Lei n.º 14.133/2021' },
      { tema: 'dados', nome: 'Lei Geral de Proteção de Dados', referencia: 'Lei n.º 13.709/2018' },
      { tema: 'anticorrupcao', nome: 'Lei Anticorrupção', referencia: 'Lei n.º 12.846/2013' },
    ],
  },
  {
    id: 'PT', nome: 'Portugal e União Europeia', moeda: 'Euro (€)', lingua: 'Português',
    normas: [
      { tema: 'contratos_publicos', nome: 'Código dos Contratos Públicos', referencia: 'Decreto-Lei n.º 18/2008' },
      { tema: 'dados', nome: 'Regulamento Geral sobre a Protecção de Dados', referencia: 'Regulamento (UE) 2016/679' },
    ],
  },
  {
    id: 'GLOBAL', nome: 'Regras globais', moeda: 'Dólar (US$) e euro (€)', lingua: 'Inglês',
    normas: [
      { tema: 'obra', nome: 'Modelos de contrato FIDIC (livros vermelho, amarelo e prateado)', referencia: 'Edição de 2017' },
      { tema: 'anticorrupcao', nome: 'UK Bribery Act', referencia: 'Reino Unido, 2010' },
      { tema: 'anticorrupcao', nome: 'Foreign Corrupt Practices Act', referencia: 'Estados Unidos, 1977' },
      { tema: 'anticorrupcao', nome: 'Sistemas de gestão antissuborno', referencia: 'ISO 37001' },
      { tema: 'arbitragem', nome: 'Convenção de Nova Iorque sobre sentenças arbitrais estrangeiras', referencia: '1958' },
    ],
  },
]
