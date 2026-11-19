// Águas, fase 2: telemetria da ANA. Sem rede: o XML é montado em memória.
import { describe, it, expect } from 'vitest'
import { fingirDeno } from '../_testes/deno'
import { canonizar as canonSrc } from '../../../src/lib/predicao/ontologia'

fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_SERVICE_ROLE_KEY: 'k', VITEST: '1' })
const mod = await import('./index')

const leitura = (h: string, c: string, n: string, v: string) =>
  `<DadosHidrometereologicos diffgr:id="x"><CodEstacao>58880001</CodEstacao><DataHora>${h} </DataHora><Vazao>${v}</Vazao><Nivel>${n}</Nivel><Chuva>${c}</Chuva></DadosHidrometereologicos>`
const DADOS = `<DataTable>${[
  leitura('2026-11-17 10:00:00', '1.50', '230.00', '1000.00'),
  leitura('2026-11-17 10:15:00', '0.50', '240.00', '1100.00'),
  leitura('2026-11-18 09:00:00', '0.00', '238.40', ''),
  leitura('2026-11-19 01:00:00', '9.00', '999', '999'),
].join('')}</DataTable>`

const CADASTRO = `<DataSet>
<Table diffgr:id="Table1"><NomeEstacao>CURUÇÁ</NomeEstacao><CodEstacao>00047008</CodEstacao><Bacia>3</Bacia><SubBacia>32</SubBacia><Municipio-UF>CURUÇA-PA</Municipio-UF><Latitude>-0.72310</Latitude><Longitude>-47.85470</Longitude><NomeRio /><StatusEstacao>Ativo</StatusEstacao></Table>
<Table diffgr:id="Table2"><NomeEstacao>PONTE</NomeEstacao><CodEstacao>58880001</CodEstacao><Bacia>5</Bacia><SubBacia>58</SubBacia><Municipio-UF>BARRA MANSA-RJ</Municipio-UF><Latitude>-22.5</Latitude><Longitude>-44.1</Longitude><NomeRio>RIO PARAÍBA DO SUL</NomeRio><StatusEstacao>Ativo</StatusEstacao></Table>
<Table diffgr:id="Table3"><NomeEstacao>DESLIGADA</NomeEstacao><CodEstacao>1</CodEstacao><StatusEstacao>Inativo</StatusEstacao></Table>
</DataSet>`

describe('telemetria da ANA', () => {
  it('lê o cadastro só com estações ativas, com município, UF e rio', () => {
    const e = mod.lerEstacoes(CADASTRO)
    expect(e.map(x => x.codigo)).toEqual(['00047008', '58880001'])
    expect(e[1]).toMatchObject({ uf: 'RJ', municipio: 'BARRA MANSA', rio: 'RIO PARAÍBA DO SUL', bacia: '5', latitude: -22.5 })
    expect(e[0].rio).toBeNull()
  })

  it('resume por dia fechado: chuva somada, nível e vazão em média, e o dia de hoje fica de fora', () => {
    const d = mod.resumirDias(DADOS, '2026-11-19')
    expect(d).toEqual([
      { dia: '2026-11-17', chuva_mm: 2, nivel_cm: 235, vazao_m3s: 1050, leituras: 2 },
      { dia: '2026-11-18', chuva_mm: 0, nivel_cm: 238.4, vazao_m3s: null, leituras: 1 },
    ])
  })

  it('o rodízio cobre todas as estações em poucos dias, sem repetir', () => {
    const est = Array.from({ length: 250 }, (_, i) => ({ codigo: String(i).padStart(5, '0') })) as never[]
    const vistos = new Set<string>()
    for (let dia = 0; dia < 5; dia++) for (const e of mod.escolher(est, 50, dia) as { codigo: string }[]) vistos.add(e.codigo)
    expect(vistos.size).toBe(250)
  })

  it('um dia só já espalha pelo país inteiro (salto, não bloco)', () => {
    const est = Array.from({ length: 250 }, (_, i) => ({ codigo: String(i).padStart(5, '0') })) as never[]
    const lote = (mod.escolher(est, 50, 0) as { codigo: string }[]).map(e => Number(e.codigo))
    expect(lote.length).toBe(50)
    expect(Math.min(...lote)).toBeLessThan(10)
    expect(Math.max(...lote)).toBeGreaterThan(240)
  })

  it('o hash usa a mesma receita da biblioteca do navegador', () => {
    const c = { b: 1, a: { y: 2, x: [1, 'z'] }, n: null }
    expect(mod.canonizar(c)).toBe(canonSrc(c))
  })

  it('sem o segredo devolve 401 e não abre o banco', async () => {
    let abriu = false
    const r = await mod.atender(new Request('https://x', { method: 'POST', body: '{}' }), async () => { abriu = true; return { q: async () => [], fechar: async () => {} } })
    expect(r.status).toBe(401)
    expect(abriu).toBe(false)
  })
})
