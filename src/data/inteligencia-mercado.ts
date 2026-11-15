// Habilidade 6 do replanejamento de mercado (14/11/2026): fontes de inteligência de mercado
// brasileiro por família — reguladores e bases públicas de onde vêm os fatos que sustentam ICP,
// posicionamento e observatório (não a lista de sinais de mercado em si, que já está nas
// habilidades 1 e 2; isto é o registro de ONDE conferir cada uma, e QUANDO foi conferida, para
// nunca citar número de mercado sem fonte e sem data, como o capítulo 02 exige).
import { FAMILIAS, type FamiliaId } from './caderno-familias'

export interface FonteDeMercado {
  nome: string
  url: string
  oQueDa: string
  /** Data em que esta fonte foi conferida pela última vez (ISO curto, aaaa-mm-dd). */
  conferidaEm: string
}

export const FONTES_POR_FAMILIA: Record<FamiliaId, FonteDeMercado[]> = {
  'dados-seguranca': [
    { nome: 'ANPD (Autoridade Nacional de Proteção de Dados)', url: 'https://www.gov.br/anpd', oQueDa: 'Resoluções, sanções e relatórios de fiscalização em LGPD.', conferidaEm: '2026-11-14' },
  ],
  'inteligencia-artificial': [
    { nome: 'CNJ (Conselho Nacional de Justiça)', url: 'https://www.cnj.jus.br', oQueDa: 'Resoluções sobre uso de inteligência artificial no Judiciário.', conferidaEm: '2026-11-14' },
    { nome: 'ANPD (Autoridade Nacional de Proteção de Dados)', url: 'https://www.gov.br/anpd', oQueDa: 'Programa de testes (sandbox regulatório) de sistemas de IA.', conferidaEm: '2026-11-14' },
  ],
  'bancos': [
    { nome: 'Banco Central do Brasil (BCB)', url: 'https://www.bcb.gov.br', oQueDa: 'Regulamentação de ativos virtuais, sandbox regulatório, normas de compartilhamento de dados financeiros.', conferidaEm: '2026-11-14' },
  ],
  'integridade-clima': [
    { nome: 'CGU (Controladoria-Geral da União)', url: 'https://www.gov.br/cgu', oQueDa: 'Regras de programa de integridade para contratação pública.', conferidaEm: '2026-11-14' },
  ],
  'leis-conflitos': [
    { nome: 'Câmara dos Deputados', url: 'https://www.camara.leg.br', oQueDa: 'Tramitação de projetos de lei por setor.', conferidaEm: '2026-11-14' },
    { nome: 'Senado Federal', url: 'https://www25.senado.leg.br', oQueDa: 'Tramitação de projetos de lei por setor.', conferidaEm: '2026-11-14' },
  ],
  'cursos-estudos': [
    { nome: 'CNJ (Conselho Nacional de Justiça) — jurisprudência', url: 'https://www.cnj.jus.br', oQueDa: 'Decisões dos tribunais sobre o tema do curso ou estudo.', conferidaEm: '2026-11-14' },
  ],
}

export const fontesDaFamilia = (f: FamiliaId): FonteDeMercado[] => FONTES_POR_FAMILIA[f]

/**
 * Marca como desatualizada toda fonte conferida há mais de `limiteDias` dias (padrão 180 — meio
 * ano, porque regra pública muda com frequência). Nunca decide sozinho que a fonte mudou; só avisa
 * que é hora de conferir de novo antes de citar o número a um cliente.
 */
export function fontesParaReconferir(hoje: Date, limiteDias = 180): { familia: FamiliaId; fonte: string }[] {
  const resultado: { familia: FamiliaId; fonte: string }[] = []
  for (const f of FAMILIAS) {
    for (const fonte of FONTES_POR_FAMILIA[f.id]) {
      const dias = (hoje.getTime() - new Date(fonte.conferidaEm).getTime()) / 86400000
      if (dias > limiteDias) resultado.push({ familia: f.id, fonte: fonte.nome })
    }
  }
  return resultado
}
