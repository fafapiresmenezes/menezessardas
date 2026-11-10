import { describe, it, expect } from 'vitest'
import { FERRAMENTAS, CATEGORIAS, rodar, valoresPadrao, buscarFerramentas } from './catalogo'
import { inteiroPorExtenso, reaisPorExtenso, dataPorExtenso, medirPeca, analisarJuridiques, legibilidade, silabas } from './textos'
import { validarCpf, validarCnpj, validarCnj } from './documentos'
import { prazoDoAto, prazoDjen, intimacaoTacita, prazoCorrido, calcularPrescricao, jurosEMulta, multa523, honorariosSucumbencia, avisoPrevio, diferencaDatas, pensaoAlimenticia } from './calculos'
import { multaRescisoria, aluguelProporcional, rateioAnual, purgacaoMora, janelaRenovatoria, verificarGarantia, valorCausaLocaticia } from './inquilinato'
import { eisenhower, blocosDeFoco, acordoOuProcesso, valorHora, checkinCarga, simularHonorarios } from './gestao'
import { recomendarEstudos, orcarEstudos, montarAir, multicriterio, tamanhoAmostra, vacatioLegis, verificarMinuta, mapaPartesInteressadas, preRegistro } from './estudos'
import { avaliarChecklist, qualificacao, procuracao, notificacaoLocacao, citacaoJulgado, enderecamento } from './geradores'
import { somarMeses, num } from './base'

describe('catálogo de ferramentas (Theye Suporte Jurídico)', () => {
  it('tem pelo menos 50 ferramentas, ids únicos e todas em categorias conhecidas', () => {
    expect(FERRAMENTAS.length).toBeGreaterThanOrEqual(50)
    expect(new Set(FERRAMENTAS.map(f => f.id)).size).toBe(FERRAMENTAS.length)
    for (const f of FERRAMENTAS) expect(CATEGORIAS).toContain(f.categoria)
  })
  it.each(FERRAMENTAS.map(f => [f.id, f] as const))('%s funciona com os valores padrão', (_id, f) => {
    const r = rodar(f, valoresPadrao(f, new Date('2026-11-09T12:00:00')))
    if (!r.ok) throw new Error(r.erro)
    expect(r.resultado.linhas.length).toBeGreaterThan(0)
    for (const [a, b] of r.resultado.linhas) { expect(a).toBeTruthy(); expect(b).not.toMatch(/NaN|undefined|Infinity/) }
    if (r.resultado.texto) expect(r.resultado.texto).not.toMatch(/NaN|undefined/)
  })
  it('entrada inválida vira mensagem, não erro de tela', () => {
    const f = FERRAMENTAS.find(x => x.id === 'prazo-corrido')!
    const r = rodar(f, { inicio: '2026-02-30', dias: '10' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erro).toMatch(/data válida/)
  })
  it('busca sem acento encontra ferramentas', () => {
    expect(buscarFerramentas('locacao').length).toBeGreaterThan(3)
    expect(buscarFerramentas('prescricao').map(f => f.id)).toContain('prescricao')
  })
})

describe('textos', () => {
  it('valores por extenso', () => {
    expect(reaisPorExtenso(1234.56)).toBe('mil duzentos e trinta e quatro reais e cinquenta e seis centavos')
    expect(reaisPorExtenso(1_000_000)).toBe('um milhão de reais')
    expect(reaisPorExtenso(2005)).toBe('dois mil e cinco reais')
    expect(reaisPorExtenso(0.01)).toBe('um centavo')
    expect(reaisPorExtenso(100)).toBe('cem reais')
    expect(reaisPorExtenso(101)).toBe('cento e um reais')
    expect(reaisPorExtenso(1100)).toBe('mil e cem reais')
    expect(reaisPorExtenso(1)).toBe('um real')
    expect(inteiroPorExtenso(1_200_000)).toBe('um milhão e duzentos mil')
    expect(inteiroPorExtenso(2_500_300)).toBe('dois milhões quinhentos mil e trezentos')
    expect(() => reaisPorExtenso(-1)).toThrow()
  })
  it('datas por extenso', () => {
    expect(dataPorExtenso('2026-11-01')).toBe('1º de novembro de 2026')
    expect(dataPorExtenso('2026-11-09', true)).toBe('nove de novembro de dois mil e vinte e seis')
  })
  it('medidor, juridiquês e legibilidade', () => {
    const m = medirPeca('Uma frase curta. Outra frase aqui.')
    expect(m.palavras).toBe(6); expect(m.frases).toBe(2); expect(m.paginas).toBe(1)
    const j = analisarJuridiques('Outrossim, data venia, a exordial. Outrossim.')
    expect(j.achados.find(a => a.termo === 'outrossim')?.vezes).toBe(2)
    expect(j.achados.map(a => a.termo)).toContain('data venia')
    expect(silabas('casa')).toBe(2); expect(silabas('coração')).toBe(3); expect(silabas('não')).toBe(1)
    expect(legibilidade('O gato come. O cão late.').indice).toBeGreaterThan(legibilidade('A inconstitucionalidade superveniente da regulamentação administrativa compromete irremediavelmente a aplicabilidade normativa.').indice)
  })
})

describe('documentos', () => {
  it('CPF', () => {
    expect(validarCpf('529.982.247-25').valido).toBe(true)
    expect(validarCpf('529.982.247-24').valido).toBe(false)
    expect(validarCpf('111.111.111-11').valido).toBe(false)
  })
  it('CNPJ numérico e alfanumérico (exemplo oficial da Receita)', () => {
    expect(validarCnpj('10.945.994/0001-72').valido).toBe(true)
    const a = validarCnpj('12.ABC.345/01DE-35'); expect(a.valido).toBe(true); expect(a.alfanumerico).toBe(true)
    expect(validarCnpj('12.ABC.345/01DE-36').valido).toBe(false)
  })
  it('número CNJ', () => {
    const r = validarCnj('0710802-55.2018.8.02.0001')
    expect(r.valido).toBe(true)
    if ('tribunal' in r) expect(r.tribunal).toBe('TJAL')
    const x = validarCnj('0001234-03.2026.8.19.0001')
    expect(x.valido).toBe(false)
    if ('digitoCorreto' in x) { expect(x.digitoCorreto).toBe('04'); expect(x.tribunal).toBe('TJRJ') }
    expect(validarCnj('123').valido).toBe(false)
  })
})

describe('prazos', () => {
  it('contestação de 15 dias úteis pula o feriado de 20/11', () => {
    const r = prazoDoAto('contestacao', '2026-11-09')
    expect(r.inicio).toBe('2026-11-10'); expect(r.final).toBe('2026-12-01')
    expect(prazoDoAto('contestacao', '2026-11-09', 'fazenda').dias).toBe(30)
  })
  it('DJEN e intimação tácita', () => {
    expect(prazoDjen('2026-11-13', 5)).toEqual({ publicacao: '2026-11-16', inicio: '2026-11-17', final: '2026-11-24' })
    const t = intimacaoTacita('2026-11-05', 0)
    expect(t.decimoDia).toBe('2026-11-15'); expect(t.tacita).toBe('2026-11-16'); expect(t.prorrogada).toBe(true)
  })
  it('prazo corrido prorroga vencimento no domingo; prescrição de data a data', () => {
    expect(prazoCorrido('2026-11-05', 10).final).toBe('2026-11-16')
    expect(calcularPrescricao('alugueis', '2024-02-29').termo).toBe('2027-03-01')
    expect(calcularPrescricao('cdc-90', '2026-01-01').termo).toBe('2026-04-01')
    expect(somarMeses('2026-01-31', 1)).toBe('2026-03-01')
  })
  it('diferença entre datas', () => {
    const r = diferencaDatas('2025-01-15', '2026-03-20')
    expect(r.anos).toBe(1); expect(r.meses).toBe(2); expect(r.dias).toBe(5); expect(r.corridos).toBe(429)
  })
})

describe('cálculos', () => {
  it('juros, multa, 523', () => {
    expect(jurosEMulta(1000, '2026-01-10', '2026-02-09', 1, 2)).toEqual({ dias: 30, juros: 10, multa: 20, total: 1030 })
    expect(multa523(10000, 2000)).toEqual({ restante: 8000, multa: 800, honorarios: 800, total: 9600 })
  })
  it('sucumbência comum e escalonada contra a Fazenda', () => {
    expect(honorariosSucumbencia(100000, 1000, false)).toMatchObject({ minimo: 10000, medio: 15000, maximo: 20000 })
    const f = honorariosSucumbencia(500000, 1000, true)
    expect(f.minimo).toBe(44000); expect(f.maximo).toBe(70000); expect(f.faixas).toHaveLength(2)
  })
  it('aviso prévio e alimentos', () => {
    expect(avisoPrevio('2020-03-02', '2026-11-09')).toEqual({ anos: 6, dias: 48, termino: '2026-12-27' })
    expect(avisoPrevio('2000-01-01', '2026-11-09').dias).toBe(90)
    expect(pensaoAlimenticia(5000, 30, 2)).toEqual({ mensal: 1500, porFilho: 750, decimoTerceiro: 1500, anual: 19500 })
  })
})

describe('locação', () => {
  it('multa, pro rata, rateio e valor da causa', () => {
    expect(multaRescisoria(7500, 30, 12)).toEqual({ restantes: 18, proporcional: 4500 })
    expect(aluguelProporcional(3000, '2026-11-21', 'entrada').valor).toBe(1000)
    expect(aluguelProporcional(3000, '2026-02-14', 'saida').valor).toBe(1500)
    expect(rateioAnual(2400, '2026-03-15', '2026-12-31')).toEqual({ dias: 292, diasAno: 365, valor: 1920 })
    expect(valorCausaLocaticia(2500).valor).toBe(30000)
  })
  it('purgação da mora', () => {
    const r = purgacaoMora([{ vencimento: '2026-10-05', valor: 2500 }], '2026-11-04', 10, 1, 10, 100)
    expect(r.principal).toBe(2775); expect(r.honorarios).toBe(277.5); expect(r.total).toBe(3152.5)
  })
  it('renovatória e garantia', () => {
    const r = janelaRenovatoria('2027-06-30', 5, 3, true)
    expect(r.abre).toBe('2026-06-30'); expect(r.fecha).toBe('2026-12-30'); expect(r.cabivel).toBe(true)
    expect(janelaRenovatoria('2027-06-30', 4, 3, true).cabivel).toBe(false)
    expect(verificarGarantia(['caucao', 'fianca'], 2000, 0).regular).toBe(false)
    expect(verificarGarantia(['caucao'], 2000, 7000).regular).toBe(false)
    expect(verificarGarantia(['caucao'], 2000, 6000).regular).toBe(true)
  })
})

describe('gestão e bem-estar', () => {
  it('Eisenhower e blocos de foco', () => {
    const q = eisenhower('A #urgente #importante\nB #importante\nC #urgente\nD')
    expect(q).toEqual({ fazer: ['A'], agendar: ['B'], delegar: ['C'], eliminar: ['D'] })
    const f = blocosDeFoco('Revisar;50\nRéplica;100\nRetornar;25', '09:00', 50, 10)
    expect(f.agenda[0]).toEqual({ de: '09:00', ate: '09:50', o_que: 'Revisar' })
    expect(f.termino).toBe('12:25'); expect(f.blocos).toBe(4)
  })
  it('acordo, valor da hora, honorários e carga', () => {
    const a = acordoOuProcesso(50000, 60, 3000, 20, 0, 1, 25000)
    expect(a.esperado).toBe(21000); expect(a.propostaLiquida).toBe(20000); expect(a.diferenca).toBe(-1000)
    expect(valorHora(8000, 12000, 100, 20, 6).custoHora).toBe(200)
    expect(() => valorHora(1, 1, 0, 0, 0)).toThrow()
    expect(simularHonorarios(6000, 6, 20, 80000, 50)).toEqual({ parcela: 1000, exitoSeGanhar: 16000, esperado: 14000, maximo: 22000 })
    expect(checkinCarga(65, 5, 5, 4).nivel).toBe('alto')
    expect(checkinCarga(65, 5, 5, 4).dicas.join(' ')).toMatch(/188/)
    expect(checkinCarga(40, 0, 0, 0).nivel).toBe('baixo')
  })
})

describe('estudos para entidades', () => {
  it('recomendador de cross-selling', () => {
    const r = recomendarEstudos('legislativo', 'locacao', 'propor')
    expect(r.principal.id).toBe('anteprojeto')
    expect(r.complementares.map(c => c.id)).toEqual(['air', 'comparado', 'audiencia'])
    expect(r.recorrente.id).toBe('monitoramento')
    expect(r.argumento).toMatch(/8\.245/)
  })
  it('orçamento com desconto de pacote e cronograma', () => {
    const r = orcarEstudos(['nota-tecnica', 'jurimetria', 'cartilha'], 350, 1, 0, 0, '2026-11-09')
    expect(r.bruto).toBe(46900); expect(r.desconto).toBe(4690); expect(r.total).toBe(42210)
    expect(r.linhas[1].de).toBe('2026-11-23'); expect(r.entrega).toBe('2027-01-03')
    expect(orcarEstudos(['nota-tecnica'], 350, 1, 0, 0, '2026-11-09').desconto).toBe(0)
  })
  it('AIR, multicritério, amostra e vacatio', () => {
    expect(montarAir('X', {}).pct).toBe(0)
    expect(montarAir('X', { sumario: 'Um sumário com mais de vinte caracteres.' }).pendentes).toHaveLength(11)
    const m = multicriterio('A;3\nB;2\nC;1', 'Não agir;4;7;8\nNova lei;9;5;5\nAutorregulação;6;8;6')
    expect(m.ranking.map(x => x.nome)).toEqual(['Nova lei', 'Autorregulação', 'Não agir'])
    expect(tamanhoAmostra(0, '95', 5).n).toBe(385)
    expect(tamanhoAmostra(150000, '95', 5).n).toBe(384)
    expect(vacatioLegis('2026-11-09', 45)).toEqual({ ultimoDia: '2026-12-23', vigencia: '2026-12-24' })
  })
  it('verificador de minuta (LC 95/1998)', () => {
    const ok = verificarMinuta('Altera a Lei nº 8.245 para dispor sobre garantias.\nArt. 1º Objeto.\nArt. 2º Texto.\nArt. 3º Esta Lei entra em vigor após decorridos 90 dias de sua publicação.')
    expect(ok.problemas).toBe(0)
    const ruim = verificarMinuta('Art. 1 Texto.\nArt. 3º Texto.\nArt. 10º Texto. Revogam-se as disposições em contrário.')
    expect(ruim.problemas).toBeGreaterThanOrEqual(4)
  })
  it('mapa de partes interessadas e pré-registro', () => {
    expect(mapaPartesInteressadas('Relator;5;5\nImprensa;4;1\nInquilinos;1;5\nCartório;1;1')).toEqual({ 'Gerenciar de perto': ['Relator'], 'Manter satisfeito': ['Imprensa'], 'Manter informado': ['Inquilinos'], 'Monitorar': ['Cartório'] })
    expect(preRegistro({ titulo: 'T' }).faltam).toHaveLength(7)
  })
})

describe('modelos e listas', () => {
  it('qualificação valida o documento', () => {
    expect(qualificacao({ nome: 'Ana', documento: '52998224725' }).avisos).toHaveLength(0)
    expect(qualificacao({ nome: 'Ana', documento: '52998224724' }).avisos[0]).toMatch(/não é válido/)
    expect(qualificacao({ nome: 'Empresa', documento: '10945994000172' }).texto).toMatch(/pessoa jurídica/)
  })
  it('procuração, notificação, citação, endereçamento e listas', () => {
    expect(procuracao('A', 'B', 'RJ 1', 'x', ['transigir'], 'Rio', '2026-11-09')).toMatch(/poderes especiais para transigir/)
    expect(notificacaoLocacao('cobranca', 'A', 'B', 'Rua X', 5000, 10, 'Rio', '2026-11-09')).toMatch(/10 \(dez\) dias.*cinco mil reais/s)
    expect(citacaoJulgado('STJ', 'REsp', '1', 'Min. X', '3ª Turma', '2026-01-02', '2026-01-05', 'DJe')).toMatch(/^BRASIL\. Superior Tribunal de Justiça\./)
    expect(enderecamento('civel', '5ª', 'Rio de Janeiro')).toMatch(/5ª VARA CÍVEL DA COMARCA DE RIO DE JANEIRO/)
    expect(avaliarChecklist('inicial', []).pct).toBe(0)
    expect(num('1.234,56')).toBe(1234.56)
  })
})
