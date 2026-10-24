/**
 * Vocabulário do nicho imobiliário. Tudo que a interface oferece em
 * múltipla escolha nasce aqui, para que telas, assistentes e banco falem
 * a mesma língua.
 */

export interface Opcao<T extends string = string> {
  valor: T
  rotulo: string
  descricao?: string
}

export type TipoImovel =
  | 'apartamento'
  | 'casa'
  | 'loja'
  | 'sala_comercial'
  | 'conjunto_comercial'
  | 'edificio'
  | 'hotel'
  | 'galpao'
  | 'garagem'
  | 'terreno'

export const TIPOS_IMOVEL: Opcao<TipoImovel>[] = [
  { valor: 'apartamento', rotulo: 'Apartamento', descricao: 'Unidade residencial em condomínio' },
  { valor: 'casa', rotulo: 'Casa', descricao: 'Residência unifamiliar' },
  { valor: 'loja', rotulo: 'Loja', descricao: 'Ponto comercial de rua ou shopping' },
  { valor: 'sala_comercial', rotulo: 'Sala comercial', descricao: 'Unidade em edifício de escritórios' },
  { valor: 'conjunto_comercial', rotulo: 'Conjunto comercial', descricao: 'Andar ou conjunto de salas' },
  { valor: 'edificio', rotulo: 'Edifício inteiro', descricao: 'Prédio residencial ou comercial completo' },
  { valor: 'hotel', rotulo: 'Hotel', descricao: 'Edifício de hospedagem' },
  { valor: 'galpao', rotulo: 'Galpão', descricao: 'Logístico ou industrial' },
  { valor: 'garagem', rotulo: 'Garagem ou vaga', descricao: 'Vaga avulsa ou estacionamento' },
  { valor: 'terreno', rotulo: 'Terreno', descricao: 'Lote sem edificação' },
]

export type UsoImovel =
  | 'uso_proprio'
  | 'locado'
  | 'comodato'
  | 'vago'
  | 'em_construcao'
  | 'em_desenvolvimento'
  | 'em_construcao_sem_contrato'

export const USOS_IMOVEL: Opcao<UsoImovel>[] = [
  { valor: 'uso_proprio', rotulo: 'Uso próprio', descricao: 'Ocupado pelo proprietário ou pela família' },
  { valor: 'locado', rotulo: 'Locado', descricao: 'Há contrato de locação vigente' },
  { valor: 'comodato', rotulo: 'Comodato', descricao: 'Cedido sem contraprestação' },
  { valor: 'vago', rotulo: 'Vago', descricao: 'Disponível, sem ocupação' },
  { valor: 'em_construcao', rotulo: 'Em construção', descricao: 'Obra em andamento, com contrato' },
  { valor: 'em_construcao_sem_contrato', rotulo: 'Em construção, sem contrato', descricao: 'Obra sem instrumento formalizado' },
  { valor: 'em_desenvolvimento', rotulo: 'Em desenvolvimento', descricao: 'Projeto, aprovação ou incorporação' },
]

export type UF = 'RJ' | 'SP' | 'MG' | 'ES' | 'PR' | 'SC' | 'RS' | 'BA' | 'DF' | 'OUTRA'

export const UFS: Opcao<UF>[] = [
  { valor: 'RJ', rotulo: 'Rio de Janeiro' },
  { valor: 'SP', rotulo: 'São Paulo' },
  { valor: 'MG', rotulo: 'Minas Gerais' },
  { valor: 'ES', rotulo: 'Espírito Santo' },
  { valor: 'PR', rotulo: 'Paraná' },
  { valor: 'SC', rotulo: 'Santa Catarina' },
  { valor: 'RS', rotulo: 'Rio Grande do Sul' },
  { valor: 'BA', rotulo: 'Bahia' },
  { valor: 'DF', rotulo: 'Distrito Federal' },
  { valor: 'OUTRA', rotulo: 'Outro estado' },
]

export type TipoContrato =
  | 'locacao_residencial'
  | 'locacao_comercial'
  | 'locacao_temporada'
  | 'comodato'
  | 'built_to_suit'
  | 'arrendamento'
  | 'sla_fornecedor'

export const TIPOS_CONTRATO: Opcao<TipoContrato>[] = [
  { valor: 'locacao_residencial', rotulo: 'Locação residencial', descricao: 'Lei 8.245/91, moradia' },
  { valor: 'locacao_comercial', rotulo: 'Locação comercial', descricao: 'Lei 8.245/91, atividade empresarial' },
  { valor: 'locacao_temporada', rotulo: 'Locação por temporada', descricao: 'Até 90 dias' },
  { valor: 'comodato', rotulo: 'Comodato', descricao: 'Empréstimo gratuito do imóvel' },
  { valor: 'built_to_suit', rotulo: 'Built to suit', descricao: 'Construção sob medida para o locatário' },
  { valor: 'arrendamento', rotulo: 'Arrendamento', descricao: 'Exploração econômica do imóvel' },
  { valor: 'sla_fornecedor', rotulo: 'Contrato de fornecedor (SLA)', descricao: 'Serviço prestado no imóvel' },
]

export type Garantia = 'caucao' | 'fiador' | 'seguro_fianca' | 'titulo_capitalizacao' | 'sem_garantia'

export const GARANTIAS: Opcao<Garantia>[] = [
  { valor: 'caucao', rotulo: 'Caução', descricao: 'Depósito de até 3 aluguéis' },
  { valor: 'fiador', rotulo: 'Fiador', descricao: 'Terceiro responde pela dívida' },
  { valor: 'seguro_fianca', rotulo: 'Seguro-fiança', descricao: 'Apólice contratada pelo locatário' },
  { valor: 'titulo_capitalizacao', rotulo: 'Título de capitalização', descricao: 'Cessão de título ao locador' },
  { valor: 'sem_garantia', rotulo: 'Sem garantia' },
]

export type IndiceReajuste = 'ipca' | 'igpm' | 'inpc' | 'fixo' | 'sem_reajuste'

export const INDICES_REAJUSTE: Opcao<IndiceReajuste>[] = [
  { valor: 'ipca', rotulo: 'IPCA', descricao: 'Índice oficial de inflação (IBGE)' },
  { valor: 'igpm', rotulo: 'IGP-M', descricao: 'Índice da FGV, tradicional em locações' },
  { valor: 'inpc', rotulo: 'INPC', descricao: 'Índice do IBGE para famílias de menor renda' },
  { valor: 'fixo', rotulo: 'Percentual fixo', descricao: 'Reajuste combinado em contrato' },
  { valor: 'sem_reajuste', rotulo: 'Sem reajuste' },
]

export type Periodicidade = 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'unica'

export const PERIODICIDADES: Opcao<Periodicidade>[] = [
  { valor: 'mensal', rotulo: 'Mensal' },
  { valor: 'trimestral', rotulo: 'Trimestral' },
  { valor: 'semestral', rotulo: 'Semestral' },
  { valor: 'anual', rotulo: 'Anual' },
  { valor: 'unica', rotulo: 'Parcela única' },
]

export type TipoDocumento =
  | 'matricula_rgi'
  | 'iptu'
  | 'habite_se'
  | 'avcb'
  | 'alvara_funcionamento'
  | 'alvara_construcao'
  | 'seguro_incendio'
  | 'convencao_condominio'
  | 'certidao_negativa'
  | 'laudo_vistoria'
  | 'contrato'
  | 'aditivo'
  | 'procuracao'
  | 'outro'

export const TIPOS_DOCUMENTO: Opcao<TipoDocumento>[] = [
  { valor: 'matricula_rgi', rotulo: 'Matrícula do RGI' },
  { valor: 'iptu', rotulo: 'IPTU' },
  { valor: 'habite_se', rotulo: 'Habite-se' },
  { valor: 'avcb', rotulo: 'AVCB / Certificado do Corpo de Bombeiros' },
  { valor: 'alvara_funcionamento', rotulo: 'Alvará de funcionamento' },
  { valor: 'alvara_construcao', rotulo: 'Alvará de construção' },
  { valor: 'seguro_incendio', rotulo: 'Seguro contra incêndio' },
  { valor: 'convencao_condominio', rotulo: 'Convenção de condomínio' },
  { valor: 'certidao_negativa', rotulo: 'Certidões negativas' },
  { valor: 'laudo_vistoria', rotulo: 'Laudo de vistoria' },
  { valor: 'contrato', rotulo: 'Contrato' },
  { valor: 'aditivo', rotulo: 'Aditivo' },
  { valor: 'procuracao', rotulo: 'Procuração' },
  { valor: 'outro', rotulo: 'Outro' },
]

export interface ItemChecklist {
  tipo: TipoDocumento
  rotulo: string
  motivo: string
  obrigatorio: boolean
}

/**
 * Documentos exigidos para o imóvel estar regular na função que ocupa.
 * A base é a mesma para todos; o uso, o tipo e o estado acrescentam itens.
 */
export function checklistDocumentos(tipo: TipoImovel, uso: UsoImovel, uf: UF): ItemChecklist[] {
  const bombeiros =
    uf === 'RJ' ? 'Certificado de Aprovação do CBMERJ' : 'AVCB (Auto de Vistoria do Corpo de Bombeiros)'

  const lista: ItemChecklist[] = [
    { tipo: 'matricula_rgi', rotulo: 'Matrícula do RGI', motivo: 'Prova a propriedade e os ônus', obrigatorio: true },
    { tipo: 'iptu', rotulo: 'IPTU do exercício', motivo: 'Regularidade fiscal municipal', obrigatorio: tipo !== 'terreno' || true },
  ]

  const edificado = tipo !== 'terreno'
  const comercial = ['loja', 'sala_comercial', 'conjunto_comercial', 'hotel', 'galpao', 'edificio'].includes(tipo)
  const condominial = ['apartamento', 'sala_comercial', 'conjunto_comercial', 'garagem'].includes(tipo)

  if (edificado && uso !== 'em_construcao' && uso !== 'em_construcao_sem_contrato' && uso !== 'em_desenvolvimento') {
    lista.push({ tipo: 'habite_se', rotulo: 'Habite-se', motivo: 'Edificação concluída e aprovada', obrigatorio: true })
  }

  if (comercial || tipo === 'edificio') {
    lista.push({ tipo: 'avcb', rotulo: bombeiros, motivo: 'Segurança contra incêndio, renovação periódica', obrigatorio: true })
    lista.push({ tipo: 'alvara_funcionamento', rotulo: 'Alvará de funcionamento', motivo: 'Licença municipal da atividade', obrigatorio: uso === 'locado' || uso === 'uso_proprio' })
  }

  if (uso === 'em_construcao' || uso === 'em_construcao_sem_contrato' || uso === 'em_desenvolvimento') {
    lista.push({ tipo: 'alvara_construcao', rotulo: 'Alvará de construção', motivo: 'Autorização da obra', obrigatorio: true })
  }

  if (uso === 'locado' || uso === 'comodato') {
    lista.push({ tipo: 'contrato', rotulo: 'Contrato assinado', motivo: 'Instrumento que rege a ocupação', obrigatorio: true })
    lista.push({ tipo: 'laudo_vistoria', rotulo: 'Laudo de vistoria de entrada', motivo: 'Estado do imóvel na entrega (Lei 8.245/91, art. 22)', obrigatorio: true })
    lista.push({ tipo: 'seguro_incendio', rotulo: 'Seguro contra incêndio', motivo: 'Exigência usual em locação', obrigatorio: comercial })
  }

  if (condominial) {
    lista.push({ tipo: 'convencao_condominio', rotulo: 'Convenção de condomínio', motivo: 'Regras de uso da unidade', obrigatorio: false })
  }

  if (tipo === 'hotel') {
    lista.push({ tipo: 'certidao_negativa', rotulo: 'Certidões negativas do operador', motivo: 'Saúde fiscal de quem explora o hotel', obrigatorio: true })
  }

  return lista
}

/** Tipos de contrato que fazem sentido para um uso. */
export function tiposContratoParaUso(uso: UsoImovel): TipoContrato[] {
  switch (uso) {
    case 'locado':
      return ['locacao_residencial', 'locacao_comercial', 'locacao_temporada', 'built_to_suit', 'arrendamento']
    case 'comodato':
      return ['comodato']
    case 'uso_proprio':
      return ['sla_fornecedor']
    case 'em_construcao':
    case 'em_desenvolvimento':
      return ['built_to_suit', 'sla_fornecedor']
    default:
      return ['sla_fornecedor']
  }
}
