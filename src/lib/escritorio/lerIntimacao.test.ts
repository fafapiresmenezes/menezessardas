import { describe, it, expect } from 'vitest'
import { lerIntimacao, lerTodas, codigoDoProcesso, prazoEscrito, audienciaNoTexto, dataDaPublicacao, urgenciaPara, csvDosPrazos } from './lerIntimacao'
import type { Publicacao } from '@/lib/pesquisa/fontesOficiais'

const pub = (texto: string, extra: Partial<Publicacao> = {}): Publicacao => ({
  id: String(Math.random()), data: '2026-11-03', tribunal: 'TJRJ', orgao: '5ª Vara Cível da Capital', tipo: 'Intimação', documento: 'Despacho',
  classe: 'Procedimento Comum Cível', numero: '0036229-32.2016.8.19.0021', texto, link: null, partes: [], advogados: [], ...extra,
})
const HOJE = '2026-11-11'

describe('ramo do processo', () => {
  it('trabalho pelo J do número, juizado e criminal pelo órgão, cível no resto', () => {
    expect(codigoDoProcesso('0000001-00.2023.5.01.0001')).toBe('CLT')
    expect(codigoDoProcesso('0000001-00.2023.8.19.0001', 'XV Juizado Especial Cível')).toBe('JEC')
    expect(codigoDoProcesso('0000001-00.2023.8.19.0001', '2ª Vara Criminal')).toBe('CPP')
    expect(codigoDoProcesso('0000001-00.2023.8.19.0001', '1ª Vara da Infância e Juventude')).toBe('ECA')
    expect(codigoDoProcesso('0000001-00.2023.8.19.0001', '5ª Vara Cível')).toBe('CPC')
  })
})

describe('leitura do texto', () => {
  it('acha o prazo escrito pelo juiz, em número ou por extenso', () => {
    expect(prazoEscrito('Manifeste-se a parte autora no prazo de 10 (dez) dias.')).toEqual({ dias: 10, corridos: false })
    expect(prazoEscrito('Diga o réu em quinze dias.')).toEqual({ dias: 15, corridos: false })
    expect(prazoEscrito('Intime-se.')).toBeNull()
  })
  it('acha a data e a hora da audiência', () => {
    expect(audienciaNoTexto('Designo audiência de conciliação para o dia 02/12/2026, às 14:30h.')).toEqual({ data: '2026-12-02', hora: '14:30' })
    // Pauta de câmara: a palavra "MEMORIAIS" no edital não pode virar prazo de alegações finais.
    const pauta = '*** SECRETARIA DA 22ª CÂMARA DE DIREITO PRIVADO ***\n-------------------------\nEDITAL-PAUTA\n-------------------------\nSESSÃO DE JULGAMENTO - PRESENCIAL\nFAÇO PÚBLICO, DE ORDEM DO EXMO. SR. DES. PRESIDENTE, QUE SERÃO JULGADOS EM SESSÃO PRESENCIAL DA 22ª CÂMARA DE DIREITO PRIVADO DO DIA 04/11/2026, quarta-feira , A PARTIR DE 13:30, OU NAS SESSÕES ULTERIORES, os processos abaixo relacionados.\nOs endereços eletrônicos dos gabinetes para o envio de MEMORIAIS estão disponíveis na intranet.\n- 009. APELAÇÃO 0029929-04.2022.8.19.0002'
    expect(audienciaNoTexto(pauta)?.data).toBe('2026-11-04')
    const lida = lerIntimacao(pub(pauta, { data: '2026-10-21' }), '2026-10-22')
    expect(lida.oQueFazer).toMatch(/^Comparecer à audiência ou sessão/)
    expect(lida.vence).toBe('2026-11-04')
  })
  it('publicação é o 1º dia útil depois da disponibilização (sexta → segunda)', () => {
    expect(dataDaPublicacao('2026-11-06')).toBe('2026-11-09')
  })
  it('urgência pelos dias até o vencimento', () => {
    expect(urgenciaPara('2026-11-10', HOJE)).toBe('vencido')
    expect(urgenciaPara('2026-11-14', HOJE)).toBe('urgente')
    expect(urgenciaPara('2026-11-25', HOJE)).toBe('breve')
    expect(urgenciaPara('2026-12-30', HOJE)).toBe('depois')
    expect(urgenciaPara(null, HOJE)).toBe('ler')
  })
})

describe('o que fazer e até quando', () => {
  it('contrarrazões de apelação: 15 dias úteis do CPC a partir da publicação', () => {
    const l = lerIntimacao(pub('Ao apelado para contrarrazões ao recurso de apelação.'), HOJE)
    expect(l.ato?.id).toBe('cpc-contrarrazoes')
    expect(l.publicadaEm).toBe('2026-11-04')
    // 15 dias úteis depois de 04/11/2026, sem 15/11 (domingo) e 20/11 (Consciência Negra)
    expect(l.vence).toBe('2026-11-26')
    expect(l.confianca).toBe('alta')
    expect(l.trecho).toMatch(/contrarrazões/)
  })
  it('no trabalho, contrarrazões são 8 dias úteis', () => {
    const l = lerIntimacao(pub('Vista à reclamada para contrarrazões ao recurso ordinário.', { numero: '0100001-00.2024.5.01.0001', orgao: '10ª Vara do Trabalho' }), HOJE)
    expect(l.codigo).toBe('CLT'); expect(l.ato?.quantidade).toBe(8)
  })
  it('réplica e laudo', () => {
    expect(lerIntimacao(pub('Em réplica, no prazo legal.'), HOJE).ato?.id).toBe('cpc-replica')
    const volta = lerIntimacao(pub('Cumpra-se o V. Acórdão. Digam as partes, em 5 (cinco) dias, se há algo a ser requerido.'), HOJE)
    expect(volta.oQueFazer).toMatch(/voltou do tribunal/)
    expect(volta.oQueFazer).not.toMatch(/Saiu o acórdão/)
    expect(lerIntimacao(pub('Manifestem-se as partes sobre o laudo pericial.'), HOJE).ato?.id).toBe('cpc-laudo')
  })
  it('manifestação usa o prazo escrito pelo juiz', () => {
    const l = lerIntimacao(pub('Manifeste-se a parte autora em 10 (dez) dias sobre a petição de fls.'), HOJE)
    expect(l.ato?.quantidade).toBe(10)
  })
  it('manifestação sem prazo escrito: 5 dias úteis e aviso', () => {
    const l = lerIntimacao(pub('Diga a parte autora sobre a certidão.'), HOJE)
    expect(l.ato?.quantidade).toBe(5); expect(l.avisos.join(' ')).toMatch(/art\. 218/)
  })
  it('sentença: embargos em 5 dias e o recurso como outra opção', () => {
    const l = lerIntimacao(pub('Isto posto, JULGO PROCEDENTE o pedido.', { documento: 'Sentença' }), HOJE)
    expect(l.ato?.quantidade).toBe(5); expect(l.outra).toMatch(/apelação em 15 dias úteis/)
  })
  it('recurso com prazo diferente do da lei avisa em vez de trocar', () => {
    const l = lerIntimacao(pub('Intime-se o apelado para contrarrazões no prazo de 10 dias.'), HOJE)
    expect(l.ato?.quantidade).toBe(15); expect(l.avisos[0]).toMatch(/fala em 10 dias/)
  })
  it('audiência vira compromisso com data', () => {
    const l = lerIntimacao(pub('Designo audiência de instrução e julgamento para 02/12/2026 às 13h.'), HOJE)
    expect(l.vence).toBe('2026-12-02'); expect(l.oQueFazer).toMatch(/audiência.*13:00/)
  })
  it('sem pedido nem prazo: fica para ler', () => {
    const l = lerIntimacao(pub('Remetam-se os autos ao arquivo.'), HOJE)
    expect(l.urgencia).toBe('ler'); expect(l.vence).toBeNull()
  })
})

describe('lista completa', () => {
  it('ordena vencidos primeiro, tira repetidas e gera CSV', () => {
    const a = pub('Para contrarrazões ao recurso de apelação.', { id: 'a', data: '2026-10-01' })
    const b = pub('Diga a parte autora em 5 dias.', { id: 'b', data: '2026-11-10' })
    const c = pub('Remetam-se ao arquivo.', { id: 'c' })
    const ls = lerTodas([c, b, a, a], HOJE)
    expect(ls.map(l => l.publicacao.id)).toEqual(['a', 'b', 'c'])
    expect(ls[0].urgencia).toBe('vencido')
    const csv = csvDosPrazos(ls)
    expect(csv.split('\n')).toHaveLength(4); expect(csv).toMatch(/^Vence;Situação;Processo/)
  })
})
