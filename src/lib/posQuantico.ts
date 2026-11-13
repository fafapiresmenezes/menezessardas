/**
 * Passo D4, etapa 1: o inventário de criptografia da plataforma, com a exposição de cada item ao
 * computador quântico. Relatório completo em `quantico/D4-pos-quantico.md`.
 *
 * Por que isto é código e não só um documento: documento envelhece calado. Aqui o inventário tem
 * teste, e o teste cobra que todo item diga o algoritmo, o tamanho e o que fazer. Quando alguém
 * acrescentar criptografia nova na plataforma, acrescenta a linha aqui também.
 *
 * O que este arquivo NÃO faz: assinar, cifrar ou verificar nada. Ele é a lista e as contas de
 * prazo. A troca de algoritmo é a etapa 3 do plano, e depende de biblioteca de ML-DSA auditada.
 */

/** Padronizado e final pelo NIST, com a data da norma. Conferido em csrc.nist.gov em 13/11/2026. */
export const NORMAS_NIST = [
  { fips: '203', algoritmo: 'ML-KEM', para: 'combinar chave secreta por canal aberto', desde: '2024-08-13' },
  { fips: '204', algoritmo: 'ML-DSA', para: 'assinatura digital', desde: '2024-08-13' },
  { fips: '205', algoritmo: 'SLH-DSA', para: 'assinatura digital baseada em hash', desde: '2024-08-13' },
] as const

/**
 * Ano em que o NIST diz que vai remover das suas normas o que é vulnerável ao quântico
 * (NIST IR 8547, citado na página do projeto). É marco administrativo, NÃO previsão de quando a
 * máquina chega: ninguém sabe essa data.
 */
export const ANO_LIMITE_NIST = 2035

export type Exposicao = 'baixa' | 'media' | 'alta'

export interface ItemCripto {
  id: string
  o_que_e: string
  onde: string
  algoritmo: string
  /** Bits de força clássica, antes de considerar o quântico. */
  bits: number
  exposicao: Exposicao
  por_que: string
  o_que_fazer: string
  /** false quando o risco é do fornecedor (TLS da Vercel, do Supabase, rede Bitcoin). */
  nosso: boolean
}

export const INVENTARIO: ItemCripto[] = [
  {
    id: 'corrente', o_que_e: 'Corrente do trilho', onde: 'src/lib/trilho.ts',
    algoritmo: 'SHA-256', bits: 256, exposicao: 'baixa', nosso: true,
    por_que: 'Contra hash o quântico só tem o algoritmo de Grover, que corta o expoente pela metade: 256 bits viram cerca de 128 bits de força, que ninguém quebra.',
    o_que_fazer: 'Nada agora. Manter 256 bits e nunca cair para 128.',
  },
  {
    id: 'selo', o_que_e: 'Selo diário de documentos', onde: 'supabase/functions/selar-documentos',
    algoritmo: 'SHA-256 em árvore', bits: 256, exposicao: 'baixa', nosso: true,
    por_que: 'Mesma razão da corrente: é hash, não chave pública.',
    o_que_fazer: 'Nada agora.',
  },
  {
    id: 'carimbo', o_que_e: 'Carimbo de data no Bitcoin', onde: 'supabase/functions/ancorar-hash',
    algoritmo: 'SHA-256 (prova de inclusão)', bits: 256, exposicao: 'baixa', nosso: false,
    por_que: 'A prova de data é hash. O ECDSA da rede Bitcoin serve para mover moeda, não para o carimbo já emitido.',
    o_que_fazer: 'Acompanhar o que a rede fizer. Não migrar.',
  },
  {
    id: 'assinatura', o_que_e: 'Assinatura eletrônica no portal do cliente', onde: 'tabela assinaturas_eletronicas',
    algoritmo: 'SHA-256 do texto e do aceite', bits: 256, exposicao: 'media', nosso: true,
    por_que: 'O hash prova integridade, mas a autoria hoje vem do registro de aceite mais o selo de data, e não de uma chave do assinante. O problema não é o algoritmo ser clássico: é ainda não haver assinatura criptográfica.',
    o_que_fazer: 'Etapa 2 do plano: gerar par de chaves no aparelho de quem assina e guardar o campo do algoritmo desde o primeiro dia. Etapa 3: assinatura dupla, clássica mais ML-DSA.',
  },
  {
    id: 'tls', o_que_e: 'Tráfego entre o navegador e os servidores', onde: 'Vercel e Supabase',
    algoritmo: 'TLS do fornecedor', bits: 128, exposicao: 'media', nosso: false,
    por_que: 'A troca de chave do TLS clássico é o alvo clássico do quântico, e quem escolhe o algoritmo é o fornecedor.',
    o_que_fazer: 'Herdamos quando Vercel e Supabase ligarem ML-KEM. Conferir de tempo em tempo, não prometer data.',
  },
  {
    id: 'entrada', o_que_e: 'Senha e segundo fator', onde: 'Supabase Auth e TOTP',
    algoritmo: 'hash de senha e HMAC', bits: 256, exposicao: 'baixa', nosso: false,
    por_que: 'Hash e HMAC, de novo: só Grover, e pela metade do expoente.',
    o_que_fazer: 'Nada agora.',
  },
]

/**
 * Teste de Mosca: há risco quando o tempo de sigilo exigido mais o tempo de migração passam da
 * chegada do computador quântico capaz. Devolve a folga em anos, que é negativa quando há risco.
 */
export function mosca(anosDeSigilo: number, anosDeMigracao: number, anosAteOQuantico: number) {
  const folga = anosAteOQuantico - (anosDeSigilo + anosDeMigracao)
  return { risco: folga < 0, folga }
}

/** Anos daqui até o marco do NIST. É o `z` que usamos por falta de data melhor, e está declarado como marco, não previsão. */
export const anosAteOMarco = (hoje = new Date()): number =>
  ANO_LIMITE_NIST - hoje.getUTCFullYear()

/** O que precisa de trabalho de verdade: o que é nosso e não tem exposição baixa. */
export const precisaDeTrabalho = (): ItemCripto[] =>
  INVENTARIO.filter(i => i.nosso && i.exposicao !== 'baixa')
