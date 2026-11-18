/** Pagamentos de DEMONSTRAÇÃO, dados inventados (fundos internacionais). Grafia de Angola. */
export type EstadoPag = 'pago' | 'aprovado' | 'em-analise' | 'retido'
export interface PagamentoDemo {
  id: string; projeto: string; descricao: string; fornecedor: string
  valor: number; moeda: 'Kz' | 'US$'; vencimento: string; estado: EstadoPag
  medicao?: string
}
export const PAGAMENTOS_DEMO: PagamentoDemo[] = [
  { id: 'p1', projeto: 'Estrada do Planalto, lote 2', descricao: 'Medição n.º 7 — terraplanagem', fornecedor: 'Construtora fictícia Alfa, Lda', valor: 1_850_000_000, moeda: 'Kz', vencimento: '2026-12-05', estado: 'aprovado', medicao: 'M-07' },
  { id: 'p2', projeto: 'Estação de tratamento de água, fase 1', descricao: 'Adiantamento de equipamento electromecânico', fornecedor: 'Consórcio fictício Beta', valor: 4_200_000, moeda: 'US$', vencimento: '2026-11-28', estado: 'em-analise' },
  { id: 'p3', projeto: 'Estrada do Planalto, lote 2', descricao: 'Medição n.º 6 — drenagem', fornecedor: 'Construtora fictícia Alfa, Lda', valor: 1_120_000_000, moeda: 'Kz', vencimento: '2026-11-10', estado: 'pago', medicao: 'M-06' },
  { id: 'p4', projeto: 'Parque logístico de Walvis Bay', descricao: 'Fatura de serviços de projecto', fornecedor: 'Operador fictício Gama', valor: 780_000, moeda: 'US$', vencimento: '2026-12-20', estado: 'retido' },
]
export const RAZAO_RETIDO: Record<string, string> = {
  p4: 'Falta confirmar o título de concessão do terreno (obrigação do contrato).',
}
