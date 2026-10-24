import { diasAte, emDias } from '@/lib/datas'

export interface DocumentoMock {
  id: string
  tipo: string
  nome: string
  dataVencimento?: string
  status: 'valido' | 'vencido' | 'a_renovar'
}

export interface AlertaMock {
  id: string
  tipo: string
  dataEvento: string
  diasRestantes: number
}

export interface ContratoMock {
  id: string
  imovel: string
  locatario: string
  tipo: string
  dataInicio: string
  dataVencimento: string | null
  valorMensal: number
  indiceReajuste: string
  dataUltimoReajuste: string | null
  notas: string
  documentos: DocumentoMock[]
  alertas: AlertaMock[]
}

/** O status nunca é guardado: é lido da data de vencimento, para não envelhecer. */
export function statusDoContrato(c: ContratoMock): 'ativo' | 'vencido' | 'a_renovar' {
  const dias = diasAte(c.dataVencimento)
  if (dias === null) return 'ativo'
  if (dias < 0) return 'vencido'
  if (dias <= 60) return 'a_renovar'
  return 'ativo'
}

function doc(
  id: string,
  tipo: string,
  nome: string,
  status: DocumentoMock['status'],
  venceEmDias?: number
): DocumentoMock {
  return {
    id,
    tipo,
    nome,
    status,
    ...(venceEmDias === undefined ? {} : { dataVencimento: emDias(venceEmDias) }),
  }
}

function alerta(id: string, tipo: string, dias: number): AlertaMock {
  return { id, tipo, dataEvento: emDias(dias), diasRestantes: dias }
}

const BASE: Record<string, Omit<ContratoMock, 'id'>> = {
  '1': {
    imovel: 'Av. Paulista 1000, São Paulo, SP',
    locatario: 'Tech Innovations Brasil Ltda',
    tipo: 'Locação comercial',
    dataInicio: emDias(-860),
    dataVencimento: emDias(52),
    valorMensal: 25000,
    indiceReajuste: 'IPCA',
    dataUltimoReajuste: emDias(-130),
    notas: 'Escritório de 1.200 m² distribuído em três andares. Cláusula de renovação automática.',
    documentos: [
      doc('d1', 'Contrato de locação', 'Contrato_Paulista.pdf', 'a_renovar', 52),
      doc('d2', 'Aditivo contratual', 'Aditivo_reajuste.pdf', 'valido'),
      doc('d3', 'Matrícula RGI', 'Matricula_789456.pdf', 'valido'),
      doc('d4', 'IPTU', 'IPTU_exercicio_corrente.pdf', 'valido', 180),
      doc('d5', 'Habite-se', 'Habite_se.pdf', 'valido'),
    ],
    alertas: [alerta('a1', 'Vencimento de contrato', 52), alerta('a2', 'Reajuste anual pelo IPCA', 176)],
  },
  '3': {
    imovel: 'Lagoa Rodrigo de Freitas 200, Rio de Janeiro, RJ',
    locatario: 'Consultoria RJ Assessoria Empresarial',
    tipo: 'Locação residencial',
    dataInicio: emDias(-1320),
    dataVencimento: emDias(15),
    valorMensal: 7500,
    indiceReajuste: 'IGP-M',
    dataUltimoReajuste: emDias(-240),
    notas: 'Apartamento de 180 m² com três suítes e duas vagas. Vista para a lagoa.',
    documentos: [
      doc('d1', 'Contrato de locação', 'Contrato_Lagoa.pdf', 'a_renovar', 15),
      doc('d2', 'Matrícula RGI', 'Matricula_456789.pdf', 'valido'),
      doc('d3', 'IPTU', 'IPTU_exercicio_corrente.pdf', 'valido', 180),
      doc('d4', 'AVCB', 'AVCB.pdf', 'vencido', -39),
    ],
    alertas: [alerta('a1', 'Vencimento de contrato', 15), alerta('a2', 'AVCB vencido', -39)],
  },
  '4': {
    imovel: 'Copacabana Praia 100, Rio de Janeiro, RJ',
    locatario: 'Grupo Hoteleiro América Premium',
    tipo: 'Locação comercial — hotel',
    dataInicio: emDias(-1750),
    dataVencimento: emDias(250),
    valorMensal: 85000,
    indiceReajuste: 'Fixo',
    dataUltimoReajuste: null,
    notas: 'Hotel com 150 unidades habitacionais. Aluguel fixo anual, sem índice de reajuste.',
    documentos: [
      doc('d1', 'Contrato de locação', 'Contrato_Hotel.pdf', 'valido', 250),
      doc('d2', 'Aditivo de extensão', 'Aditivo_extensao.pdf', 'valido'),
      doc('d3', 'Matrícula RGI', 'Matricula_123789.pdf', 'valido'),
      doc('d4', 'Alvará de funcionamento', 'Alvara_funcionamento.pdf', 'vencido', -45),
      doc('d5', 'AVCB', 'AVCB.pdf', 'a_renovar', 37),
      doc('d6', 'Seguro de responsabilidade civil', 'Seguro_RC.pdf', 'valido', 300),
    ],
    alertas: [alerta('a1', 'Alvará de funcionamento vencido', -45), alerta('a2', 'Vencimento do AVCB', 37)],
  },
  '5': {
    imovel: 'Morumbi Apt 1501, São Paulo, SP',
    locatario: 'Uso próprio da família',
    tipo: 'Comodato',
    dataInicio: emDias(-2130),
    dataVencimento: null,
    valorMensal: 0,
    indiceReajuste: 'Não se aplica',
    dataUltimoReajuste: null,
    notas: 'Duplex de 380 m² com três suítes, piscina e sauna. Sem contraprestação financeira.',
    documentos: [
      doc('d1', 'Matrícula RGI', 'Matricula_789123.pdf', 'valido'),
      doc('d2', 'IPTU', 'IPTU_exercicio_corrente.pdf', 'valido', 180),
      doc('d3', 'Regulamento do condomínio', 'Regulamento.pdf', 'valido'),
    ],
    alertas: [],
  },
  '6': {
    imovel: 'Vila Mariana Loja 10, São Paulo, SP',
    locatario: 'Varejo Premium Fashion Brasil',
    tipo: 'Locação comercial',
    dataInicio: emDias(-780),
    dataVencimento: emDias(120),
    valorMensal: 18000,
    indiceReajuste: 'IPCA',
    dataUltimoReajuste: emDias(-55),
    notas: 'Loja de 200 m² em zona comercial consolidada.',
    documentos: [
      doc('d1', 'Contrato de locação', 'Contrato_VilaMariana.pdf', 'valido', 120),
      doc('d2', 'Matrícula RGI', 'Matricula_654123.pdf', 'valido'),
      doc('d3', 'AVCB', 'AVCB.pdf', 'a_renovar', 60),
    ],
    alertas: [alerta('a1', 'Vencimento do AVCB', 60)],
  },
  '9': {
    imovel: 'Jardins Apto 401, São Paulo, SP',
    locatario: 'Incorporadora ABC',
    tipo: 'Locação residencial',
    dataInicio: emDias(-740),
    dataVencimento: emDias(-10),
    valorMensal: 12000,
    indiceReajuste: 'IGP-M',
    dataUltimoReajuste: emDias(-375),
    notas: 'Contrato vencido e ainda não renovado. Requer providência imediata.',
    documentos: [
      doc('d1', 'Contrato de locação', 'Contrato_Jardins.pdf', 'vencido', -10),
      doc('d2', 'IPTU', 'IPTU_exercicio_corrente.pdf', 'valido', 180),
    ],
    alertas: [alerta('a1', 'Contrato vencido', -10)],
  },
  '11': {
    imovel: 'Santo André Apt 201, São Paulo, SP',
    locatario: 'Carlos Mendes',
    tipo: 'Locação residencial',
    dataInicio: emDias(-1095),
    dataVencimento: emDias(0),
    valorMensal: 3200,
    indiceReajuste: 'IPCA',
    dataUltimoReajuste: emDias(-365),
    notas: 'Contrato vence hoje. Renovação pendente de assinatura.',
    documentos: [
      doc('d1', 'Contrato de locação', 'Contrato_SantoAndre.pdf', 'a_renovar', 0),
      doc('d2', 'Matrícula RGI', 'Matricula_123499.pdf', 'valido'),
    ],
    alertas: [alerta('a1', 'Vencimento de contrato', 0)],
  },
}

export const CONTRATOS_MOCK: Record<string, ContratoMock> = Object.fromEntries(
  Object.entries(BASE).map(([id, c]) => [id, { id, ...c }])
)

export function contratoPorImovel(id: string | undefined): ContratoMock | null {
  if (!id) return null
  return CONTRATOS_MOCK[id] ?? null
}
