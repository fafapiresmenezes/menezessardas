// Prazos por código: o mesmo ato tem contagem diferente em cada ramo (CPC em dias úteis, CPP em dias corridos,
// ECA em dias corridos sem prazo em dobro, decadência e prescrição em meses ou anos). Cada linha traz a base legal.
// É um apoio de conferência: portarias do tribunal, suspensões avulsas e a regra do caso concreto prevalecem.
import { somarDias, somarMeses, prorrogarParaDiaUtil, paraData, br, diaDaSemana } from '@/lib/ferramentas/base'
import { diaUtil, calcularPrazo } from '@/lib/prazos'

export type Unidade = 'dias_uteis' | 'dias_corridos' | 'meses' | 'anos'
export type Natureza = 'processual' | 'material' | 'improprio'
export type Codigo = 'CPC' | 'CLT' | 'CPP' | 'JEC' | 'LEF' | 'MS' | 'ECA' | 'LOC' | 'CDC' | 'FAL' | 'PRESC'

export const CODIGOS: Record<Codigo, { nome: string; sigla: string; regra: string }> = {
  CPC: { nome: 'Processo civil (CPC)', sigla: 'CPC', regra: 'Dias úteis, sem contar o dia do começo (CPC, arts. 219 e 224). Recesso de 20/12 a 20/01 suspende o prazo (art. 220).' },
  CLT: { nome: 'Processo do trabalho (CLT)', sigla: 'CLT', regra: 'Dias úteis, sem contar o dia do começo (CLT, art. 775). Recesso do art. 220 do CPC aplica-se por analogia.' },
  CPP: { nome: 'Processo penal (CPP)', sigla: 'CPP', regra: 'Dias corridos; exclui o dia do começo e inclui o do vencimento; vencendo sem expediente, passa ao dia útil seguinte (CPP, art. 798). O prazo conta da intimação, não da juntada (Súmula 710 do STF).' },
  JEC: { nome: 'Juizados Especiais (Lei 9.099/95)', sigla: 'JEC', regra: 'Dias úteis (Lei 9.099/95, art. 12-A). Não há prazo em dobro para a Fazenda nos Juizados da Fazenda (Lei 12.153/2009, art. 7º).' },
  LEF: { nome: 'Execução fiscal (Lei 6.830/80)', sigla: 'LEF', regra: 'Dias úteis (CPC aplicado subsidiariamente). Embargos do executado em 30 dias (art. 16).' },
  MS: { nome: 'Mandado de segurança (Lei 12.016/2009)', sigla: 'MS', regra: 'Impetração em 120 dias (decadência); os demais prazos seguem o CPC.' },
  ECA: { nome: 'Infância e juventude (ECA)', sigla: 'ECA', regra: 'Dias corridos, sem o dia do começo e com o do vencimento; vedado o prazo em dobro para a Fazenda e o Ministério Público (Lei 8.069/90, art. 152, § 2º).' },
  LOC: { nome: 'Locação (Lei 8.245/91)', sigla: 'LOC', regra: 'Prazos de direito material em dias corridos (CC, art. 132); os processuais seguem o CPC.' },
  CDC: { nome: 'Consumidor (CDC)', sigla: 'CDC', regra: 'Prazos de decadência e prescrição de direito material (Lei 8.078/90).' },
  FAL: { nome: 'Recuperação e falência (Lei 11.101/2005)', sigla: 'FAL', regra: 'Dias corridos (Lei 11.101/2005, art. 189, § 1º, I). Confira se o ato é da recuperação, da falência ou do CPC subsidiário.' },
  PRESC: { nome: 'Prescrição e decadência', sigla: 'PRESC', regra: 'Meses e anos "de data a data" (CC, art. 132, § 3º). Vencendo em dia sem expediente, a data passa ao dia útil seguinte.' },
}

export type AtoPrazo = {
  id: string; codigo: Codigo; ato: string; quantidade: number; unidade: Unidade; base: string
  natureza?: Natureza // padrão: processual
  marco?: string // de quando conta (padrão: a intimação)
  dobro?: boolean // admite prazo em dobro (Fazenda, MP, Defensoria, litisconsortes)
  nota?: string
}

export const ATOS_POR_CODIGO: AtoPrazo[] = [
  // ---------- CPC ----------
  { id: 'cpc-contestacao', codigo: 'CPC', ato: 'Contestação (procedimento comum)', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, art. 335', marco: 'Data da audiência de conciliação ou da juntada do mandado/AR de citação (art. 335, I a III)', dobro: true },
  { id: 'cpc-replica', codigo: 'CPC', ato: 'Réplica', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, arts. 350 e 351', dobro: true },
  { id: 'cpc-emenda', codigo: 'CPC', ato: 'Emenda da petição inicial', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, art. 321', dobro: true },
  { id: 'cpc-manifestar-doc', codigo: 'CPC', ato: 'Manifestação sobre documento juntado', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, art. 437, § 1º', dobro: true },
  { id: 'cpc-laudo', codigo: 'CPC', ato: 'Manifestação sobre o laudo pericial', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, art. 477, § 1º', dobro: true },
  { id: 'cpc-assistente', codigo: 'CPC', ato: 'Indicar assistente técnico e apresentar quesitos', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, art. 465, § 1º', dobro: true },
  { id: 'cpc-razoes-finais', codigo: 'CPC', ato: 'Razões finais escritas', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, art. 364, § 2º', dobro: true },
  { id: 'cpc-impedimento', codigo: 'CPC', ato: 'Exceção de impedimento ou suspeição', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, art. 146', marco: 'Ciência do fato que causa o impedimento ou a suspeição' },
  { id: 'cpc-desconsideracao', codigo: 'CPC', ato: 'Defesa no incidente de desconsideração da personalidade jurídica', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, art. 135', dobro: true },
  { id: 'cpc-apelacao', codigo: 'CPC', ato: 'Apelação', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, art. 1.003, § 5º', dobro: true },
  { id: 'cpc-contrarrazoes', codigo: 'CPC', ato: 'Contrarrazões de apelação', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, art. 1.010, § 1º', dobro: true },
  { id: 'cpc-adesivo', codigo: 'CPC', ato: 'Recurso adesivo', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, art. 997, § 2º', marco: 'Intimação para contrarrazões', dobro: true },
  { id: 'cpc-agravo-instrumento', codigo: 'CPC', ato: 'Agravo de instrumento', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, arts. 1.015 e 1.003, § 5º', dobro: true },
  { id: 'cpc-agravo-interno', codigo: 'CPC', ato: 'Agravo interno', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, art. 1.021', dobro: true },
  { id: 'cpc-ed', codigo: 'CPC', ato: 'Embargos de declaração', quantidade: 5, unidade: 'dias_uteis', base: 'CPC, art. 1.023', dobro: true },
  { id: 'cpc-resp-re', codigo: 'CPC', ato: 'Recurso especial ou extraordinário', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, art. 1.003, § 5º', dobro: true },
  { id: 'cpc-contrarrazoes-resp', codigo: 'CPC', ato: 'Contrarrazões de recurso especial ou extraordinário', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, art. 1.030', dobro: true },
  { id: 'cpc-agravo-resp', codigo: 'CPC', ato: 'Agravo em recurso especial ou extraordinário', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, art. 1.042', dobro: true },
  { id: 'cpc-ro', codigo: 'CPC', ato: 'Recurso ordinário constitucional', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, arts. 1.027 e 1.003, § 5º', dobro: true },
  { id: 'cpc-embargos-divergencia', codigo: 'CPC', ato: 'Embargos de divergência', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, arts. 1.043 e 1.003, § 5º', dobro: true },
  { id: 'cpc-pagamento-523', codigo: 'CPC', ato: 'Pagamento voluntário no cumprimento de sentença', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, art. 523', dobro: false },
  { id: 'cpc-impugnacao', codigo: 'CPC', ato: 'Impugnação ao cumprimento de sentença', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, art. 525', marco: 'Fim do prazo de pagamento voluntário', dobro: true },
  { id: 'cpc-impugnacao-fazenda', codigo: 'CPC', ato: 'Impugnação da Fazenda ao cumprimento de sentença', quantidade: 30, unidade: 'dias_uteis', base: 'CPC, art. 535', dobro: false, nota: 'O prazo de 30 dias já é o da Fazenda; não se dobra.' },
  { id: 'cpc-pagamento-829', codigo: 'CPC', ato: 'Pagamento na execução de título extrajudicial', quantidade: 3, unidade: 'dias_uteis', base: 'CPC, art. 829', marco: 'Citação do executado', dobro: false },
  { id: 'cpc-embargos-execucao', codigo: 'CPC', ato: 'Embargos à execução', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, art. 915', marco: 'Juntada do mandado ou AR de citação', dobro: true },
  { id: 'cpc-embargos-fazenda', codigo: 'CPC', ato: 'Embargos da Fazenda à execução', quantidade: 30, unidade: 'dias_uteis', base: 'CPC, art. 910', dobro: false, nota: 'O prazo de 30 dias já é o da Fazenda; não se dobra.' },
  { id: 'cpc-alimentos', codigo: 'CPC', ato: 'Execução de alimentos: pagar, provar o pagamento ou justificar', quantidade: 3, unidade: 'dias_uteis', base: 'CPC, art. 528', marco: 'Citação do executado', dobro: false },
  { id: 'cpc-monitoria', codigo: 'CPC', ato: 'Ação monitória: pagar ou opor embargos', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, arts. 701 e 702', marco: 'Juntada do mandado ou AR de citação', dobro: true },
  { id: 'cpc-embargos-terceiro', codigo: 'CPC', ato: 'Contestação nos embargos de terceiro', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, art. 679', dobro: true },
  { id: 'cpc-prestacao-contas', codigo: 'CPC', ato: 'Contestação na ação de exigir contas', quantidade: 15, unidade: 'dias_uteis', base: 'CPC, art. 550', dobro: true },
  { id: 'cpc-generico', codigo: 'CPC', ato: 'Manifestação sem prazo fixado pelo juiz', quantidade: 5, unidade: 'dias_uteis', base: 'CPC, art. 218, § 3º', dobro: true },
  { id: 'cpc-rescisoria', codigo: 'CPC', ato: 'Ação rescisória', quantidade: 2, unidade: 'anos', base: 'CPC, art. 975', natureza: 'material', marco: 'Trânsito em julgado da última decisão' },
  { id: 'cpc-juiz-despacho', codigo: 'CPC', ato: 'Prazo do juiz: despachos', quantidade: 5, unidade: 'dias_uteis', base: 'CPC, art. 226, I', natureza: 'improprio', marco: 'Conclusão dos autos', nota: 'Prazo impróprio: o descumprimento não gera preclusão, mas pode ser levado à corregedoria.' },
  { id: 'cpc-juiz-decisao', codigo: 'CPC', ato: 'Prazo do juiz: decisões interlocutórias', quantidade: 10, unidade: 'dias_uteis', base: 'CPC, art. 226, II', natureza: 'improprio', marco: 'Conclusão dos autos', nota: 'Prazo impróprio.' },
  { id: 'cpc-juiz-sentenca', codigo: 'CPC', ato: 'Prazo do juiz: sentença', quantidade: 30, unidade: 'dias_uteis', base: 'CPC, art. 226, III', natureza: 'improprio', marco: 'Conclusão dos autos', nota: 'Prazo impróprio.' },
  // ---------- CLT ----------
  { id: 'clt-ro', codigo: 'CLT', ato: 'Recurso ordinário', quantidade: 8, unidade: 'dias_uteis', base: 'CLT, arts. 775 e 895', dobro: true },
  { id: 'clt-ap', codigo: 'CLT', ato: 'Agravo de petição', quantidade: 8, unidade: 'dias_uteis', base: 'CLT, art. 897, a', dobro: true },
  { id: 'clt-ai', codigo: 'CLT', ato: 'Agravo de instrumento', quantidade: 8, unidade: 'dias_uteis', base: 'CLT, art. 897, b', dobro: true },
  { id: 'clt-rr', codigo: 'CLT', ato: 'Recurso de revista', quantidade: 8, unidade: 'dias_uteis', base: 'CLT, art. 896; Lei 5.584/70, art. 6º', dobro: true },
  { id: 'clt-contrarrazoes', codigo: 'CLT', ato: 'Contrarrazões a qualquer recurso', quantidade: 8, unidade: 'dias_uteis', base: 'Lei 5.584/70, art. 6º', dobro: true },
  { id: 'clt-embargos-tst', codigo: 'CLT', ato: 'Embargos no TST (divergência)', quantidade: 8, unidade: 'dias_uteis', base: 'CLT, art. 894', dobro: true },
  { id: 'clt-ed', codigo: 'CLT', ato: 'Embargos de declaração', quantidade: 5, unidade: 'dias_uteis', base: 'CLT, arts. 775 e 897-A', dobro: true },
  { id: 'clt-embargos-execucao', codigo: 'CLT', ato: 'Embargos à execução e impugnação à sentença de liquidação', quantidade: 5, unidade: 'dias_uteis', base: 'CLT, art. 884', marco: 'Garantia da execução ou penhora' },
  { id: 'clt-calculos', codigo: 'CLT', ato: 'Manifestação sobre os cálculos de liquidação', quantidade: 10, unidade: 'dias_uteis', base: 'CLT, art. 879, § 2º' },
  { id: 'clt-falta-grave', codigo: 'CLT', ato: 'Inquérito para apuração de falta grave (estável)', quantidade: 30, unidade: 'dias_corridos', base: 'CLT, art. 853; Súmula 403 do STF', natureza: 'material', marco: 'Suspensão do empregado' },
  { id: 'clt-verbas', codigo: 'CLT', ato: 'Pagamento das verbas rescisórias', quantidade: 10, unidade: 'dias_corridos', base: 'CLT, art. 477, § 6º', natureza: 'material', marco: 'Término do contrato' },
  { id: 'clt-prescricao-bienal', codigo: 'CLT', ato: 'Ação trabalhista (prescrição bienal)', quantidade: 2, unidade: 'anos', base: 'CF, art. 7º, XXIX', natureza: 'material', marco: 'Extinção do contrato de trabalho', nota: 'Dentro desses 2 anos, só se cobra o que ocorreu nos 5 anos anteriores ao ajuizamento (prescrição quinquenal).' },
  // ---------- CPP ----------
  { id: 'cpp-resposta', codigo: 'CPP', ato: 'Resposta à acusação', quantidade: 10, unidade: 'dias_corridos', base: 'CPP, art. 396', marco: 'Citação do acusado' },
  { id: 'cpp-memoriais', codigo: 'CPP', ato: 'Memoriais (alegações finais por escrito)', quantidade: 5, unidade: 'dias_corridos', base: 'CPP, art. 403, § 3º', nota: 'Quando o juiz, pela complexidade, autoriza memoriais em vez de debates orais.' },
  { id: 'cpp-apelacao', codigo: 'CPP', ato: 'Apelação criminal (interposição)', quantidade: 5, unidade: 'dias_corridos', base: 'CPP, art. 593' },
  { id: 'cpp-razoes', codigo: 'CPP', ato: 'Razões de apelação criminal', quantidade: 8, unidade: 'dias_corridos', base: 'CPP, art. 600', marco: 'Intimação para apresentar razões', nota: 'Nas contravenções, 3 dias.' },
  { id: 'cpp-rese', codigo: 'CPP', ato: 'Recurso em sentido estrito', quantidade: 5, unidade: 'dias_corridos', base: 'CPP, art. 586' },
  { id: 'cpp-razoes-rese', codigo: 'CPP', ato: 'Razões do recurso em sentido estrito', quantidade: 2, unidade: 'dias_corridos', base: 'CPP, art. 588', marco: 'Intimação para apresentar razões' },
  { id: 'cpp-ed', codigo: 'CPP', ato: 'Embargos de declaração', quantidade: 2, unidade: 'dias_corridos', base: 'CPP, art. 619' },
  { id: 'cpp-infringentes', codigo: 'CPP', ato: 'Embargos infringentes e de nulidade', quantidade: 10, unidade: 'dias_corridos', base: 'CPP, art. 609, parágrafo único' },
  { id: 'cpp-agravo-execucao', codigo: 'CPP', ato: 'Agravo em execução penal', quantidade: 5, unidade: 'dias_corridos', base: 'Lei 7.210/84, art. 197; Súmula 700 do STF' },
  { id: 'cpp-resp-re', codigo: 'CPP', ato: 'Recurso especial ou extraordinário penal', quantidade: 15, unidade: 'dias_corridos', base: 'CPC, art. 1.003, § 5º, c/c CPP, art. 3º', nota: 'O prazo é de 15 dias; confira se o tribunal conta em dias corridos (CPP) ou úteis (CPC).' },
  { id: 'cpp-queixa', codigo: 'CPP', ato: 'Queixa-crime ou representação (decadência)', quantidade: 6, unidade: 'meses', base: 'CPP, art. 38; CP, art. 103', natureza: 'material', marco: 'Ciência de quem é o autor do crime' },
  { id: 'cpp-queixa-subsidiaria', codigo: 'CPP', ato: 'Queixa subsidiária (ação privada subsidiária)', quantidade: 6, unidade: 'meses', base: 'CPP, art. 38', natureza: 'material', marco: 'Fim do prazo do Ministério Público para denunciar' },
  { id: 'cpp-denuncia-preso', codigo: 'CPP', ato: 'Denúncia: réu preso', quantidade: 5, unidade: 'dias_corridos', base: 'CPP, art. 46', natureza: 'improprio', marco: 'Recebimento do inquérito pelo Ministério Público' },
  { id: 'cpp-denuncia-solto', codigo: 'CPP', ato: 'Denúncia: réu solto', quantidade: 15, unidade: 'dias_corridos', base: 'CPP, art. 46', natureza: 'improprio', marco: 'Recebimento do inquérito pelo Ministério Público' },
  { id: 'cpp-inquerito-preso', codigo: 'CPP', ato: 'Conclusão do inquérito: indiciado preso', quantidade: 10, unidade: 'dias_corridos', base: 'CPP, art. 10', natureza: 'improprio', marco: 'Prisão' },
  { id: 'cpp-inquerito-solto', codigo: 'CPP', ato: 'Conclusão do inquérito: indiciado solto', quantidade: 30, unidade: 'dias_corridos', base: 'CPP, art. 10', natureza: 'improprio', marco: 'Instauração do inquérito' },
  // ---------- Juizados ----------
  { id: 'jec-recurso', codigo: 'JEC', ato: 'Recurso inominado', quantidade: 10, unidade: 'dias_uteis', base: 'Lei 9.099/95, arts. 12-A e 42' },
  { id: 'jec-contrarrazoes', codigo: 'JEC', ato: 'Contrarrazões ao recurso inominado', quantidade: 10, unidade: 'dias_uteis', base: 'Lei 9.099/95, arts. 12-A e 42, § 2º' },
  { id: 'jec-ed', codigo: 'JEC', ato: 'Embargos de declaração', quantidade: 5, unidade: 'dias_uteis', base: 'Lei 9.099/95, arts. 12-A e 49' },
  { id: 'jec-criminal-apelacao', codigo: 'JEC', ato: 'Apelação no Juizado Criminal (com as razões)', quantidade: 10, unidade: 'dias_uteis', base: 'Lei 9.099/95, art. 82, § 1º', nota: 'Confira se o tribunal conta em dias úteis ou corridos; na dúvida, use a data mais cedo.' },
  // ---------- Execução fiscal ----------
  { id: 'lef-garantir', codigo: 'LEF', ato: 'Pagar ou garantir a execução', quantidade: 5, unidade: 'dias_uteis', base: 'Lei 6.830/80, art. 8º', marco: 'Citação do executado', dobro: false },
  { id: 'lef-embargos', codigo: 'LEF', ato: 'Embargos à execução fiscal', quantidade: 30, unidade: 'dias_uteis', base: 'Lei 6.830/80, art. 16', marco: 'Depósito, juntada da fiança ou intimação da penhora', dobro: false },
  { id: 'lef-impugnacao', codigo: 'LEF', ato: 'Impugnação da Fazenda aos embargos', quantidade: 30, unidade: 'dias_uteis', base: 'Lei 6.830/80, art. 17', dobro: false },
  { id: 'lef-infringentes', codigo: 'LEF', ato: 'Embargos infringentes (execução de pequeno valor)', quantidade: 10, unidade: 'dias_uteis', base: 'Lei 6.830/80, art. 34, § 1º' },
  // ---------- Mandado de segurança ----------
  { id: 'ms-impetracao', codigo: 'MS', ato: 'Impetração do mandado de segurança', quantidade: 120, unidade: 'dias_corridos', base: 'Lei 12.016/2009, art. 23', natureza: 'material', marco: 'Ciência do ato impugnado', nota: 'Decadência: não se suspende nem se interrompe.' },
  { id: 'ms-informacoes', codigo: 'MS', ato: 'Informações da autoridade coatora', quantidade: 10, unidade: 'dias_corridos', base: 'Lei 12.016/2009, art. 7º, I', natureza: 'improprio', marco: 'Notificação da autoridade' },
  { id: 'ms-parecer-mp', codigo: 'MS', ato: 'Parecer do Ministério Público', quantidade: 10, unidade: 'dias_corridos', base: 'Lei 12.016/2009, art. 12', natureza: 'improprio', marco: 'Fim do prazo das informações' },
  { id: 'ms-apelacao', codigo: 'MS', ato: 'Apelação da sentença do mandado de segurança', quantidade: 15, unidade: 'dias_uteis', base: 'Lei 12.016/2009, art. 14; CPC, art. 1.003, § 5º', dobro: true },
  // ---------- ECA ----------
  { id: 'eca-defesa-previa', codigo: 'ECA', ato: 'Defesa prévia no ato infracional', quantidade: 3, unidade: 'dias_corridos', base: 'Lei 8.069/90, art. 186, § 3º', marco: 'Audiência de apresentação' },
  { id: 'eca-resposta-dpf', codigo: 'ECA', ato: 'Resposta na ação de destituição do poder familiar', quantidade: 10, unidade: 'dias_corridos', base: 'Lei 8.069/90, art. 158', marco: 'Citação' },
  { id: 'eca-apelacao', codigo: 'ECA', ato: 'Apelação', quantidade: 10, unidade: 'dias_corridos', base: 'Lei 8.069/90, art. 198, II', nota: 'Prazo único de 10 dias para o Ministério Público e para a defesa.' },
  { id: 'eca-agravo', codigo: 'ECA', ato: 'Agravo de instrumento', quantidade: 10, unidade: 'dias_corridos', base: 'Lei 8.069/90, art. 198, II' },
  // ---------- Locação ----------
  { id: 'loc-purgacao', codigo: 'LOC', ato: 'Purgação da mora na ação de despejo', quantidade: 15, unidade: 'dias_uteis', base: 'Lei 8.245/91, art. 62, II', marco: 'Citação', nota: 'Só uma vez a cada 24 meses (art. 62, parágrafo único).' },
  { id: 'loc-preferencia', codigo: 'LOC', ato: 'Resposta do locatário ao direito de preferência', quantidade: 30, unidade: 'dias_corridos', base: 'Lei 8.245/91, art. 28', natureza: 'material', marco: 'Recebimento da notícia da venda' },
  { id: 'loc-denuncia-locatario', codigo: 'LOC', ato: 'Aviso do locatário para devolver o imóvel', quantidade: 30, unidade: 'dias_corridos', base: 'Lei 8.245/91, art. 6º', natureza: 'material', marco: 'Entrega do aviso por escrito' },
  { id: 'loc-desocupar', codigo: 'LOC', ato: 'Desocupação após notificação (denúncia vazia)', quantidade: 30, unidade: 'dias_corridos', base: 'Lei 8.245/91, art. 46, § 2º', natureza: 'material', marco: 'Notificação ao locatário' },
  { id: 'loc-fianca', codigo: 'LOC', ato: 'Exoneração do fiador: fim da responsabilidade', quantidade: 120, unidade: 'dias_corridos', base: 'Lei 8.245/91, art. 40, X e parágrafo único', natureza: 'material', marco: 'Notificação ao locador da exoneração' },
  // ---------- Consumidor ----------
  { id: 'cdc-vicio-naoduravel', codigo: 'CDC', ato: 'Reclamar de vício aparente: produto ou serviço não durável', quantidade: 30, unidade: 'dias_corridos', base: 'CDC, art. 26, I', natureza: 'material', marco: 'Entrega do produto ou fim do serviço' },
  { id: 'cdc-vicio-duravel', codigo: 'CDC', ato: 'Reclamar de vício aparente: produto ou serviço durável', quantidade: 90, unidade: 'dias_corridos', base: 'CDC, art. 26, II', natureza: 'material', marco: 'Entrega do produto ou fim do serviço', nota: 'Vício oculto: o prazo conta de quando o vício fica evidente (art. 26, § 3º).' },
  { id: 'cdc-saneamento', codigo: 'CDC', ato: 'Prazo do fornecedor para sanar o vício', quantidade: 30, unidade: 'dias_corridos', base: 'CDC, art. 18, § 1º', natureza: 'material', marco: 'Reclamação do consumidor' },
  { id: 'cdc-arrependimento', codigo: 'CDC', ato: 'Arrependimento de compra fora do estabelecimento', quantidade: 7, unidade: 'dias_corridos', base: 'CDC, art. 49', natureza: 'material', marco: 'Assinatura do contrato ou recebimento do produto' },
  { id: 'cdc-fato-produto', codigo: 'CDC', ato: 'Reparação por fato do produto ou do serviço (prescrição)', quantidade: 5, unidade: 'anos', base: 'CDC, art. 27', natureza: 'material', marco: 'Conhecimento do dano e de sua autoria' },
  // ---------- Recuperação e falência ----------
  { id: 'fal-habilitacao', codigo: 'FAL', ato: 'Habilitação ou divergência de crédito', quantidade: 15, unidade: 'dias_corridos', base: 'Lei 11.101/2005, art. 7º, § 1º', marco: 'Publicação do edital' },
  { id: 'fal-impugnacao', codigo: 'FAL', ato: 'Impugnação de crédito', quantidade: 10, unidade: 'dias_corridos', base: 'Lei 11.101/2005, art. 8º', marco: 'Publicação do edital com a relação do administrador judicial' },
  { id: 'fal-contestacao-impugnacao', codigo: 'FAL', ato: 'Contestação à impugnação de crédito', quantidade: 5, unidade: 'dias_corridos', base: 'Lei 11.101/2005, art. 11' },
  { id: 'fal-plano', codigo: 'FAL', ato: 'Apresentar o plano de recuperação judicial', quantidade: 60, unidade: 'dias_corridos', base: 'Lei 11.101/2005, art. 53', marco: 'Publicação da decisão que defere o processamento', nota: 'Prazo improrrogável: o descumprimento leva à falência.' },
  { id: 'fal-objecao', codigo: 'FAL', ato: 'Objeção ao plano de recuperação judicial', quantidade: 30, unidade: 'dias_corridos', base: 'Lei 11.101/2005, art. 55', marco: 'Publicação do aviso de recebimento do plano' },
  { id: 'fal-contestacao-falencia', codigo: 'FAL', ato: 'Contestação do pedido de falência', quantidade: 10, unidade: 'dias_corridos', base: 'Lei 11.101/2005, art. 98', marco: 'Citação' },
  { id: 'fal-deposito', codigo: 'FAL', ato: 'Depósito elisivo da falência', quantidade: 10, unidade: 'dias_corridos', base: 'Lei 11.101/2005, art. 98, parágrafo único', marco: 'Citação' },
  // ---------- Prescrição e decadência ----------
  { id: 'presc-geral', codigo: 'PRESC', ato: 'Prescrição geral', quantidade: 10, unidade: 'anos', base: 'CC, art. 205', natureza: 'material', marco: 'Violação do direito' },
  { id: 'presc-reparacao', codigo: 'PRESC', ato: 'Reparação civil', quantidade: 3, unidade: 'anos', base: 'CC, art. 206, § 3º, V', natureza: 'material', marco: 'Fato danoso' },
  { id: 'presc-divida', codigo: 'PRESC', ato: 'Cobrança de dívida líquida constante de instrumento', quantidade: 5, unidade: 'anos', base: 'CC, art. 206, § 5º, I', natureza: 'material', marco: 'Vencimento da dívida' },
  { id: 'presc-alimentos', codigo: 'PRESC', ato: 'Cobrança de prestações alimentares', quantidade: 2, unidade: 'anos', base: 'CC, art. 206, § 2º', natureza: 'material', marco: 'Vencimento de cada prestação' },
  { id: 'presc-seguro', codigo: 'PRESC', ato: 'Pretensão do segurado contra o segurador', quantidade: 1, unidade: 'anos', base: 'CC, art. 206, § 1º, II', natureza: 'material', marco: 'Ciência do fato gerador' },
  { id: 'presc-aluguel', codigo: 'PRESC', ato: 'Cobrança de aluguéis', quantidade: 3, unidade: 'anos', base: 'CC, art. 206, § 3º, I', natureza: 'material', marco: 'Vencimento de cada aluguel' },
  { id: 'presc-tributo-lancamento', codigo: 'PRESC', ato: 'Decadência do lançamento do tributo', quantidade: 5, unidade: 'anos', base: 'CTN, arts. 150, § 4º, e 173', natureza: 'material', marco: 'Fato gerador (ou 1º de janeiro do ano seguinte, conforme o caso)' },
  { id: 'presc-tributo-cobranca', codigo: 'PRESC', ato: 'Prescrição da cobrança do crédito tributário', quantidade: 5, unidade: 'anos', base: 'CTN, art. 174', natureza: 'material', marco: 'Constituição definitiva do crédito' },
  { id: 'presc-repeticao', codigo: 'PRESC', ato: 'Repetição de indébito tributário', quantidade: 5, unidade: 'anos', base: 'CTN, art. 168', natureza: 'material', marco: 'Pagamento indevido' },
  { id: 'presc-improbidade', codigo: 'PRESC', ato: 'Ação de improbidade administrativa', quantidade: 8, unidade: 'anos', base: 'Lei 8.429/92, art. 23 (Lei 14.230/2021)', natureza: 'material', marco: 'Fato (ou cessação da permanência)' },
  { id: 'presc-acao-popular', codigo: 'PRESC', ato: 'Ação popular', quantidade: 5, unidade: 'anos', base: 'Lei 4.717/65, art. 21', natureza: 'material', marco: 'Ato lesivo' },
]

export const PRERROGATIVAS_DOBRO: Record<string, string> = {
  nenhuma: 'Sem prazo em dobro',
  fazenda: 'Fazenda Pública (CPC, art. 183)',
  mp: 'Ministério Público (CPC, art. 180)',
  defensoria: 'Defensoria Pública ou núcleo de prática jurídica (CPC, art. 186)',
  litisconsortes: 'Litisconsortes com advogados diferentes, autos físicos (CPC, art. 229)',
}

export const rotuloPrazo = (a: AtoPrazo) => {
  const u = a.unidade === 'dias_uteis' ? (a.quantidade === 1 ? 'dia útil' : 'dias úteis') : a.unidade === 'dias_corridos' ? (a.quantidade === 1 ? 'dia corrido' : 'dias corridos') : a.unidade === 'meses' ? (a.quantidade === 1 ? 'mês' : 'meses') : (a.quantidade === 1 ? 'ano' : 'anos')
  return `${a.quantidade} ${u}`
}

export type ResultadoPrazo = { final: string; diaSemana: string; unidade: Unidade; quantidade: number; pulados: { data: string; motivo: string }[]; avisos: string[]; prorrogado: boolean }

/** Calcula o fim do prazo pelo regime do código. `inicio` é a data do marco (intimação, trânsito em julgado, citação…). */
export function calcularPrazoPorCodigo(ato: AtoPrazo, inicio: string, prerrogativa = 'nenhuma'): ResultadoPrazo {
  const avisos: string[] = []
  if (ato.nota) avisos.push(ato.nota)
  if (ato.natureza === 'improprio') avisos.push('Prazo impróprio (dirigido ao juiz, ao Ministério Público ou à autoridade): o vencimento não gera preclusão automática.')
  let dobro = false
  if (prerrogativa !== 'nenhuma') {
    if (ato.dobro) dobro = true
    else avisos.push('Este ato não admite prazo em dobro (regra própria do código ou prazo já diferenciado).')
  }
  if (dobro && ato.codigo === 'CLT') avisos.push('Na Justiça do Trabalho, o prazo em dobro da Fazenda segue o Decreto-Lei 779/69; confira o caso concreto.')
  const q = dobro ? ato.quantidade * 2 : ato.quantidade
  let final: string
  let pulados: { data: string; motivo: string }[] = []
  let prorrogado = false
  if (ato.unidade === 'dias_uteis') {
    const r = calcularPrazo(inicio, q)
    final = r.final; pulados = r.pulados
  } else if (ato.unidade === 'dias_corridos') {
    const venc = somarDias(inicio, q)
    final = prorrogarParaDiaUtil(venc); prorrogado = final !== venc
    if (prorrogado) pulados.push({ data: venc, motivo: 'vencimento em dia sem expediente: passa ao dia útil seguinte' })
  } else {
    const venc = somarMeses(inicio, ato.unidade === 'anos' ? q * 12 : q)
    final = prorrogarParaDiaUtil(venc); prorrogado = final !== venc
    if (prorrogado) pulados.push({ data: venc, motivo: 'vencimento em dia sem expediente: passa ao dia útil seguinte' })
  }
  if (ato.unidade !== 'dias_uteis' && diaUtil(paraData(final))) avisos.push('A data final cai em dia sem expediente; confira a regra do tribunal.')
  return { final, diaSemana: diaDaSemana(final), unidade: ato.unidade, quantidade: q, pulados, avisos, prorrogado }
}

export const resumoPrazo = (a: AtoPrazo, inicio: string, r: ResultadoPrazo) =>
  `${a.ato} (${CODIGOS[a.codigo].sigla}) — ${r.quantidade} ${r.unidade.replace('_', ' ')} a partir de ${br(inicio)}: vence em ${br(r.final)} (${r.diaSemana}). Base: ${a.base}.`
