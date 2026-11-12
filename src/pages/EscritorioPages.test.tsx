// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { criarSupabaseFalso } from '@/test/supabaseFalso'
import { cnj } from '@/test/cnj'

let falso = criarSupabaseFalso()
vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: true, get supabase() { return falso.supabase } }))
vi.mock('@/lib/equipe', () => ({ listarPessoas: async () => [{ id: 'u1', nome: 'Dra. Ana' }] }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: ImportarProcessosPage } = await import('./ImportarProcessosPage')
const { default: CarteiraProcessosPage } = await import('./CarteiraProcessosPage')
const { default: FunilVendasPage } = await import('./FunilVendasPage')
const { default: FinanceiroPage } = await import('./FinanceiroPage')
const tela = (el: React.ReactElement) => render(<MemoryRouter>{el}</MemoryRouter>)
const A = cnj(1234), B = cnj(5678), C = cnj(9999)
const d = (s: string) => s.replace(/\D/g, '')
const txt = (id: string) => (screen.getByTestId(id).textContent ?? '').replace(/\s/g, ' ')

beforeEach(() => { cleanup(); localStorage.clear(); window.confirm = () => true })

describe('Importar processos anteriores', () => {
  beforeEach(() => { falso = criarSupabaseFalso({ tarefas: [{ id: 't0', nivel: 'projeto', numero_processo: B, titulo: 'Já existe' }] }) })

  it('planilha colada: confere, mostra situação de cada linha e importa como casos monitorados', async () => {
    tela(<ImportarProcessosPage />)
    await waitFor(() => expect(falso.chamadas.some(c => c.tabela === 'tarefas')).toBe(true))
    const csv = `Número do processo;Cliente;Parte contrária;Área;Honorários;Fase\n${A};Maria;Imob X;Imobiliário;R$ 5.000,00;Instrução\n${B};João;;;;\n${A.replace(/^0/, '1')};Erro;;;;\n;Pedro;;Família;3000;Consultivo`
    fireEvent.change(screen.getByTestId('planilha-texto'), { target: { value: csv } })
    const linhas = await screen.findAllByTestId('linha-processo')
    expect(linhas).toHaveLength(4)
    expect(linhas[1].textContent).toContain('Já cadastrado')
    expect(linhas[2].textContent).toContain('Número inválido')
    expect(txt('importar-processos')).toBe('Importar 2 processo(s)')
    fireEvent.click(screen.getByTestId('importar-processos'))
    await screen.findByTestId('importar-relatorio')
    expect(txt('importar-relatorio')).toContain('2 caso(s) criado(s), 1 no monitoramento')
    const novos = falso.tabelas.tarefas.filter(t => t.id !== 't0')
    expect(novos).toEqual(expect.arrayContaining([expect.objectContaining({ titulo: 'Maria x Imob X', numero_processo: A, area: 'Imobiliário', honorario_previsto: 5000, nivel: 'projeto', tipo: 'caso' }), expect.objectContaining({ cliente: 'Pedro', numero_processo: null, honorario_previsto: 3000 })]))
    expect(falso.tabelas.monitoramentos).toEqual([expect.objectContaining({ tipo: 'processo', valor: d(A) })])
    expect(screen.getAllByTestId('linha-processo')[0].textContent).toContain('Já cadastrado')
  })

  it('lista de números: desmarcar um processo tira da importação; sem monitorar não cria monitoramento', async () => {
    tela(<ImportarProcessosPage />)
    fireEvent.click(screen.getByTestId('fonte-lista'))
    fireEvent.change(screen.getByTestId('lista-texto'), { target: { value: `Seguem: ${A} e ${C}.` } })
    expect(await screen.findAllByTestId('linha-processo')).toHaveLength(2)
    fireEvent.click(screen.getByLabelText(`Importar ${C}`))
    fireEvent.click(screen.getByTestId('importar-monitorar'))
    fireEvent.click(screen.getByTestId('importar-processos'))
    await screen.findByTestId('importar-relatorio')
    expect(falso.tabelas.tarefas.map(t => t.numero_processo)).toEqual([B, A])
    expect(falso.tabelas.monitoramentos ?? []).toHaveLength(0)
  })

  it('intimações das OABs: traz só processos que ainda não são casos', async () => {
    falso.tabelas.intimacoes = [{ numero_processo: A, tribunal: 'TJRJ', orgao: '5ª Vara', classe: 'Despejo', data_disponibilizacao: '2026-11-01' }, { numero_processo: A, data_disponibilizacao: '2026-10-01' }, { numero_processo: B, data_disponibilizacao: '2026-10-01' }]
    tela(<ImportarProcessosPage />)
    fireEvent.click(screen.getByTestId('fonte-intimacoes'))
    fireEvent.click(screen.getByTestId('buscar-intimacoes'))
    const linhas = await screen.findAllByTestId('linha-processo')
    expect(linhas).toHaveLength(2)
    expect(linhas[0].textContent).toContain('Pronto para importar')
    expect(linhas[1].textContent).toContain('Já cadastrado')
  })

  it('importar tudo pelas OABs: valida, guarda as OABs, busca o histórico em blocos de 30 dias e lista os processos', async () => {
    falso.tabelas.intimacoes = [{ numero_processo: A, tribunal: 'TJRJ', data_disponibilizacao: '2026-11-01' }]
    falso.responderFuncao((_n, b) => ({ data: { novas: 2, falhas: [], periodo: { inicio: b.inicio, fim: b.fim } }, error: null }))
    tela(<ImportarProcessosPage />)
    fireEvent.click(screen.getByTestId('fonte-intimacoes'))
    fireEvent.click(screen.getByTestId('buscar-historico'))
    expect(await screen.findByText(/Escreva ao menos uma OAB/)).toBeTruthy()
    fireEvent.change(screen.getByTestId('oabs-texto'), { target: { value: '12.345/rj, abc' } })
    fireEvent.click(screen.getByTestId('buscar-historico'))
    expect(await screen.findByText(/Não entendi: abc/)).toBeTruthy()
    fireEvent.change(screen.getByTestId('oabs-texto'), { target: { value: '12.345/rj, 999/SP' } })
    fireEvent.change(screen.getByTestId('oabs-meses'), { target: { value: '12' } })
    fireEvent.click(screen.getByTestId('buscar-historico'))
    await waitFor(() => expect(screen.getByTestId('oabs-progresso').textContent).toContain('24 intimação'), { timeout: 10000 })
    expect(falso.rpcs.filter(r => r.nome !== 'config_ler')).toEqual([{ nome: 'definir_configuracao', args: { p_chave: 'oabs_monitoradas', p_valor: '12345/RJ, 999/SP' } }])
    expect(falso.invocacoes).toHaveLength(12)
    expect(falso.invocacoes[0]).toMatchObject({ nome: 'intimacoes', body: { historico: true } })
    expect((await screen.findAllByTestId('linha-processo')).length).toBe(1)
  }, 20000)

  it('passo a passo: marca o que já foi feito e destaca o próximo', async () => {
    falso.responderFuncao((_n, b) => (b.teste ? { data: { conexao: true, status: 200 }, error: null } : { data: { novas: 0, falhas: [], periodo: { inicio: b.inicio, fim: b.fim } }, error: null }))
    tela(<ImportarProcessosPage />)
    fireEvent.click(screen.getByTestId('fonte-intimacoes'))
    const passos = () => within(screen.getByTestId('passos-importacao')).getAllByRole('listitem')
    expect(passos()).toHaveLength(5)
    expect(passos()[0].dataset.atual).toBe('true')
    fireEvent.click(screen.getByTestId('testar-conexao-cnj'))
    await waitFor(() => expect(passos()[0].dataset.feito).toBe('true'))
    expect(passos()[1].dataset.atual).toBe('true')
    expect(passos()[1].textContent).toContain('Você está aqui')
    fireEvent.change(screen.getByTestId('oabs-texto'), { target: { value: '123456/RJ' } })
    expect(passos()[1].dataset.feito).toBe('true')
    expect(passos()[2].dataset.atual).toBe('true')
    fireEvent.change(screen.getByTestId('oabs-meses'), { target: { value: '12' } })
    fireEvent.click(screen.getByTestId('buscar-historico'))
    await waitFor(() => expect(passos()[2].dataset.feito).toBe('true'), { timeout: 10000 })
  }, 20000)

  it('importar tudo pelas OABs: avisa quando o servidor ainda está na versão antiga', async () => {
    falso.responderFuncao(() => ({ data: { novas: 0, falhas: [], periodo: { inicio: '2000-01-01', fim: '2000-01-15' } }, error: null }))
    tela(<ImportarProcessosPage />)
    fireEvent.click(screen.getByTestId('fonte-intimacoes'))
    fireEvent.change(screen.getByTestId('oabs-texto'), { target: { value: '1/RJ' } })
    fireEvent.click(screen.getByTestId('buscar-historico'))
    expect(await screen.findByText(/versão antiga/)).toBeTruthy()
    expect(falso.invocacoes).toHaveLength(1)
  })

  it('Escavador: busca pelo termo e mostra o erro do serviço', async () => {
    falso.responderFuncao((_n, b) => (b.termo === 'falha' ? { data: { erro: 'Créditos do Escavador esgotados.' }, error: null } : { data: { processos: [{ numero: C, titulo: 'Maria x Banco', tribunal: 'TJRJ', classe: null }] }, error: null }))
    tela(<ImportarProcessosPage />)
    fireEvent.click(screen.getByTestId('fonte-escavador'))
    fireEvent.click(screen.getByTestId('buscar-escavador'))
    expect(txt('importar-erro')).toContain('Escreva o nome')
    fireEvent.change(screen.getByTestId('escavador-termo'), { target: { value: 'Maria Exemplo' } })
    fireEvent.click(screen.getByTestId('buscar-escavador'))
    expect((await screen.findAllByTestId('linha-processo'))[0].textContent).toContain('Maria x Banco')
    expect(falso.invocacoes[0]).toEqual({ nome: 'escavador', body: { termo: 'Maria Exemplo' } })
    fireEvent.change(screen.getByTestId('escavador-termo'), { target: { value: 'falha' } })
    fireEvent.click(screen.getByTestId('buscar-escavador'))
    await waitFor(() => expect(txt('importar-erro')).toBe('Créditos do Escavador esgotados.'))
  })

  it('planilha sem colunas reconhecidas e arquivo Excel explicam o que fazer', async () => {
    tela(<ImportarProcessosPage />)
    fireEvent.change(screen.getByTestId('planilha-texto'), { target: { value: 'foo;bar\n1;2' } })
    expect(txt('importar-erro')).toContain('Não reconheci')
    fireEvent.change(screen.getByTestId('arquivo-processos'), { target: { files: [new File(['x'], 'carteira.xlsx')] } })
    expect(txt('importar-erro')).toContain('Salvar como → CSV')
  })
})

describe('Carteira de processos', () => {
  beforeEach(() => {
    falso = criarSupabaseFalso({
      tarefas: [
        { id: 'c1', nivel: 'projeto', tipo: 'caso', titulo: 'Despejo Maria', cliente: 'Maria', area: 'Imobiliário', numero_processo: A, situacao: 'fazendo', responsavel_id: 'u1', descricao: 'Parte contrária: Imob X', criado_em: '2026-01-01' },
        { id: 'c2', nivel: 'projeto', tipo: 'caso', titulo: 'Cobrança João', cliente: 'João', area: 'Cível', numero_processo: C, situacao: 'fazendo', responsavel_id: null, criado_em: '2026-01-02' },
        { id: 'c3', nivel: 'projeto', tipo: 'interno', titulo: 'Projeto interno', numero_processo: null, situacao: 'fazendo', criado_em: '2026-01-03' },
      ],
      monitoramentos: [{ tipo: 'processo', valor: d(A), ultimo_estado: { classe: 'Despejo', encontrado: true, chaves: ['2025-01-10T00:00:00|Despacho'] }, novidades: [], verificado_em: '2026-11-09' }],
      intimacoes: [{ numero_processo: A, lida: false, data_disponibilizacao: '2026-11-08', prazo_final: '2099-01-01' }],
    })
  })
  it('lista só processos, com alertas, filtros, monitoramento em lote e encerramento', async () => {
    tela(<CarteiraProcessosPage />)
    expect(await screen.findAllByTestId('carteira-linha')).toHaveLength(2)
    const resumo = screen.getByTestId('carteira-resumo')
    expect(resumo.textContent).toContain('Intimação não lida1')
    expect(resumo.textContent).toContain('Parados +180 dias1')
    expect(resumo.textContent).toContain('Sem monitoramento1')
    const linha = screen.getAllByTestId('carteira-linha')[1]
    expect(linha.textContent).toContain('Imob X'); expect(linha.textContent).toContain('1 não lida(s)'); expect(linha.textContent).toContain('dia(s) sem andamento')
    fireEvent.change(screen.getByTestId('carteira-busca'), { target: { value: 'joão' } })
    expect(screen.getAllByTestId('carteira-linha')).toHaveLength(1)
    fireEvent.change(screen.getByTestId('carteira-busca'), { target: { value: '' } })
    fireEvent.change(screen.getByTestId('carteira-alerta'), { target: { value: 'sem_monitor' } })
    expect(screen.getAllByTestId('carteira-linha')[0].textContent).toContain('Cobrança João')
    fireEvent.click(screen.getByTestId('monitorar-todos'))
    await waitFor(() => expect(txt('carteira-msg')).toContain('1 processo(s) entraram'))
    expect(falso.tabelas.monitoramentos).toHaveLength(2)
    fireEvent.change(screen.getByTestId('carteira-alerta'), { target: { value: '' } })
    fireEvent.click(within(screen.getAllByTestId('carteira-linha')[0]).getByTestId('carteira-encerrar'))
    await waitFor(() => expect(screen.getAllByTestId('carteira-linha')).toHaveLength(1))
    fireEvent.change(screen.getByTestId('carteira-situacao'), { target: { value: 'encerrados' } })
    expect(screen.getAllByTestId('carteira-linha')).toHaveLength(1)
  })
  it('carteira vazia leva para a importação', async () => {
    falso = criarSupabaseFalso({ tarefas: [] })
    tela(<CarteiraProcessosPage />)
    expect((await screen.findByTestId('vazio')).textContent).toContain('A carteira está vazia')
  })
})

describe('Funil de vendas', () => {
  beforeEach(() => { falso = criarSupabaseFalso({ leads: [] }) })
  it('inclui contato, avança etapas, exige motivo da perda e valor para fechar, converte em caso', async () => {
    tela(<FunilVendasPage />)
    fireEvent.click(screen.getByTestId('lead-criar'))
    expect(txt('funil-msg')).toContain('Escreva o nome')
    fireEvent.change(screen.getByTestId('lead-nome'), { target: { value: 'Maria Silva' } })
    fireEvent.change(screen.getByTestId('lead-telefone'), { target: { value: '(21) 99999-0000' } })
    fireEvent.change(screen.getByTestId('lead-assunto'), { target: { value: 'despejo' } })
    fireEvent.change(screen.getByTestId('lead-valor'), { target: { value: '6.000,00' } })
    fireEvent.click(screen.getByTestId('lead-criar'))
    const card = await screen.findByTestId('lead-card')
    expect(falso.tabelas.leads[0]).toMatchObject({ nome: 'Maria Silva', valor_estimado: 6000, origem: 'indicacao' })
    falso.tabelas.leads[0].etapa = 'novo'; falso.tabelas.leads[0].etapa_desde = new Date().toISOString()
    expect(within(card).getByTestId('lead-whatsapp').getAttribute('href')).toContain('wa.me/5521999990000')
    fireEvent.change(within(card).getByLabelText('Etapa de Maria Silva'), { target: { value: 'perdido' } })
    expect(await screen.findByTestId('lead-motivo')).toBeTruthy()
    expect(txt('funil-msg')).toContain('motivo')
    fireEvent.change(screen.getByLabelText('Etapa de Maria Silva'), { target: { value: 'negociacao' } })
    await waitFor(() => expect(within(screen.getByTestId('coluna-negociacao')).queryByTestId('lead-card')).toBeTruthy())
    fireEvent.click(screen.getByTestId('lead-avancar'))
    await waitFor(() => expect(within(screen.getByTestId('coluna-ganho')).queryByTestId('lead-card')).toBeTruthy())
    await waitFor(() => expect(txt('funil-msg')).toContain('Caso criado para Maria Silva'))
    expect(falso.tabelas.tarefas[0]).toMatchObject({ cliente: 'Maria Silva', honorario_previsto: 6000, nivel: 'projeto' })
    expect(falso.tabelas.leads[0].caso_id).toBe(falso.tabelas.tarefas[0].id)
    expect(txt('funil-resumo')).toContain('Conversão100%')
  })
  it('sem a tabela no banco, explica em vez de quebrar', async () => {
    falso.falhar('leads', { code: 'PGRST205', message: 'Could not find the table public.leads in the schema cache' })
    tela(<FunilVendasPage />)
    expect((await screen.findByTestId('funil-ausente')).textContent).toContain('108_funil_financeiro.sql')
  })
})

describe('Financeiro', () => {
  const hoje = new Date().toISOString().slice(0, 10)
  beforeEach(() => {
    falso = criarSupabaseFalso({
      lancamentos_financeiros: [], pagamentos_honorarios: [{ id: 1, caso_id: 'c1', data: hoje, valor: 1500 }],
      parcelas_honorarios: [{ id: 1, caso_id: 'c1', numero: 2, vencimento: '2020-01-01', valor: 800, pago_em: null }],
      tarefas: [{ id: 'c1', nivel: 'projeto', titulo: 'Despejo', cliente: 'Maria', area: 'Imobiliário', honorario_previsto: 3000, honorario_recebido: 1500, vencimento_honorario: null }],
    })
  })
  it('mostra honorários no fluxo, lança despesa recorrente, marca como paga e calcula reembolso', async () => {
    tela(<FinanceiroPage />)
    await waitFor(() => expect(txt('financeiro-resumo')).toContain('Recebido no mêsR$ 1.500,00'))
    expect(txt('contas-receber')).toContain('Mais de 90 dias (1)')
    fireEvent.click(screen.getByTestId('lanc-salvar'))
    expect(txt('financeiro-msg')).toContain('descrição')
    fireEvent.change(screen.getByTestId('lanc-descricao'), { target: { value: 'Aluguel da sala' } })
    fireEvent.change(screen.getByTestId('lanc-valor'), { target: { value: '0' } })
    fireEvent.click(screen.getByTestId('lanc-salvar'))
    expect(txt('financeiro-msg')).toContain('maior que zero')
    fireEvent.change(screen.getByTestId('lanc-valor'), { target: { value: '2.000,00' } })
    fireEvent.change(screen.getByTestId('lanc-repetir'), { target: { value: '3' } })
    fireEvent.click(screen.getByTestId('lanc-pago'))
    fireEvent.click(screen.getByTestId('lanc-salvar'))
    await waitFor(() => expect(txt('financeiro-msg')).toBe('3 lançamentos de R$ 2.000,00 gravados.'))
    expect(falso.tabelas.lancamentos_financeiros.map(l => l.pago_em)).toEqual([hoje, null, null])
    await waitFor(() => expect(txt('financeiro-resumo')).toContain('Resultado do mês-R$ 500,00'))
    expect(screen.getAllByTestId('conta-pagar')).toHaveLength(2)
    fireEvent.click(screen.getAllByTestId('marcar-pago')[0])
    await waitFor(() => expect(screen.getAllByTestId('conta-pagar')).toHaveLength(1))
    fireEvent.change(screen.getByTestId('lanc-descricao'), { target: { value: 'Custas iniciais' } })
    fireEvent.change(screen.getByTestId('lanc-categoria'), { target: { value: 'Custas processuais' } })
    fireEvent.change(screen.getByTestId('lanc-valor'), { target: { value: '350' } })
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'Maria' } })
    fireEvent.click(screen.getByTestId('lanc-pago'))
    fireEvent.click(screen.getByTestId('lanc-reembolsavel'))
    fireEvent.click(screen.getByTestId('lanc-salvar'))
    await waitFor(() => expect(txt('reembolsos')).toContain('Maria: R$ 350,00'))
    expect(txt('fluxo-caixa')).toContain('R$ 1.500,00')
    fireEvent.change(screen.getByTestId('saldo-inicial'), { target: { value: '10.000' } })
    expect(txt('previsao-90')).toContain('R$')
  })
  it('sem a tabela de lançamentos, ainda mostra os honorários e explica', async () => {
    falso.falhar('lancamentos_financeiros', { code: '42P01', message: 'relation does not exist' })
    tela(<FinanceiroPage />)
    expect((await screen.findByTestId('financeiro-ausente')).textContent).toContain('108_funil_financeiro.sql')
    await waitFor(() => expect(txt('financeiro-resumo')).toContain('R$ 1.500,00'))
    expect(screen.queryByTestId('lanc-salvar')).toBeNull()
  })
})
