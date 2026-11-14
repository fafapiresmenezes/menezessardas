/**
 * Passo D3: superfície de ataque do escritório, só para defesa.
 *
 * O que este arquivo é: a mesma ideia do grafo do Instituto (ativos, acessos e eventos numa só
 * ontologia) aplicada à defesa, com um conjunto de dados de EXEMPLO, de um escritório fictício.
 *
 * O que este arquivo NÃO é, e não vai ser: varredura. Ele não sonda porta, não testa senha, não
 * consulta serviço de ninguém. Os dados abaixo foram escritos à mão para o protótipo. Quando isto
 * virar produto, o inventário vem de quem contrata, por escrito, e sobre a casa dele — nunca de
 * uma varredura nossa em terceiro. É por isso que não há aqui nenhuma função de rede.
 *
 * A conta de risco é declarada e simples de propósito: exposição × sensibilidade, menos o que os
 * controles seguram. Modelo simples que o cliente entende e confere vale mais que número bonito
 * que ninguém sabe de onde veio. A incerteza está dita na tela.
 */

export type Exposicao = 'internet' | 'parceiro' | 'interno'
export type Sensibilidade = 'sigiloso' | 'interno' | 'publico'

export const PESO_EXPOSICAO: Record<Exposicao, number> = { internet: 3, parceiro: 2, interno: 1 }
export const PESO_SENSIBILIDADE: Record<Sensibilidade, number> = { sigiloso: 3, interno: 2, publico: 1 }

/** Cada controle que existe de verdade tira risco. O valor é o quanto ele tira, de 0 a 1. */
export const CONTROLES = {
  segundo_fator: { nome: 'Segundo fator na entrada', alivio: 0.35 },
  acesso_minimo: { nome: 'Cada pessoa só alcança o que precisa', alivio: 0.2 },
  trilha: { nome: 'Trilha de acesso para auditoria', alivio: 0.1 },
  cifrado: { nome: 'Guardado cifrado', alivio: 0.15 },
  copia: { nome: 'Cópia de segurança testada', alivio: 0.1 },
  revisao: { nome: 'Revisão periódica de quem alcança o quê', alivio: 0.1 },
} as const
export type Controle = keyof typeof CONTROLES

export interface Ativo {
  id: string
  nome: string
  o_que_guarda: string
  exposicao: Exposicao
  sensibilidade: Sensibilidade
  controles: Controle[]
  /** Quem alcança, por papel. Nome de pessoa não entra: papel basta, e evita dado pessoal no protótipo. */
  alcancam: { papel: string; quantas: number; segundo_fator: boolean; ultimo_uso_dias: number }[]
}

/** Escritório fictício, escrito à mão para o protótipo. Nenhum dado real de ninguém. */
export const EXEMPLO: Ativo[] = [
  {
    id: 'portal', nome: 'Portal do cliente', o_que_guarda: 'Peças e documentos do caso de cada cliente',
    exposicao: 'internet', sensibilidade: 'sigiloso', controles: ['trilha', 'cifrado'],
    alcancam: [
      { papel: 'cliente', quantas: 42, segundo_fator: false, ultimo_uso_dias: 1 },
      { papel: 'advogado', quantas: 6, segundo_fator: true, ultimo_uso_dias: 0 },
    ],
  },
  {
    id: 'email', nome: 'Caixa de e-mail do escritório', o_que_guarda: 'Conversa com cliente, intimação, proposta',
    exposicao: 'internet', sensibilidade: 'sigiloso', controles: ['segundo_fator', 'copia'],
    alcancam: [
      { papel: 'secretaria', quantas: 2, segundo_fator: true, ultimo_uso_dias: 0 },
      { papel: 'sócio', quantas: 2, segundo_fator: true, ultimo_uso_dias: 0 },
      { papel: 'conta compartilhada', quantas: 1, segundo_fator: false, ultimo_uso_dias: 3 },
    ],
  },
  {
    id: 'nuvem', nome: 'Nuvem de arquivos', o_que_guarda: 'Contrato, procuração, documento de imóvel',
    exposicao: 'parceiro', sensibilidade: 'sigiloso', controles: ['cifrado', 'trilha', 'acesso_minimo'],
    alcancam: [
      { papel: 'advogado', quantas: 6, segundo_fator: true, ultimo_uso_dias: 0 },
      { papel: 'contador externo', quantas: 1, segundo_fator: false, ultimo_uso_dias: 190 },
    ],
  },
  {
    id: 'banco', nome: 'Banco de dados da plataforma', o_que_guarda: 'Processo, prazo, honorário, pessoa',
    exposicao: 'parceiro', sensibilidade: 'sigiloso',
    controles: ['segundo_fator', 'acesso_minimo', 'trilha', 'cifrado', 'copia'],
    alcancam: [{ papel: 'administrador', quantas: 2, segundo_fator: true, ultimo_uso_dias: 0 }],
  },
  {
    id: 'site', nome: 'Site do escritório', o_que_guarda: 'Texto e contato, nada de cliente',
    exposicao: 'internet', sensibilidade: 'publico', controles: ['copia'],
    alcancam: [{ papel: 'quem publica', quantas: 1, segundo_fator: true, ultimo_uso_dias: 12 }],
  },
  {
    id: 'planilhas', nome: 'Planilhas no computador da secretaria', o_que_guarda: 'Controle de prazos antigo, cópia de contratos',
    exposicao: 'interno', sensibilidade: 'sigiloso', controles: [],
    alcancam: [{ papel: 'secretaria', quantas: 2, segundo_fator: false, ultimo_uso_dias: 2 }],
  },
]

/** Alívio somado dos controles, no máximo 0,8: controle nenhum zera risco. */
export const alivio = (controles: Controle[]): number =>
  Math.min(0.8, controles.reduce((t, c) => t + (CONTROLES[c]?.alivio ?? 0), 0))

/** Risco de 0 a 9, com os controles descontados. Arredondado a uma casa. */
export function risco(a: Ativo): number {
  const bruto = PESO_EXPOSICAO[a.exposicao] * PESO_SENSIBILIDADE[a.sensibilidade]
  return Math.round(bruto * (1 - alivio(a.controles)) * 10) / 10
}

export type Gravidade = 'alta' | 'media' | 'baixa'

export interface Achado {
  ativo: string
  o_que: string
  por_que: string
  /** Ação de defesa. Nunca ação ofensiva, nem "testar" nada de terceiro. */
  o_que_fazer: string
  gravidade: Gravidade
}

/**
 * Os achados. Cada regra olha o inventário declarado — nunca a rede de ninguém — e diz o que fazer.
 * São seis regras simples e explicáveis, e é de propósito: o cliente tem de poder discordar de cada uma.
 */
export function achados(ativos: Ativo[] = EXEMPLO): Achado[] {
  const saida: Achado[] = []
  for (const a of ativos) {
    if (a.sensibilidade === 'sigiloso' && a.exposicao === 'internet' && !a.controles.includes('segundo_fator')) {
      saida.push({ ativo: a.nome, o_que: 'Dado sigiloso alcançável pela internet sem segundo fator',
        por_que: 'Senha vazada em outro site vira entrada aqui, e isso é o caminho mais usado na prática.',
        o_que_fazer: 'Ligar segundo fator para todo mundo que alcança este ativo, começando por quem tem mais poder.',
        gravidade: 'alta' })
    }
    for (const q of a.alcancam) {
      if (q.papel.includes('compartilhada')) {
        saida.push({ ativo: a.nome, o_que: `Conta compartilhada (${q.papel})`,
          por_que: 'Conta de todos não é conta de ninguém: não se sabe quem fez o quê, e a senha nunca é trocada quando alguém sai.',
          o_que_fazer: 'Trocar por uma conta por pessoa e apagar a compartilhada.', gravidade: 'alta' })
      }
      if (q.ultimo_uso_dias > 90) {
        saida.push({ ativo: a.nome, o_que: `Acesso parado há ${q.ultimo_uso_dias} dias (${q.papel})`,
          por_que: 'Acesso que ninguém usa é porta aberta que ninguém olha.',
          o_que_fazer: 'Suspender o acesso e devolver só quando for pedido.', gravidade: 'media' })
      }
      if (!q.segundo_fator && a.sensibilidade === 'sigiloso' && q.quantas > 10) {
        saida.push({ ativo: a.nome, o_que: `${q.quantas} pessoas do papel "${q.papel}" sem segundo fator em dado sigiloso`,
          por_que: 'Quanto mais gente sem segundo fator, maior a chance de uma senha sozinha abrir tudo.',
          o_que_fazer: 'Exigir segundo fator deste papel, com prazo combinado e ajuda para quem não souber configurar.',
          gravidade: 'media' })
      }
    }
    if (a.sensibilidade === 'sigiloso' && !a.controles.includes('cifrado')) {
      saida.push({ ativo: a.nome, o_que: 'Dado sigiloso guardado sem cifra',
        por_que: 'Computador perdido ou cópia levada entrega o conteúdo inteiro.',
        o_que_fazer: 'Ligar a cifra do disco e da cópia de segurança.', gravidade: 'media' })
    }
    if (a.sensibilidade === 'sigiloso' && !a.controles.includes('trilha')) {
      saida.push({ ativo: a.nome, o_que: 'Sem trilha de acesso',
        por_que: 'Sem registro de quem abriu o quê, um vazamento não se investiga nem se prova.',
        o_que_fazer: 'Ligar o registro de acesso e guardar por prazo definido.', gravidade: 'baixa' })
    }
  }
  const ordem: Record<Gravidade, number> = { alta: 3, media: 2, baixa: 1 }
  return saida.sort((x, y) => ordem[y.gravidade] - ordem[x.gravidade])
}

/** O retrato em três números, para abrir a tela. */
export function resumo(ativos: Ativo[] = EXEMPLO) {
  const ac = achados(ativos)
  return {
    ativos: ativos.length,
    expostos: ativos.filter(a => a.exposicao === 'internet').length,
    achados: ac.length,
    graves: ac.filter(a => a.gravidade === 'alta').length,
    pior: [...ativos].sort((a, b) => risco(b) - risco(a))[0]?.nome ?? '',
  }
}
