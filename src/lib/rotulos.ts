/**
 * Nada de valor cru de banco na tela: "em_construcao" não é português.
 * Os rótulos nascem do vocabulário em dominio.ts, para que a tela e o
 * assistente de cadastro nunca discordem.
 */
import {
  GARANTIAS,
  INDICES_REAJUSTE,
  PERIODICIDADES,
  TIPOS_CONTRATO,
  TIPOS_DOCUMENTO,
  TIPOS_IMOVEL,
  USOS_IMOVEL,
  type Opcao,
} from './dominio'

const mapa = (opcoes: Opcao[]): Record<string, string> =>
  Object.fromEntries(opcoes.map(o => [o.valor, o.rotulo]))

export const rotulosUso = mapa(USOS_IMOVEL)
export const rotulosTipoImovel = mapa(TIPOS_IMOVEL)
export const rotulosTipoContrato = mapa(TIPOS_CONTRATO)
export const rotulosGarantia = mapa(GARANTIAS)
export const rotulosIndice = mapa(INDICES_REAJUSTE)
export const rotulosPeriodicidade = mapa(PERIODICIDADES)
export const rotulosTipoDocumento = mapa(TIPOS_DOCUMENTO)

export const rotulosTipoAlerta: Record<string, string> = {
  vencimento: 'Vencimento de contrato',
  reajuste: 'Reajuste contratual',
  documento: 'Vencimento de documento',
  compromisso: 'Compromisso da agenda',
  renovatoria: 'Prazo da ação renovatória',
}

export const rotulosStatusDocumento: Record<string, string> = {
  valido: 'Válido',
  vencido: 'Vencido',
  a_renovar: 'A renovar',
}

export const rotulosStatusContrato: Record<string, string> = {
  ativo: 'Ativo',
  vencido: 'Vencido',
  a_renovar: 'A renovar',
}

/** Sigla curta para os selos da lista de imóveis. */
export const siglaDocumento: Record<string, string> = {
  matricula_rgi: 'RGI',
  iptu: 'IPTU',
  habite_se: 'Habite-se',
  avcb: 'Bombeiros',
  alvara_funcionamento: 'Alvará',
  alvara_construcao: 'Alvará de obra',
  seguro_incendio: 'Seguro',
  convencao_condominio: 'Convenção',
  certidao_negativa: 'Certidões',
  laudo_vistoria: 'Vistoria',
  contrato: 'Contrato',
  aditivo: 'Aditivo',
  procuracao: 'Procuração',
  outro: 'Outro',
}
