import type { Item } from '@/lib/hierarquiaCorporativa'

/** Documentos e registo de auditoria de DEMONSTRAÇÃO (fundos internacionais). Tudo fictício. Grafia de Angola. */
export interface DocumentoDemo { id: string; nome: string; tipo: string; projecto: string; data: string; autor: string; item: Item }
export const DOCUMENTOS_DEMO: DocumentoDemo[] = [
  { id: 'd1', nome: 'Contrato de empreitada — lote 2', tipo: 'Contrato', projecto: 'Estrada do Planalto', data: '2025-03-01', autor: 'Gestor de contrato', item: { pais: 'AO', setor: 'juridico', projeto: 'estrada' } },
  { id: 'd2', nome: 'Medição n.º 7', tipo: 'Medição', projecto: 'Estrada do Planalto', data: '2026-11-15', autor: 'Director de engenharia', item: { pais: 'AO', setor: 'obra', projeto: 'estrada' } },
  { id: 'd3', nome: 'Licença ambiental — fase 1', tipo: 'Licença', projecto: 'Estação de tratamento de água', data: '2024-08-20', autor: 'Responsável socioambiental', item: { pais: 'AO', setor: 'conformidade', projeto: 'agua' } },
  { id: 'd4', nome: 'Relatório de progresso — 3.º trimestre', tipo: 'Relatório', projecto: 'Parque logístico de Walvis Bay', data: '2026-10-05', autor: 'Gestor de projecto', item: { pais: 'NA', setor: 'obra', projeto: 'logistica' } },
]
export interface EventoAuditoria { id: string; quando: string; quem: string; acao: string; alvo: string; item: Item }
export const AUDITORIA_DEMO: EventoAuditoria[] = [
  { id: 'a1', quando: '2026-11-15 09:12', quem: 'Director de engenharia', acao: 'Aprovou', alvo: 'Medição n.º 7', item: { pais: 'AO', setor: 'obra', projeto: 'estrada' } },
  { id: 'a2', quando: '2026-11-14 16:40', quem: 'Director financeiro do país', acao: 'Reteve pagamento', alvo: 'Fatura de serviços de projecto', item: { pais: 'NA', setor: 'financeiro', projeto: 'logistica' } },
  { id: 'a3', quando: '2026-11-10 11:05', quem: 'Gestor de contrato', acao: 'Carregou', alvo: 'Relatório de progresso — 3.º trimestre', item: { pais: 'NA', setor: 'obra', projeto: 'logistica' } },
  { id: 'a4', quando: '2026-11-08 08:30', quem: 'Presidente', acao: 'Consultou', alvo: 'Visão do presidente', item: { pais: 'AO', setor: 'financeiro', projeto: 'estrada' } },
]
