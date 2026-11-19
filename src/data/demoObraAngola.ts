/**
 * Dados FICTÍCIOS da demonstração de medição de obra por nível (pedido de M, 18/11/2026).
 * Nada aqui vem do banco nem de cliente algum: empresas, pessoas, projectos e valores foram inventados
 * para a tela /demonstracao-obra poder ser mostrada e gravada sem expor dado real de ninguém.
 * A grafia dos textos é a de Angola (projecto, sector), porque é para lá que a demonstração vai.
 */
import type { Alcada, Item, Passagem, Pessoa } from '@/lib/hierarquiaCorporativa'
import type { ItemContratual, Medido, Parametros } from '@/lib/medicaoObra'

export interface PessoaDemo extends Pessoa { nome: string; cargo: string }

const TODOS = ['juridico', 'obra', 'financeiro', 'compras', 'conformidade', 'pessoas'] as const

export const PESSOAS_DEMO: PessoaDemo[] = [
  { id: 'grupo', nome: 'Conselho do grupo', cargo: 'Administração do grupo', nivel: 'N1', paises: [], setores: [...TODOS], projetos: [] },
  { id: 'ceo', nome: 'Presidente executivo', cargo: 'Angola e Namíbia', nivel: 'N2', paises: ['AO', 'NA'], setores: [...TODOS], projetos: [] },
  { id: 'dir-obra', nome: 'Directora de engenharia', cargo: 'Direcção de obras, Angola', nivel: 'N3', paises: ['AO'], setores: ['obra'], projetos: [] },
  { id: 'dir-jur', nome: 'Director jurídico', cargo: 'Jurídico e conformidade, Angola', nivel: 'N3', paises: ['AO'], setores: ['juridico', 'conformidade'], projetos: [] },
  { id: 'dir-fin', nome: 'Directora financeira', cargo: 'Finanças, Angola', nivel: 'N3', paises: ['AO'], setores: ['financeiro'], projetos: [] },
  { id: 'gestor', nome: 'Gestor de projecto', cargo: 'Estrada do Planalto', nivel: 'N4', paises: ['AO'], setores: ['obra'], projetos: ['estrada'] },
  { id: 'medidor', nome: 'Técnico de medição', cargo: 'Frente de obra, Estrada do Planalto', nivel: 'N5', paises: ['AO'], setores: ['obra'], projetos: ['estrada'] },
  { id: 'fiscal', nome: 'Fiscal externo', cargo: 'Empresa fiscalizadora contratada', nivel: 'N6', paises: ['AO'], setores: ['obra'], projetos: ['estrada'] },
]

export interface ProjetoDemo {
  id: string
  nome: string
  pais: 'AO' | 'NA'
  /** Avanço físico previsto no cronograma para esta data, de 0 a 1. */
  previsto: number
  /** Há quantos dias o boletim mais antigo espera a próxima assinatura. */
  diasParado: number
  itens: ItemContratual[]
  medidos: Medido[]
  parametros: Parametros
  /** Assinaturas já dadas no boletim em curso. */
  passagens: Passagem[]
}

export const PROJETOS_DEMO: ProjetoDemo[] = [
  {
    id: 'estrada', nome: 'Estrada do Planalto, lote 2', pais: 'AO', previsto: 0.46, diasParado: 3,
    itens: [
      { id: 'e1', descricao: 'Terraplenagem', unidade: 'm³', quantidade: 180000, precoUnitario: 4200 },
      { id: 'e2', descricao: 'Sub-base granular', unidade: 'm³', quantidade: 62000, precoUnitario: 11500 },
      { id: 'e3', descricao: 'Betão betuminoso', unidade: 't', quantidade: 48000, precoUnitario: 38000 },
      { id: 'e4', descricao: 'Drenagem e passagens hidráulicas', unidade: 'm', quantidade: 9400, precoUnitario: 52000 },
    ],
    medidos: [
      { itemId: 'e1', anterior: 121000, periodo: 18500 },
      { itemId: 'e2', anterior: 21000, periodo: 6200 },
      { itemId: 'e3', anterior: 9000, periodo: 4100 },
      { itemId: 'e4', anterior: 3100, periodo: 620 },
    ],
    parametros: { retencao: 0.05, amortizacao: 0.1, adiantamentoPorAmortizar: 310_000_000 },
    passagens: [{ estacao: 'medir', pessoaId: 'medidor' }],
  },
  {
    id: 'agua', nome: 'Estação de tratamento de água, fase 1', pais: 'AO', previsto: 0.62, diasParado: 16,
    itens: [
      { id: 'a1', descricao: 'Estruturas de betão armado', unidade: 'm³', quantidade: 14500, precoUnitario: 96000 },
      { id: 'a2', descricao: 'Tubagem de adução', unidade: 'm', quantidade: 21000, precoUnitario: 44000 },
      { id: 'a3', descricao: 'Equipamento electromecânico', unidade: 'conj.', quantidade: 12, precoUnitario: 61_000_000 },
    ],
    medidos: [
      { itemId: 'a1', anterior: 7600, periodo: 500 },
      { itemId: 'a2', anterior: 9800, periodo: 900 },
      { itemId: 'a3', anterior: 4, periodo: 0 },
    ],
    parametros: { retencao: 0.05, amortizacao: 0.1, adiantamentoPorAmortizar: 120_000_000 },
    passagens: [{ estacao: 'medir', pessoaId: 'medidor-agua' }, { estacao: 'fiscalizar', pessoaId: 'gestor-agua' }],
  },
  {
    id: 'logistica', nome: 'Parque logístico de Walvis Bay', pais: 'NA', previsto: 0.3, diasParado: 8,
    itens: [
      { id: 'l1', descricao: 'Pavimento industrial', unidade: 'm²', quantidade: 86000, precoUnitario: 9800 },
      { id: 'l2', descricao: 'Naves metálicas', unidade: 'm²', quantidade: 32000, precoUnitario: 41000 },
    ],
    medidos: [
      { itemId: 'l1', anterior: 19000, periodo: 4300 },
      { itemId: 'l2', anterior: 6200, periodo: 1500 },
    ],
    parametros: { retencao: 0.05, amortizacao: 0.1, adiantamentoPorAmortizar: 95_000_000 },
    passagens: [],
  },
]

export interface ItemDemo extends Item { id: string; titulo: string; tipo: string }

/** O que circula entre os sectores: cada linha pertence a um sector, um país e (quase sempre) um projecto. */
export const ITENS_DEMO: ItemDemo[] = [
  { id: 'i1', titulo: 'Boletim de medição n.º 9', tipo: 'Boletim', pais: 'AO', setor: 'obra', projeto: 'estrada', responsavelId: 'medidor', partilhadoCom: ['fiscal'] },
  { id: 'i2', titulo: 'Diário de obra da semana', tipo: 'Registo', pais: 'AO', setor: 'obra', projeto: 'estrada', responsavelId: 'medidor' },
  { id: 'i3', titulo: 'Contrato de empreitada e adendas', tipo: 'Contrato', pais: 'AO', setor: 'juridico', projeto: 'estrada' },
  { id: 'i4', titulo: 'Parecer sobre reequilíbrio do contrato', tipo: 'Parecer', pais: 'AO', setor: 'juridico', projeto: 'estrada', reservado: true },
  { id: 'i5', titulo: 'Ordem de pagamento do boletim n.º 8', tipo: 'Pagamento', pais: 'AO', setor: 'financeiro', projeto: 'estrada' },
  { id: 'i6', titulo: 'Compra de betume, 3.º trimestre', tipo: 'Compra', pais: 'AO', setor: 'compras', projeto: 'estrada' },
  { id: 'i7', titulo: 'Boletim de medição n.º 14', tipo: 'Boletim', pais: 'AO', setor: 'obra', projeto: 'agua' },
  { id: 'i8', titulo: 'Garantia bancária de boa execução', tipo: 'Garantia', pais: 'AO', setor: 'financeiro', projeto: 'agua' },
  { id: 'i9', titulo: 'Verificação de fornecedores (conformidade)', tipo: 'Conformidade', pais: 'AO', setor: 'conformidade', projeto: 'agua', reservado: true },
  { id: 'i10', titulo: 'Plano de tesouraria do país', tipo: 'Tesouraria', pais: 'AO', setor: 'financeiro', projeto: null, reservado: true },
  { id: 'i11', titulo: 'Boletim de medição n.º 4', tipo: 'Boletim', pais: 'NA', setor: 'obra', projeto: 'logistica' },
  { id: 'i12', titulo: 'Contrato de concessão do terreno', tipo: 'Contrato', pais: 'NA', setor: 'juridico', projeto: 'logistica' },
]

/** Matriz de alçadas da demonstração, em kwanzas. Sem linha que sirva, ninguém assina. */
export const ALCADAS_DEMO: Alcada[] = [
  { estacao: 'medir', nivelMinimo: 'N5', setor: 'obra', ate: null },
  { estacao: 'fiscalizar', nivelMinimo: 'N4', setor: 'obra', ate: null },
  { estacao: 'aprovar_tecnica', nivelMinimo: 'N3', setor: 'obra', ate: null },
  { estacao: 'validar_contrato', nivelMinimo: 'N3', setor: 'juridico', ate: null },
  { estacao: 'liberar_pagamento', nivelMinimo: 'N3', setor: 'financeiro', ate: 250_000_000 },
  { estacao: 'liberar_pagamento', nivelMinimo: 'N2', setor: 'financeiro', ate: null },
]

export const rotuloSetorDemo: Record<string, string> = {
  juridico: 'Jurídico', obra: 'Obra', financeiro: 'Finanças', compras: 'Compras', conformidade: 'Conformidade', pessoas: 'Pessoas',
}
