/** Dados de DEMONSTRAÇÃO (fundos internacionais): fornecedores, garantias/licenças, riscos. Tudo fictício. Grafia de Angola. */
export interface FornecedorDemo { id: string; nome: string; tipo: string; pais: string; projectos: string[]; estado: 'activo' | 'em-avaliacao' | 'suspenso'; nota: number }
export const FORNECEDORES_DEMO: FornecedorDemo[] = [
  { id: 'f1', nome: 'Construtora fictícia Alfa, Lda', tipo: 'Empreitada', pais: 'Angola', projectos: ['Estrada do Planalto'], estado: 'activo', nota: 0.86 },
  { id: 'f2', nome: 'Consórcio fictício Beta', tipo: 'Electromecânica', pais: 'Angola', projectos: ['Estação de tratamento de água'], estado: 'activo', nota: 0.78 },
  { id: 'f3', nome: 'Operador fictício Gama', tipo: 'Concessão e logística', pais: 'Namíbia', projectos: ['Parque logístico de Walvis Bay'], estado: 'em-avaliacao', nota: 0.71 },
  { id: 'f4', nome: 'Fornecedor fictício Delta', tipo: 'Materiais', pais: 'Angola', projectos: ['Estrada do Planalto'], estado: 'suspenso', nota: 0.44 },
]

export type EstadoDoc = 'valido' | 'a-vencer' | 'vencido'
export interface GarantiaLicencaDemo { id: string; tipo: 'Garantia' | 'Licença'; descricao: string; projecto: string; entidade: string; validade: string }
export const GARANTIAS_DEMO: GarantiaLicencaDemo[] = [
  { id: 'g1', tipo: 'Garantia', descricao: 'Garantia de boa execução (10%)', projecto: 'Estrada do Planalto', entidade: 'Banco fictício', validade: '2027-07-30' },
  { id: 'g2', tipo: 'Garantia', descricao: 'Caução de garantia — equipamento', projecto: 'Estação de tratamento de água', entidade: 'Banco fictício', validade: '2026-11-30' },
  { id: 'g3', tipo: 'Licença', descricao: 'Licença ambiental — fase 2', projecto: 'Estrada do Planalto', entidade: 'Autoridade ambiental', validade: '2026-12-15' },
  { id: 'g4', tipo: 'Licença', descricao: 'Título de concessão do terreno', projecto: 'Parque logístico de Walvis Bay', entidade: 'Autoridade de Windhoek', validade: '2028-03-31' },
]

export type NivelRisco = 'alto' | 'medio' | 'baixo'
export interface RiscoDemo { id: string; titulo: string; projecto: string; nivel: NivelRisco; tipo: 'Risco' | 'Litígio'; medida: string }
export const RISCOS_DEMO: RiscoDemo[] = [
  { id: 'r1', titulo: 'Atraso na licença ambiental da fase 2', projecto: 'Estrada do Planalto', nivel: 'alto', tipo: 'Risco', medida: 'Acompanhar junto da autoridade; plano de contingência para a frente de obra.' },
  { id: 'r2', titulo: 'Caução de garantia a caducar', projecto: 'Estação de tratamento de água', nivel: 'medio', tipo: 'Risco', medida: 'Renovar a caução antes de 30/11.' },
  { id: 'r3', titulo: 'Divergência de medição com o empreiteiro', projecto: 'Estrada do Planalto', nivel: 'medio', tipo: 'Litígio', medida: 'Conciliação técnica; cláusula de arbitragem como reserva.' },
  { id: 'r4', titulo: 'Confirmação do título de concessão', projecto: 'Parque logístico de Walvis Bay', nivel: 'alto', tipo: 'Risco', medida: 'Suspender pagamentos ligados até confirmar o título.' },
]
