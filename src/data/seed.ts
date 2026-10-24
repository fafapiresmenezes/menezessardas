import { emDias } from '@/lib/datas'
import type { Contrato, Documento, Imovel } from '@/lib/repositorio'

const doc = (
  id: string,
  tipo: Documento['tipo'],
  nome: string,
  venceEmDias?: number
): Documento => ({
  id,
  tipo,
  nome,
  enviadoEm: emDias(-30),
  ...(venceEmDias === undefined ? {} : { dataVencimento: emDias(venceEmDias) }),
})

/** Carteira fictícia de exemplo. Some assim que houver dados reais. */
export const IMOVEIS_SEED: Imovel[] = [
  { id: '1', endereco: 'Av. Paulista 1000', cidade: 'São Paulo', uf: 'SP', tipo: 'conjunto_comercial', uso: 'locado', proprietario: 'João Silva', matricula: '123456789', areaM2: 1200, notas: 'Edifício comercial, três andares.',
    documentos: [doc('1-m', 'matricula_rgi', 'Matricula_789456.pdf'), doc('1-i', 'iptu', 'IPTU_exercicio.pdf', 180), doc('1-h', 'habite_se', 'Habite_se.pdf'), doc('1-a', 'avcb', 'AVCB.pdf', 200), doc('1-f', 'alvara_funcionamento', 'Alvara.pdf', 300)] },
  { id: '2', endereco: 'Rua Oscar Freire 500', cidade: 'São Paulo', uf: 'SP', tipo: 'apartamento', uso: 'uso_proprio', proprietario: 'Maria Santos', matricula: '123456790', areaM2: 140, notas: '',
    documentos: [doc('2-m', 'matricula_rgi', 'Matricula_790.pdf'), doc('2-i', 'iptu', 'IPTU_exercicio.pdf', 200), doc('2-h', 'habite_se', 'Habite_se.pdf')] },
  { id: '3', endereco: 'Av. Epitácio Pessoa 200', cidade: 'Rio de Janeiro', uf: 'RJ', tipo: 'apartamento', uso: 'locado', proprietario: 'Pedro Costa', matricula: '123456791', areaM2: 180, notas: 'Lagoa Rodrigo de Freitas. Vista para a lagoa.',
    documentos: [doc('3-m', 'matricula_rgi', 'Matricula_456789.pdf'), doc('3-i', 'iptu', 'IPTU_exercicio.pdf', 180), doc('3-h', 'habite_se', 'Habite_se.pdf'), doc('3-a', 'avcb', 'CBMERJ.pdf', -39)] },
  { id: '4', endereco: 'Av. Atlântica 100', cidade: 'Rio de Janeiro', uf: 'RJ', tipo: 'hotel', uso: 'locado', proprietario: 'Hotel ABC Ltda', matricula: '123456792', areaM2: 9800, notas: 'Copacabana. Hotel com 150 unidades.',
    documentos: [doc('4-m', 'matricula_rgi', 'Matricula_123789.pdf'), doc('4-i', 'iptu', 'IPTU_exercicio.pdf', 180), doc('4-h', 'habite_se', 'Habite_se.pdf'), doc('4-f', 'alvara_funcionamento', 'Alvara_funcionamento.pdf', -45), doc('4-a', 'avcb', 'CBMERJ.pdf', 37), doc('4-s', 'seguro_incendio', 'Seguro_incendio.pdf', 300)] },
  { id: '5', endereco: 'Rua Morumbi 1501, apto 1501', cidade: 'São Paulo', uf: 'SP', tipo: 'apartamento', uso: 'comodato', proprietario: 'Ana Oliveira', matricula: '123456793', areaM2: 380, notas: 'Duplex. Uso da família.',
    documentos: [doc('5-m', 'matricula_rgi', 'Matricula_789123.pdf'), doc('5-i', 'iptu', 'IPTU_exercicio.pdf', 180), doc('5-h', 'habite_se', 'Habite_se.pdf'), doc('5-c', 'convencao_condominio', 'Convencao.pdf')] },
  { id: '6', endereco: 'Rua Vergueiro 10, loja 10', cidade: 'São Paulo', uf: 'SP', tipo: 'loja', uso: 'locado', proprietario: 'Loja XYZ Ltda', matricula: '123456794', areaM2: 200, notas: 'Vila Mariana.',
    documentos: [doc('6-m', 'matricula_rgi', 'Matricula_654123.pdf'), doc('6-i', 'iptu', 'IPTU_exercicio.pdf', 180), doc('6-a', 'avcb', 'AVCB.pdf', 60), doc('6-f', 'alvara_funcionamento', 'Alvara.pdf', 250)] },
  { id: '7', endereco: 'Rua dos Pinheiros 50, vaga A1', cidade: 'São Paulo', uf: 'SP', tipo: 'garagem', uso: 'locado', proprietario: 'João Silva', matricula: '123456795', areaM2: 12, notas: '',
    documentos: [doc('7-m', 'matricula_rgi', 'Matricula_795.pdf'), doc('7-i', 'iptu', 'IPTU_exercicio.pdf', 180)] },
  { id: '8', endereco: 'Rua Icaraí, lote 12', cidade: 'Niterói', uf: 'RJ', tipo: 'terreno', uso: 'vago', proprietario: 'Dev Imóveis Ltda', matricula: '123456796', areaM2: 500, notas: '',
    documentos: [doc('8-m', 'matricula_rgi', 'Matricula_796.pdf')] },
  { id: '9', endereco: 'Al. Jardins 401, apto 401', cidade: 'São Paulo', uf: 'SP', tipo: 'apartamento', uso: 'em_construcao', proprietario: 'Incorporadora ABC', matricula: '123456797', areaM2: 95, notas: 'Entrega prevista para o próximo ano.',
    documentos: [doc('9-m', 'matricula_rgi', 'Matricula_797.pdf'), doc('9-i', 'iptu', 'IPTU_exercicio.pdf', 180), doc('9-c', 'alvara_construcao', 'Alvara_obra.pdf', 400)] },
  { id: '10', endereco: 'Rua Bela Vista 77, loja', cidade: 'São Paulo', uf: 'SP', tipo: 'loja', uso: 'locado', proprietario: 'Loja 2 Ltda', matricula: '123456798', areaM2: 90, notas: '',
    documentos: [doc('10-m', 'matricula_rgi', 'Matricula_798.pdf'), doc('10-i', 'iptu', 'IPTU_exercicio.pdf', 180), doc('10-h', 'habite_se', 'Habite_se.pdf'), doc('10-f', 'alvara_funcionamento', 'Alvara.pdf', 90)] },
  { id: '11', endereco: 'Rua Santo André 201, apto 201', cidade: 'Santo André', uf: 'SP', tipo: 'apartamento', uso: 'locado', proprietario: 'Carlos Mendes', matricula: '123456799', areaM2: 70, notas: '',
    documentos: [doc('11-m', 'matricula_rgi', 'Matricula_799.pdf'), doc('11-i', 'iptu', 'IPTU_exercicio.pdf', 180), doc('11-h', 'habite_se', 'Habite_se.pdf')] },
  { id: '12', endereco: 'Av. Goiás 300, conjunto 12', cidade: 'São Caetano do Sul', uf: 'SP', tipo: 'conjunto_comercial', uso: 'uso_proprio', proprietario: 'Empresas XYZ', matricula: '123456800', areaM2: 260, notas: '',
    documentos: [doc('12-m', 'matricula_rgi', 'Matricula_800.pdf'), doc('12-i', 'iptu', 'IPTU_exercicio.pdf', 180), doc('12-h', 'habite_se', 'Habite_se.pdf'), doc('12-a', 'avcb', 'AVCB.pdf', 150), doc('12-f', 'alvara_funcionamento', 'Alvara.pdf', 320)] },
]

export const CONTRATOS_SEED: Contrato[] = [
  { id: 'c1', imovelId: '1', tipo: 'locacao_comercial', parte: 'Tech Innovations Brasil Ltda', dataInicio: emDias(-860), dataVencimento: emDias(52), valor: 25000, periodicidade: 'mensal', indice: 'ipca', garantia: 'seguro_fianca', dataUltimoReajuste: emDias(-130), notas: 'Cláusula de renovação automática.', criadoEm: emDias(-860),
    arquivo: { nome: 'Contrato_Paulista.pdf', tamanho: 412000 }, documentos: [doc('c1-a', 'aditivo', 'Aditivo_reajuste.pdf')] },
  { id: 'c3', imovelId: '3', tipo: 'locacao_residencial', parte: 'Consultoria RJ Assessoria Empresarial', dataInicio: emDias(-1320), dataVencimento: emDias(15), valor: 7500, periodicidade: 'mensal', indice: 'igpm', garantia: 'fiador', dataUltimoReajuste: emDias(-240), notas: 'Três suítes, duas vagas.', criadoEm: emDias(-1320),
    arquivo: { nome: 'Contrato_Lagoa.pdf', tamanho: 380000 }, documentos: [doc('c3-v', 'laudo_vistoria', 'Vistoria_entrada.pdf')] },
  { id: 'c4', imovelId: '4', tipo: 'arrendamento', parte: 'Grupo Hoteleiro América Premium', dataInicio: emDias(-1750), dataVencimento: emDias(250), valor: 85000, periodicidade: 'mensal', indice: 'fixo', garantia: 'caucao', dataUltimoReajuste: null, notas: 'Aluguel fixo anual, sem índice.', criadoEm: emDias(-1750),
    arquivo: { nome: 'Contrato_Hotel.pdf', tamanho: 1200000 }, documentos: [doc('c4-a', 'aditivo', 'Aditivo_extensao.pdf'), doc('c4-c', 'certidao_negativa', 'Certidoes_operador.pdf', 120)] },
  { id: 'c5', imovelId: '5', tipo: 'comodato', parte: 'Família Oliveira', dataInicio: emDias(-2130), dataVencimento: null, valor: 0, periodicidade: 'unica', indice: 'sem_reajuste', garantia: 'sem_garantia', dataUltimoReajuste: null, notas: 'Sem contraprestação.', criadoEm: emDias(-2130),
    documentos: [] },
  { id: 'c6', imovelId: '6', tipo: 'locacao_comercial', parte: 'Varejo Premium Fashion Brasil', dataInicio: emDias(-780), dataVencimento: emDias(120), valor: 18000, periodicidade: 'mensal', indice: 'ipca', garantia: 'seguro_fianca', dataUltimoReajuste: emDias(-55), notas: '', criadoEm: emDias(-780),
    arquivo: { nome: 'Contrato_VilaMariana.pdf', tamanho: 350000 }, documentos: [] },
  { id: 'c7', imovelId: '7', tipo: 'locacao_residencial', parte: 'Roberto Lima', dataInicio: emDias(-630), dataVencimento: emDias(100), valor: 800, periodicidade: 'mensal', indice: 'fixo', garantia: 'caucao', dataUltimoReajuste: null, notas: 'Vaga mensal.', criadoEm: emDias(-630),
    documentos: [] },
  { id: 'c9', imovelId: '9', tipo: 'built_to_suit', parte: 'Incorporadora ABC', dataInicio: emDias(-740), dataVencimento: emDias(-10), valor: 12000, periodicidade: 'mensal', indice: 'igpm', garantia: 'sem_garantia', dataUltimoReajuste: emDias(-375), notas: 'Contrato vencido e ainda não renovado.', criadoEm: emDias(-740),
    arquivo: { nome: 'Contrato_Jardins.pdf', tamanho: 290000 }, documentos: [] },
  { id: 'c10', imovelId: '10', tipo: 'locacao_comercial', parte: 'Loja 2 Ltda', dataInicio: emDias(-705), dataVencimento: emDias(25), valor: 6500, periodicidade: 'mensal', indice: 'ipca', garantia: 'fiador', dataUltimoReajuste: emDias(-340), notas: '', criadoEm: emDias(-705),
    documentos: [] },
  { id: 'c11', imovelId: '11', tipo: 'locacao_residencial', parte: 'Carlos Mendes', dataInicio: emDias(-1095), dataVencimento: emDias(0), valor: 3200, periodicidade: 'mensal', indice: 'ipca', garantia: 'caucao', dataUltimoReajuste: emDias(-365), notas: 'Vence hoje. Renovação pendente de assinatura.', criadoEm: emDias(-1095),
    arquivo: { nome: 'Contrato_SantoAndre.pdf', tamanho: 310000 }, documentos: [] },
]
