/** Contratos de DEMONSTRAÇÃO, dados inventados (fundos internacionais). Nada vem de cliente real. Grafia de Angola. */
export interface ObrigacaoDemo { texto: string; prazo: string; dono: string }
import type { Item } from '@/lib/hierarquiaCorporativa'

export interface ContratoDemo {
  id: string; projeto: string; objecto: string; contraparte: string
  valor: number; moeda: 'Kz' | 'US$'; lei: string; foro: string
  inicio: string; fim: string; obrigacoes: ObrigacaoDemo[]
  /** Etiqueta de acesso: país, sector e projecto a que o registo pertence. */
  item: Item
}
export const CONTRATOS_DEMO: ContratoDemo[] = [
  { id: 'c-estrada', projeto: 'Estrada do Planalto, lote 2', objecto: 'Empreitada de construção', contraparte: 'Construtora fictícia Alfa, Lda',
    valor: 24_800_000_000, moeda: 'Kz', lei: 'Angola', foro: 'Arbitragem (Luanda)', inicio: '2025-03-01', fim: '2027-06-30',
    item: { pais: 'AO', setor: 'juridico', projeto: 'estrada' },
    obrigacoes: [
      { texto: 'Entregar o cronograma físico-financeiro actualizado', prazo: '2026-12-10', dono: 'Gestor de contrato' },
      { texto: 'Renovar a garantia de boa execução', prazo: '2026-12-20', dono: 'Director financeiro do país' },
      { texto: 'Apresentar a licença ambiental da fase 2', prazo: '2027-01-15', dono: 'Responsável socioambiental' },
    ] },
  { id: 'c-agua', projeto: 'Estação de tratamento de água, fase 1', objecto: 'Empreitada e fornecimento electromecânico', contraparte: 'Consórcio fictício Beta',
    valor: 61_000_000, moeda: 'US$', lei: 'Angola', foro: 'Arbitragem (CCI)', inicio: '2024-09-01', fim: '2026-12-31',
    item: { pais: 'AO', setor: 'juridico', projeto: 'agua' },
    obrigacoes: [
      { texto: 'Caução de garantia a caducar — accionar renovação', prazo: '2026-11-30', dono: 'Director financeiro do país' },
      { texto: 'Teste de recepção do equipamento electromecânico', prazo: '2026-12-15', dono: 'Director de engenharia' },
    ] },
  { id: 'c-log', projeto: 'Parque logístico de Walvis Bay', objecto: 'Concessão e construção', contraparte: 'Operador fictício Gama',
    valor: 95_000_000, moeda: 'US$', lei: 'Namíbia', foro: 'Tribunal de Windhoek', inicio: '2025-06-01', fim: '2028-03-31',
    item: { pais: 'NA', setor: 'juridico', projeto: 'logistica' },
    obrigacoes: [
      { texto: 'Confirmar o título de concessão do terreno', prazo: '2026-12-05', dono: 'Gestor de contrato' },
    ] },
]
