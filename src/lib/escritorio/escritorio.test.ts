import { describe, it, expect } from 'vitest'
import { analisarPlanilha, analisarLista, analisarResultados, extrairNumeros, lerValor, paraCaso, campoDoCabecalho, separador, lerDescricao, areaProvavel, MODELO_PLANILHA, formatarCnj } from './importarProcessos'
import { resumoFunil, proximaEtapa, validarMudanca, telefoneWhatsapp, mensagemRetorno, casoDoLead, type Lead } from './funil'
import { fluxoMensal, recebiveis, aging, contasAPagar, previsao90, resultadoPorArea, despesasPorCategoria, pontoEquilibrio, reembolsosPendentes, repetirMensal, somarMeses, mesesAte, faixaAtraso, type Lancamento } from './financeiro'
import { cnj } from '@/test/cnj'
import { montarCarteira, filtrarCarteira, resumoCarteira, variacoesNome, filtrarNovidades, processosNovos, tribunalDoNumero, ultimaMovimentacao } from './carteira'

const A = cnj(1234), B = cnj(5678), T = cnj(42, 2022, '5', '01', '0011')
const digitos = (s: string) => s.replace(/\D/g, '')

describe('importar processos', () => {
  it('reconhece cabeçalhos comuns e separadores', () => {
    expect(campoDoCabecalho('Nº do Processo')).toBe('numero')
    expect(campoDoCabecalho('Parte Contrária')).toBe('parte_contraria')
    expect(campoDoCabecalho('Honorários contratados')).toBe('honorarios')
    expect(campoDoCabecalho('coluna estranha')).toBeNull()
    expect(separador('a\tb;c')).toBe('\t')
    expect(separador('a;b,c;d')).toBe(';')
    expect(separador('a,b,c')).toBe(',')
  })
  it('extrai números com e sem máscara de texto livre', () => {
    expect(extrairNumeros(`Processos: ${A}, e ${digitos(B)} fim`)).toEqual([digitos(A), digitos(B)])
    expect(formatarCnj(digitos(A))).toBe(A)
  })
  it('lê valores em reais', () => {
    expect(lerValor('R$ 1.234,56')).toBe(1234.56)
    expect(lerValor('1234.5')).toBe(1234.5)
    expect(lerValor('1.000.000')).toBe(1000000)
    expect(lerValor('')).toBe(0)
    expect(lerValor('abc')).toBe(0)
  })
  it('planilha: valida dígito, duplicados, já cadastrados e linhas sem número', () => {
    const errado = A.replace(/-(\d\d)\./, (_m, d) => `-${String((Number(d) + 1) % 100).padStart(2, '0')}.`)
    const csv = ['Número do processo;Cliente;Parte contrária;Fase;Honorários', `${A};Maria;Imob X;Instrução;R$ 5.000,00`, `${A};Maria;;;`, `${errado};João;;;`, `${B};Ana;;Arquivado;`, ';Pedro;;Consultivo;3000'].join('\n')
    const r = analisarPlanilha(csv, [digitos(B)])
    expect(r.erro).toBeUndefined()
    expect(r.linhas.map(l => l.situacao)).toEqual(['ok', 'duplicado_arquivo', 'invalido', 'ja_cadastrado', 'sem_numero'])
    expect(r.linhas[0].tribunal).toBe('TJRJ')
    const caso = paraCaso(r.linhas[0], 'planilha')
    expect(caso).toMatchObject({ titulo: 'Maria x Imob X', numero_processo: A, honorario_previsto: 5000, situacao: 'fazendo', nivel: 'projeto', tipo: 'caso' })
    expect(caso.descricao).toContain('Parte contrária: Imob X')
    expect(lerDescricao(caso.descricao)['parte contraria']).toBe('Imob X')
    expect(paraCaso(r.linhas[4], 'planilha')).toMatchObject({ numero_processo: null, honorario_previsto: 3000 })
  })
  it('planilha colada do Excel (tabulação) e sem coluna de número', () => {
    const tsv = `Cliente\tObservações\nMaria\tprocesso ${A} despejo`
    const r = analisarPlanilha(tsv)
    expect(r.linhas[0]).toMatchObject({ situacao: 'ok', numero: digitos(A) })
    expect(areaProvavel(r.linhas[0])).toBe('Imobiliário')
  })
  it('planilha sem cabeçalho reconhecível ou vazia dá erro claro', () => {
    expect(analisarPlanilha('').erro).toMatch(/cabeçalho/)
    expect(analisarPlanilha('foo;bar\n1;2').erro).toMatch(/Não reconheci/)
  })
  it('processo trabalhista vai para a área Trabalhista; arquivado entra como encerrado', () => {
    const r = analisarPlanilha(`Processo;Fase\n${T};Arquivado definitivamente`)
    expect(areaProvavel(r.linhas[0])).toBe('Trabalhista')
    expect(paraCaso(r.linhas[0], 'x').situacao).toBe('feito')
  })
  it('lista de números colada', () => {
    const l = analisarLista(`${A}\n${digitos(A)}\n1234567-00\n${B}`, [])
    expect(l.filter(x => x.situacao === 'ok').length).toBe(2)
    expect(l.some(x => x.situacao === 'duplicado_arquivo')).toBe(true)
    expect(l.some(x => x.situacao === 'invalido' && x.motivo?.includes('20 dígitos'))).toBe(true)
  })
  it('resultados do DJEN/Escavador', () => {
    const l = analisarResultados([{ numero: A, titulo: 'X x Y', tribunal: 'TJRJ' }, { numero: B }], [digitos(B)])
    expect(l.map(x => x.situacao)).toEqual(['ok', 'ja_cadastrado'])
    expect(paraCaso(l[0], 'intimações').titulo).toBe('X x Y')
  })
  it('modelo de planilha é reconhecido', () => {
    const r = analisarPlanilha(MODELO_PLANILHA)
    expect(r.colunas.filter(Boolean).length).toBe(9)
    expect(r.linhas.length).toBe(2)
  })
})

const lead = (p: Partial<Lead>): Lead => ({ id: Math.random().toString(), nome: 'Maria Silva', telefone: '(21) 99999-0000', email: null, origem: 'indicacao', area: 'Cível', assunto: 'despejo', etapa: 'novo', valor_estimado: 1000, proximo_contato: null, motivo_perda: null, observacoes: null, responsavel_id: null, caso_id: null, criado_em: '2026-11-01T10:00:00Z', etapa_desde: '2026-11-01T10:00:00Z', ...p })
describe('funil de vendas', () => {
  const agora = new Date('2026-11-10T12:00:00Z')
  it('resume valor, previsão ponderada, conversão e follow-ups', () => {
    const r = resumoFunil([lead({ etapa: 'proposta', valor_estimado: 10000, proximo_contato: '2026-11-09' }), lead({ etapa: 'novo', valor_estimado: 2000, etapa_desde: '2026-10-01T00:00:00Z' }), lead({ etapa: 'ganho', valor_estimado: 6000 }), lead({ etapa: 'perdido', motivo_perda: 'Preço / honorários' })], agora)
    expect(r.valorAberto).toBe(12000)
    expect(r.previsao).toBeCloseTo(6200)
    expect(r.conversao).toBe(0.5)
    expect(r.ticket).toBe(6000)
    expect(r.followUps.length).toBe(1)
    expect(r.semFollowUp.length).toBe(1)
    expect(r.parados.length).toBe(1)
    expect(r.motivos[0]).toEqual({ motivo: 'Preço / honorários', quantidade: 1 })
    expect(r.porOrigem[0]).toMatchObject({ total: 4, ganhos: 1, conversao: 0.5 })
  })
  it('funil vazio não divide por zero', () => {
    const r = resumoFunil([], agora)
    expect(r.conversao).toBeNull(); expect(r.ticket).toBe(0)
  })
  it('etapas, validação e mensagens', () => {
    expect(proximaEtapa('novo')).toBe('qualificacao')
    expect(proximaEtapa('negociacao')).toBe('ganho')
    expect(proximaEtapa('ganho')).toBeNull()
    expect(validarMudanca({ valor_estimado: 0 }, 'ganho')).toMatch(/valor/)
    expect(validarMudanca({ valor_estimado: 10 }, 'perdido')).toMatch(/motivo/)
    expect(validarMudanca({ valor_estimado: 10 }, 'perdido', 'Outro')).toBeNull()
    expect(telefoneWhatsapp('(21) 99999-0000')).toBe('5521999990000')
    expect(telefoneWhatsapp('123')).toBeNull()
    expect(mensagemRetorno(lead({ etapa: 'proposta' }))).toContain('Olá, Maria! Conseguiu ver a proposta de honorários sobre despejo')
    expect(casoDoLead(lead({ valor_estimado: 5000 }))).toMatchObject({ cliente: 'Maria Silva', honorario_previsto: 5000, nivel: 'projeto', titulo: 'despejo · Maria Silva' })
  })
})

const lanc = (p: Partial<Lancamento>): Lancamento => ({ id: Math.random().toString(), tipo: 'despesa', categoria: 'Aluguel e condomínio', descricao: 'x', valor: 100, vencimento: '2026-11-05', pago_em: null, caso_id: null, cliente: null, reembolsavel: false, ...p })
describe('financeiro', () => {
  const hoje = '2026-11-10'
  const casos = [{ id: 'c1', titulo: 'Despejo', cliente: 'Maria', area: 'Imobiliário', honorario_previsto: 5000, honorario_recebido: 1000, vencimento_honorario: '2026-09-01' }, { id: 'c2', titulo: 'Divórcio', cliente: 'Ana', area: 'Família e sucessões', honorario_previsto: 3000, honorario_recebido: 0, vencimento_honorario: null }]
  const pg = [{ id: 1, caso_id: 'c1', data: '2026-10-15', valor: 1000 }]
  const parcelas = [{ id: 1, caso_id: 'c2', numero: 1, vencimento: '2026-10-01', valor: 1000, pago_em: null }, { id: 2, caso_id: 'c2', numero: 2, vencimento: '2026-12-01', valor: 1000, pago_em: null }]
  const l = [lanc({ valor: 500, pago_em: '2026-10-05', caso_id: 'c1', categoria: 'Custas processuais', reembolsavel: true, cliente: 'Maria' }), lanc({ valor: 300, vencimento: '2026-11-01' }), lanc({ valor: 200, vencimento: '2026-11-15' }), lanc({ tipo: 'receita', categoria: 'Partido mensal (consultoria)', valor: 2000, vencimento: '2026-10-20', pago_em: '2026-10-20' })]
  it('datas: soma de meses e lista de meses', () => {
    expect(somarMeses('2026-01-31', 1)).toBe('2026-02-28')
    expect(somarMeses('2026-11-10', -2)).toBe('2026-09-10')
    expect(mesesAte('2026-11-10', 3)).toEqual(['2026-11', '2026-12', '2027-01'])
  })
  it('fluxo mensal com realizado e previsto', () => {
    const f = fluxoMensal(l, pg, parcelas, ['2026-10', '2026-11', '2026-12'])
    expect(f[0]).toMatchObject({ recebido: 3000, pago: 500, resultado: 2500, acumulado: 2500 })
    expect(f[1]).toMatchObject({ aPagar: 500, recebido: 0 })
    expect(f[2].aReceber).toBe(1000)
  })
  it('a receber por faixa de atraso e inadimplência', () => {
    const r = recebiveis(l, parcelas, casos, hoje)
    expect(r.map(x => x.origem).sort()).toEqual(['honorario', 'parcela', 'parcela'])
    const a = aging(r, hoje)
    expect(a.total).toBe(6000)
    expect(a.vencido).toBe(5000)
    expect(a.faixas.find(x => x.faixa === 'Mais de 90 dias')?.valor).toBe(0)
    expect(a.faixas.find(x => x.faixa === '61 a 90 dias')?.valor).toBe(4000)
    expect(a.faixas.find(x => x.faixa === '31 a 60 dias')?.valor).toBe(1000)
    expect(faixaAtraso(0, '2026-11-10', hoje)).toBe('A vencer')
  })
  it('contas a pagar e previsão de 90 dias', () => {
    const c = contasAPagar(l, hoje)
    expect(c.totalVencido).toBe(300); expect(c.totalSemana).toBe(200); expect(c.total30).toBe(200)
    const p = previsao90(l, recebiveis(l, parcelas, casos, hoje), hoje, 1000)
    expect(p[0]).toMatchObject({ entra: 3500, sai: 500, saldo: 4000 })
    expect(p[1]).toMatchObject({ entra: 0, sai: 0, saldo: 4000 })
  })
  it('resultado por área, despesas por categoria, ponto de equilíbrio e reembolsos', () => {
    const ra = resultadoPorArea(l, pg, casos, '2026-01-01')
    expect(ra.find(x => x.area === 'Imobiliário')).toMatchObject({ receita: 1000, despesa: 500, margem: 0.5 })
    expect(ra.find(x => x.area === 'Sem caso ligado')?.receita).toBe(2000)
    expect(despesasPorCategoria(l, '2026-01-01')[0]).toMatchObject({ categoria: 'Custas processuais', valor: 500, parte: 1 })
    const pe = pontoEquilibrio(l, pg, hoje)
    expect(pe.despesaMedia).toBeCloseTo(166.67)
    expect(pe.atingido).toBe(false)
    expect(reembolsosPendentes(l)).toEqual([{ cliente: 'Maria', gasto: 500, reembolsado: 0, pendente: 500 }])
  })
  it('repete lançamento mensal', () => {
    const r = repetirMensal({ vencimento: '2026-01-31', descricao: 'Aluguel' }, 3)
    expect(r.map(x => x.vencimento)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
    expect(r[2].descricao).toBe('Aluguel (3/3)')
    expect(repetirMensal({ vencimento: '2026-01-01', descricao: 'X' }, 0)).toHaveLength(1)
  })
})

describe('carteira e monitoramento', () => {
  const hoje = '2026-11-10'
  const casos = [
    { id: '1', titulo: 'Despejo Maria', cliente: 'Maria', area: 'Imobiliário', numero_processo: A, situacao: 'fazendo', responsavel_id: 'u1', descricao: 'Parte contrária: Imob X\nFase: Instrução' },
    { id: '2', titulo: 'Reclamação', cliente: 'João', area: 'Trabalhista', numero_processo: T, situacao: 'fazendo', responsavel_id: null },
    { id: '3', titulo: 'Antigo', cliente: 'Ana', area: 'Cível', numero_processo: null, situacao: 'feito', responsavel_id: null },
  ]
  const mons = [{ tipo: 'processo', valor: digitos(A), ultimo_estado: { classe: 'Despejo', orgao: '5ª Vara', encontrado: true, chaves: ['2026-03-01T10:00:00|Juntada', '2026-05-02T00:00:00|Despacho'] }, novidades: [], verificado_em: '2026-11-10' }]
  const ints = [{ numero_processo: A, lida: false, data_disponibilizacao: '2026-11-08', prazo_final: '2026-11-20' }]
  it('monta linhas com tribunal, parado, intimações e dados extras', () => {
    const c = montarCarteira(casos, mons, ints, hoje)
    expect(c[0]).toMatchObject({ tribunal: 'TJRJ', ultima: '2026-05-02', parado: 192, monitorado: true, intimacoesNaoLidas: 1, proximoPrazo: '2026-11-20', parteContraria: 'Imob X', fase: 'Instrução', classe: 'Despejo' })
    expect(c[1].tribunal).toBe('TRT da 1ª Região')
    expect(c[2].tribunal).toBe('Sem número')
    expect(ultimaMovimentacao(undefined)).toBeNull()
    expect(tribunalDoNumero('123')).toBe('Sem número')
  })
  it('filtra e resume', () => {
    const c = montarCarteira(casos, mons, ints, hoje)
    expect(filtrarCarteira(c, { situacao: 'ativos' }).length).toBe(2)
    expect(filtrarCarteira(c, { situacao: 'todos', texto: 'imob x' }).map(x => x.id)).toEqual(['1'])
    expect(filtrarCarteira(c, { situacao: 'todos', texto: digitos(T).slice(0, 7) }).map(x => x.id)).toEqual(['2'])
    expect(filtrarCarteira(c, { situacao: 'ativos', alerta: 'parado180' }).map(x => x.id)).toEqual(['1'])
    expect(filtrarCarteira(c, { situacao: 'ativos', alerta: 'sem_monitor' }).map(x => x.id)).toEqual(['2'])
    expect(filtrarCarteira(c, { situacao: 'encerrados' }).map(x => x.id)).toEqual(['3'])
    const r = resumoCarteira(c)
    expect(r).toMatchObject({ total: 3, ativos: 2, encerrados: 1, parados180: 1, comIntimacao: 1, semMonitor: 1 })
  })
  it('variações de grafia do nome', () => {
    const v = variacoesNome('João da Silva Pereira')
    expect(v).toEqual(expect.arrayContaining(['JOÃO DA SILVA PEREIRA', 'JOAO DA SILVA PEREIRA', 'JOAO SILVA PEREIRA', 'JOAO PEREIRA', 'JOAO S. PEREIRA']))
    expect(variacoesNome('Imobiliária Exemplo Ltda')).toEqual(expect.arrayContaining(['IMOBILIARIA EXEMPLO LIMITADA', 'IMOBILIARIA EXEMPLO']))
    expect(variacoesNome('Ab')).toEqual([])
  })
  it('filtros contém / não contém e processos novos', () => {
    const itens = [{ texto: 'TJRJ · Intimação · despejo' }, { texto: 'TJSP · Edital · leilão' }, { texto: 'TJRJ · Edital' }]
    expect(filtrarNovidades(itens, 'tjrj', 'edital')).toEqual([itens[0]])
    expect(filtrarNovidades(itens, '', '')).toHaveLength(3)
    expect(processosNovos(`Nova ação ${B} e ${A}`, new Set([digitos(A)]))).toEqual([digitos(B)])
  })
})
