import { describe, expect, it } from 'vitest'
import { analisarCsv, MODELO_CSV, dividir } from './importarImoveis'

describe('importarImoveis', () => {
  it('aceita o modelo oficial sem erros', () => {
    const r = analisarCsv(MODELO_CSV)
    expect(r.cabecalhoOk).toBe(true); expect(r.erros).toBe(0); expect(r.validas).toHaveLength(2)
    expect(r.validas[0].dados?.areaM2).toBe(85); expect(r.validas[1].dados?.matricula).toBe('')
  })
  it('aponta erros por linha e não grava a linha errada', () => {
    const csv = 'endereco;cidade;uf;tipo;uso;proprietario\nRua A, 1;Rio;RJ;castelo;locado;Ana\n;Rio;XX;casa;locado;\n'
    const r = analisarCsv(csv)
    expect(r.erros).toBe(2)
    expect(r.linhas[0].erros[0]).toMatch(/tipo "castelo"/)
    expect(r.linhas[1].erros).toEqual(expect.arrayContaining([expect.stringMatching(/endereço vazio/), expect.stringMatching(/UF "XX"/), expect.stringMatching(/proprietário vazio/)]))
  })
  it('aceita vírgula como separador, rótulos em português e aspas', () => {
    const csv = 'Endereço,Cidade,Estado,Tipo,Uso,Proprietário,Área\n"Rua B, 22",Niterói,RJ,Apartamento,Uso próprio,João,"1.200,5"\n'
    const r = analisarCsv(csv)
    expect(r.cabecalhoOk).toBe(true); expect(r.erros).toBe(0)
    expect(r.validas[0].dados).toMatchObject({ endereco: 'Rua B, 22', tipo: 'apartamento', uso: 'uso_proprio', areaM2: 1200.5 })
  })
  it('detecta linha repetida na planilha e cabeçalho faltando', () => {
    const csv = 'endereco;cidade;uf;tipo;uso;proprietario\nRua C, 3;Rio;RJ;casa;locado;Ana\nrua c, 3;rio;RJ;casa;locado;Ana\n'
    expect(analisarCsv(csv).linhas[1].erros[0]).toMatch(/repete a linha 2/)
    expect(analisarCsv('endereco;cidade\nx;y\n').cabecalhoOk).toBe(false)
    expect(dividir('a;"b;c";d', ';')).toEqual(['a', 'b;c', 'd'])
  })
})

describe('importação: duplicado da carteira atual (passo A07)', () => {
  const cab = 'endereco;cidade;uf;tipo;uso;proprietario;matricula'
  it('recusa endereço+cidade já cadastrado (sem diferenciar acento e caixa) e matrícula repetida', () => {
    const csv = [cab, 'Av. Paulista 1000;São Paulo;SP;loja;locado;Fulano;', 'Rua Nova 1;Niterói;RJ;casa;vago;Beltrano;123456789', 'Rua Livre 2;Niterói;RJ;casa;vago;Ciclano;555'].join('\n')
    const r = analisarCsv(csv, [{ endereco: 'av. paulista 1000', cidade: 'Sao Paulo', matricula: '123456789' }])
    expect(r.linhas[0].erros).toContain('já está na carteira (mesmo endereço e cidade)')
    expect(r.linhas[1].erros).toContain('já está na carteira (matrícula 123456789)')
    expect(r.validas.map(l => l.numero)).toEqual([4])
  })
  it('sem carteira informada, nada muda', () => {
    expect(analisarCsv([cab, 'Rua A 1;Rio;RJ;casa;vago;X;'].join('\n')).validas).toHaveLength(1)
  })
})
