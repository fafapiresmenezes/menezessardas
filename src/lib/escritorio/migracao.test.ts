import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { xlsxAbas } from './lerXlsx'
import { montarTabela, tabelaDoTexto, textoEmLinhas, lerData, prepararProcessos, prepararClientes, prepararPrazos, prepararFinanceiro, acharCabecalho } from './migracao'
import { tabelasDoHtml, lerDocxXml, lerOdsXml, tabelasDoJson } from './migracaoArquivos'

const b64 = fs.readFileSync(path.resolve(__dirname, '../../test/fixtures/planilha-caio.xlsx.b64'), 'utf8')
const buf = Uint8Array.from(Buffer.from(b64, 'base64')).buffer

describe('migração do sistema antigo', () => {
  it('planilha no formato do sistema antigo: reconhece processos e nenhuma coluna se perde', async () => {
    const abas = await xlsxAbas(buf)
    const t = montarTabela('BASE DE DADOS CAIO.xlsx', abas[0].nome, abas[0].texto.split('\n').map(l => l.split('\t')))
    expect(t.tipo).toBe('processos')
    const ls = prepararProcessos(t, [], new Set())
    expect(ls.map(l => l.situacao)).toEqual(['ok', 'sem_numero'])
    expect(ls[0].dados.observacoes).toMatch(/Adv\. Principal: CAIO BARROS/)
    expect(ls[1].dados.observacoes).toMatch(/ADM-123\/2020/)
  })

  // A planilha real do Caio não vai para o repositório (dados de clientes). Roda quando o arquivo está na máquina.
  const real = process.env.PLANILHA_CAIO
  it.skipIf(!real || !fs.existsSync(real))('planilha real do Caio: 122 processos, todos aproveitados', async () => {
    const r = fs.readFileSync(real!)
    const abas = await xlsxAbas(r.buffer.slice(r.byteOffset, r.byteOffset + r.byteLength))
    const t = montarTabela('BASE DE DADOS CAIO 3.xlsx', abas[0].nome, abas[0].texto.split('\n').map(l => l.split('\t')))
    expect(t.tipo).toBe('processos')
    expect(t.linhas.length).toBe(122)
    const ja = new Set<string>()
    const ls = prepararProcessos(t, [], ja)
    const conta = (s: string) => ls.filter(l => l.situacao === s).length
    expect(conta('ok') + conta('sem_numero') + conta('duplicado_arquivo')).toBe(122)
    expect(conta('ok')).toBeGreaterThanOrEqual(100)
    // a mesma planilha solta de novo (outra aba ou outro arquivo) não duplica nada
    const de_novo = prepararProcessos(montarTabela('copia.xlsx', 'A', abas[0].texto.split('\n').map(l => l.split('\t'))), [], ja)
    expect(de_novo.filter(l => l.situacao === 'ok').length).toBe(0)
    expect(de_novo.find(l => l.situacao === 'ja_cadastrado')!.motivo).toMatch(/outra aba/)
  })

  it('acha o cabeçalho mesmo com título em cima', () => {
    const linhas = textoEmLinhas('Relatório de clientes\nEmitido em 01/11/2026\nNome;CPF/CNPJ;E-mail;Telefone;Cidade\nMaria Silva;123.456.789-00;MARIA@EX.COM;21 99999-0000;Rio\nJoão;;;;Niterói')
    expect(acharCabecalho(linhas)).toBe(2)
    const t = montarTabela('clientes.csv', 'Planilha', linhas)
    expect(t.tipo).toBe('clientes')
    const c = prepararClientes(t, ['joão'])
    expect(c[0].registro).toMatchObject({ nome: 'Maria Silva', email: 'maria@ex.com', etapa: 'ganho' })
    expect(c[0].registro!.observacoes).toMatch(/CPF\/CNPJ: 123\.456\.789-00 · Cidade: Rio/)
    expect(c[1].repetido).toBe(true)
  })

  it('prazos: datas em vários formatos e número do processo no título', () => {
    const t = montarTabela('agenda.csv', 'Prazos', textoEmLinhas('Data do prazo;Providência;Processo\n15/12/2026;Contestação;0036229-32.2016.8.19.0021\n2026-12-20;Audiência de conciliação;\n46000;Réplica;\nontem;Recurso;'))
    expect(t.tipo).toBe('prazos')
    const p = prepararPrazos(t)
    expect(p[0].registro).toMatchObject({ data_evento: '2026-12-15', titulo: 'Contestação · 0036229-32.2016.8.19.0021' })
    expect(p[1].registro!.data_evento).toBe('2026-12-20')
    expect(p[2].registro!.data_evento).toBe('2025-12-09')
    expect(p[3].registro).toBeNull()
  })

  it('financeiro: receita, despesa, pago', () => {
    const t = montarTabela('fin.csv', 'Lançamentos', textoEmLinhas('Vencimento;Descrição;Cliente;Valor;Tipo;Pago\n10/01/2027;Honorários parcela 1;Maria;R$ 1.500,00;Receita;sim\n12/01/2027;Custas;;-200,50;;\n;Sem data;;100;;'))
    expect(t.tipo).toBe('financeiro')
    const f = prepararFinanceiro(t)
    expect(f[0].registro).toMatchObject({ tipo: 'receita', valor: 1500, vencimento: '2027-01-10', pago_em: '2027-01-10', cliente: 'Maria' })
    expect(f[1].registro).toMatchObject({ tipo: 'despesa', valor: 200.5, pago_em: null })
    expect(f[2].registro).toBeNull()
  })

  it('texto corrido (PDF, e-mail) vira lista de processos com o trecho', () => {
    const t = tabelaDoTexto('relatorio.pdf', 'Texto', 'Intimação no processo 0036229-32.2016.8.19.0021 para manifestação. Repetido 0036229-32.2016.8.19.0021. Outro 00073346120168190021.')
    expect(t.tipo).toBe('processos')
    expect(t.linhas.length).toBe(2)
    expect(prepararProcessos(t, [], new Set()).filter(l => l.situacao === 'ok').length).toBe(2)
  })

  it('lerData', () => {
    expect(lerData('3 de março de 2027')).toBe('2027-03-03')
    expect(lerData('31/02/2027')).toBeNull()
    expect(lerData('05/06/27')).toBe('2027-06-05')
  })

  it('HTML exportado como .xls, Word, LibreOffice e JSON', () => {
    const h = tabelasDoHtml('<table><tr><th>Processo</th><th>Cliente</th></tr><tr><td>0036229-32.2016.8.19.0021</td><td>A &amp; B</td></tr></table>')
    expect(h[0][1]).toEqual(['0036229-32.2016.8.19.0021', 'A & B'])
    const d = lerDocxXml('<w:body><w:p><w:r><w:t>Processo 0036229-32.2016.8.19.0021</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Nome</w:t></w:r></w:p></w:tc></w:tr><w:tr><w:tc><w:p><w:r><w:t>Ana</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body>')
    expect(d.tabelas[0]).toEqual([['Nome'], ['Ana']])
    expect(d.texto).toMatch(/0036229/)
    const o = lerOdsXml('<table:table table:name="Clientes"><table:table-row><table:table-cell><text:p>Nome</text:p></table:table-cell><table:table-cell table:number-columns-repeated="2"><text:p>x</text:p></table:table-cell></table:table-row></table:table>')
    expect(o[0]).toEqual({ nome: 'Clientes', linhas: [['Nome', 'x', 'x']] })
    const j = tabelasDoJson({ clientes: [{ nome: 'Ana', email: 'a@b.com' }, { nome: 'Bia', telefone: '1' }] })
    expect(j[0].linhas[0]).toEqual(['nome', 'email', 'telefone'])
  })
})
