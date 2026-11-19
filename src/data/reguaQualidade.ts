/**
 * Régua de qualidade da casa (trilho v2, P14): os 11 parâmetros do sistema de avaliação,
 * com o valor MEDIDO quando a medição já correu e «por medir» quando ainda não.
 * Regra da casa: nenhum número sem medição de verdade — nada aqui é estimativa.
 * Fonte do método: /mnt/project-files/imbono/replaneamento-v2/sistema-avaliacao.md
 */

export interface ParametroQualidade {
  id: string
  nome: string
  meta: string
  valor: string | null // null = ainda não medido
  dataMedicao: string | null // AAAA-MM-DD
  metodo: string
  fonte: { nome: string; url: string }
  nota: 'verde' | 'amarelo' | 'vermelho' | 'por-medir'
}

export const MEDICAO_DE = '2026-11-19'

export const REGUA_QUALIDADE: ParametroQualidade[] = [
  {
    id: 'desempenho',
    nome: 'P1 — Velocidade (Lighthouse)',
    meta: 'Nota de desempenho ≥ 90',
    valor: '91 / 100',
    dataMedicao: '2026-11-19',
    metodo: 'Lighthouse 13.6 a correr contra a versão construída da plataforma (página de entrada), máquina de testes.',
    fonte: { nome: 'Google Lighthouse', url: 'https://developer.chrome.com/docs/lighthouse/overview' },
    nota: 'verde',
  },
  {
    id: 'acessibilidade-lh',
    nome: 'P2 — Acessibilidade (Lighthouse)',
    meta: 'Nota ≥ 90',
    valor: '94 / 100',
    dataMedicao: '2026-11-19',
    metodo: 'Mesma corrida do Lighthouse, categoria de acessibilidade.',
    fonte: { nome: 'Google Lighthouse', url: 'https://developer.chrome.com/docs/lighthouse/overview' },
    nota: 'verde',
  },
  {
    id: 'acessibilidade-axe',
    nome: 'P3 — Acessibilidade WCAG 2.2 AA (axe)',
    meta: '0 falhas nas regras AA',
    valor: '1 tipo de falha (contraste) em 3 páginas; ligações do rodapé já corrigidas; fica por fora a porta discreta da página de entrada, que é quase invisível de propósito',
    dataMedicao: '2026-11-19',
    metodo: 'axe-core 4.10 (regras WCAG 2 A/AA, 2.1 AA e 2.2 AA) nas páginas de entrada, da vitrina e de acesso.',
    fonte: { nome: 'Deque axe-core', url: 'https://github.com/dequelabs/axe-core' },
    nota: 'amarelo',
  },
  {
    id: 'boas-praticas',
    nome: 'P4 — Boas práticas da web (Lighthouse)',
    meta: 'Nota ≥ 90',
    valor: '96 / 100',
    dataMedicao: '2026-11-19',
    metodo: 'Mesma corrida do Lighthouse, categoria de boas práticas.',
    fonte: { nome: 'Google Lighthouse', url: 'https://developer.chrome.com/docs/lighthouse/overview' },
    nota: 'verde',
  },
  {
    id: 'seo',
    nome: 'P5 — Visibilidade nos motores de busca',
    meta: 'Nota ≥ 90',
    valor: '100 / 100',
    dataMedicao: '2026-11-19',
    metodo: 'Mesma corrida do Lighthouse, categoria SEO.',
    fonte: { nome: 'Google Lighthouse', url: 'https://developer.chrome.com/docs/lighthouse/overview' },
    nota: 'verde',
  },
  {
    id: 'seguranca-pacotes',
    nome: 'P6 — Segurança dos pacotes (npm audit)',
    meta: '0 avisos graves nos pacotes que vão para o ar',
    valor: '8 avisos nos pacotes de produção (2 críticos, 4 altos, 2 moderados), a maior parte em peças de mapa e leitura de PDF; plano: actualizar na próxima ronda de manutenção',
    dataMedicao: '2026-11-19',
    metodo: 'npm audit só sobre os pacotes de produção, na versão exacta que a casa usa.',
    fonte: { nome: 'npm audit (documentação oficial)', url: 'https://docs.npmjs.com/cli/v10/commands/npm-audit' },
    nota: 'amarelo',
  },
  {
    id: 'seguranca-asvs',
    nome: 'P7 — Segurança da aplicação (OWASP ASVS nível 2)',
    meta: 'Verificação ASVS L2 sem falhas graves',
    valor: null,
    dataMedicao: null,
    metodo: 'Varrimento OWASP ZAP contra o endereço público + lista de verificação ASVS L2. Precisa de autorização escrita antes de correr contra o ar.',
    fonte: { nome: 'OWASP ASVS', url: 'https://owasp.org/www-project-application-security-verification-standard/' },
    nota: 'por-medir',
  },
  {
    id: 'privacidade',
    nome: 'P8 — Privacidade (LGPD / RGPD)',
    meta: 'Mapa de dados pessoais completo e base legal para cada uso',
    valor: null,
    dataMedicao: null,
    metodo: 'Inventário dos dados pessoais guardados, base legal de cada um e prova de apagamento a pedido. Revisão com apoio humano.',
    fonte: { nome: 'Lei n.º 13.709/2018 (LGPD)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm' },
    nota: 'por-medir',
  },
  {
    id: 'usabilidade-sus',
    nome: 'P9 — Facilidade de uso (escala SUS)',
    meta: 'Pontuação SUS ≥ 80,3 (faixa A)',
    valor: null,
    dataMedicao: null,
    metodo: 'Questionário SUS de 10 perguntas respondido por pessoas reais depois de usarem a plataforma. Precisa de pelo menos 5 respostas.',
    fonte: { nome: 'Brooke, SUS: a quick and dirty usability scale (1996)', url: 'https://digital.ahrq.gov/sites/default/files/docs/survey/systemusabilityscale%2528sus%2529_comp%255B1%255D.pdf' },
    nota: 'por-medir',
  },
  {
    id: 'heuristicas',
    nome: 'P10 — Revisão por heurísticas de Nielsen',
    meta: 'Sem problemas de gravidade 3 ou 4',
    valor: null,
    dataMedicao: null,
    metodo: 'Revisão ecrã a ecrã contra as 10 heurísticas, com gravidade de 0 a 4 por achado.',
    fonte: { nome: 'Nielsen Norman Group — 10 Usability Heuristics', url: 'https://www.nngroup.com/articles/ten-usability-heuristics/' },
    nota: 'por-medir',
  },
  {
    id: 'app-lojas',
    nome: 'P11 — Aplicativo nas lojas (fases B e C)',
    meta: 'Publicado no Google Play e na App Store',
    valor: null,
    dataMedicao: null,
    metodo: 'Fase A (instalar do navegador) já está na plataforma. As lojas precisam das contas de programador (Google US$25 uma vez; Apple US$99/ano) — abertas pelo presidente.',
    fonte: { nome: 'Google Play Console', url: 'https://play.google.com/console/about/' },
    nota: 'por-medir',
  },
]
