// Habilidade 9 do replanejamento de mercado (14/11/2026): parcerias e canais de prospecção, além
// do contato direto. A oferta "Soluções jurídicas" (SolucoesPage) já existe para escritórios
// parceiros entrarem como escritório próprio — isto aqui é o canal de PROSPECÇÃO do Instituto, não
// a entrada do parceiro na plataforma.
import { FAMILIAS, type FamiliaId } from './caderno-familias'
import { icpDaFamilia } from './icp-familias'

export interface CanalDeParceria {
  id: string
  nome: string
  oQueE: string
  /** O que precisa existir por escrito antes do canal começar a trazer cliente (nunca verbal). */
  exigeContrato: string
}

export const CANAIS: CanalDeParceria[] = [
  {
    id: 'indicacao-direta',
    nome: 'Indicação direta',
    oQueE: 'Um cliente atual ou contato pessoal indica a organização seguinte.',
    exigeContrato: 'Nenhum contrato de comissão — indicação sem remuneração não precisa de termo, só registro de origem para medir depois (habilidade 10).',
  },
  {
    id: 'escritorio-parceiro',
    nome: 'Escritório de advocacia parceiro',
    oQueE: 'Escritório que já atende o setor da família e encaminha o cliente para o serviço especializado do Instituto.',
    exigeContrato: 'Termo de parceria com percentual de comissão por escrito antes do primeiro encaminhamento — nunca acordo verbal (mesma regra do "Soluções jurídicas").',
  },
  {
    id: 'associacao-setorial',
    nome: 'Associação ou confederação setorial',
    oQueE: 'Entidade que representa o setor da família e pode recomendar o Instituto aos seus membros.',
    exigeContrato: 'Convênio institucional por escrito, sem comissão individual por indicação (LGPD: a associação não pode entregar dados de membros sem autorização deles).',
  },
  {
    id: 'evento-palestra',
    nome: 'Evento ou palestra setorial',
    oQueE: 'Apresentação pública sobre o tema da família, sem contato comercial direto no evento.',
    exigeContrato: 'Nenhum — mas todo contato colhido no evento precisa de consentimento explícito antes de entrar em qualquer lista (LGPD).',
  },
]

/**
 * Sugere o canal mais adequado à família a partir do ciclo de venda estimado (ICP, habilidade 1):
 * ciclo mais longo (tipicamente comprador institucional ou regulado) combina melhor com parceria
 * institucional ou escritório parceiro; ciclo mais curto combina melhor com indicação direta ou
 * evento. Critério documentado, não escondido — nunca decide sozinho sem repassar o porquê.
 */
export function canalSugeridoPorFamilia(f: FamiliaId): { canal: CanalDeParceria; porque: string } {
  const icp = icpDaFamilia(f)
  const minimo = Number(icp.cicloDeVendaEstimado.match(/(\d+)/)?.[1] ?? 0)
  if (minimo >= 4) {
    const canal = CANAIS.find(c => c.id === 'escritorio-parceiro')!
    return { canal, porque: `Ciclo de venda estimado em ${icp.cicloDeVendaEstimado} — ciclo longo combina melhor com um parceiro já presente no setor.` }
  }
  const canal = CANAIS.find(c => c.id === 'indicacao-direta')!
  return { canal, porque: `Ciclo de venda estimado em ${icp.cicloDeVendaEstimado} — ciclo mais curto aproveita melhor uma indicação direta, sem esperar um convênio.` }
}

export const canaisDeTodasAsFamilias = () => FAMILIAS.map(f => ({ familia: f.id, ...canalSugeridoPorFamilia(f.id) }))
