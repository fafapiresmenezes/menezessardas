// Passo D21: regras da administradora de locação — lançamentos do mês, repasse, vistoria e laudos.
import { describe, it, expect } from 'vitest'
import { lancamentosPadrao, prestacaoContas, roteiroPadrao, estadoGeral, compararVistorias, linhasPrestacao, linhasLaudo, pdfPrestacao, competenciaDe, rotuloCompetencia, type Lancamento } from './locacao'

const C = '2026-11-01'
const l = (tipo: Lancamento['tipo'], valor: number, pago: string | null = '2026-11-05', competencia = C): Lancamento => ({ contrato_id: 'k1', competencia, tipo, descricao: tipo, valor, pago_em: pago })

describe('administradora de locação (D21)', () => {
  it('lançamentos padrão: aluguel e taxa sobre o aluguel, sem duplicar o que já existe', () => {
    expect(lancamentosPadrao('k1', C, 3500, 10, [])).toEqual([
      { contrato_id: 'k1', competencia: C, tipo: 'aluguel', descricao: 'Aluguel do mês', valor: 3500, pago_em: null },
      { contrato_id: 'k1', competencia: C, tipo: 'taxa_administracao', descricao: 'Taxa de administração 10%', valor: 350, pago_em: null },
    ])
    expect(lancamentosPadrao('k1', C, 3500, 10, [l('aluguel', 3500)])).toHaveLength(1)
    expect(lancamentosPadrao('k1', C, 3500, 0, [])).toHaveLength(1)
    expect(lancamentosPadrao('k1', C, 0, 10, [])).toHaveLength(0)
    expect(lancamentosPadrao('k1', C, 1000.005, 8.5, [])[1].valor).toBe(85)
  })

  it('repasse = recebido − despesas − taxa; só o que foi pago entra; nunca negativo; outro mês não entra', () => {
    const p = prestacaoContas([l('aluguel', 3500), l('encargo', 600), l('encargo', 200, null), l('despesa', 450), l('taxa_administracao', 350, null), l('repasse', 1000), l('aluguel', 9999, '2026-10-05', '2026-10-01')], C)
    expect(p).toMatchObject({ recebido: 4100, aReceber: 200, despesas: 450, taxa: 350, repasse: 3300, repassado: 1000, saldoRepasse: 2300 })
    expect(p.linhas).toHaveLength(6)
    expect(prestacaoContas([l('despesa', 900), l('taxa_administracao', 100)], C).repasse).toBe(0)
    expect(competenciaDe('2026-11')).toBe('2026-11-01'); expect(rotuloCompetencia('2026-11-01')).toBe('novembro de 2026')
  })

  it('roteiro padrão cobre os cômodos; estado geral é o pior item; comparação aponta só o que piorou', () => {
    const r = roteiroPadrao()
    expect(new Set(r.map(i => i.comodo))).toEqual(new Set(['Sala', 'Cozinha', 'Quarto', 'Banheiro', 'Área de serviço', 'Geral']))
    expect(r.every(i => i.estado === 'bom')).toBe(true)
    expect(estadoGeral(r)).toBe('bom')
    const saida = r.map(i => i.item === 'Piso' && i.comodo === 'Sala' ? { ...i, estado: 'ruim' as const } : i.item === 'Chuveiro' ? { ...i, estado: 'regular' as const } : i.item === 'Tanque' ? { ...i, estado: 'na' as const } : i)
    expect(estadoGeral(saida)).toBe('ruim')
    expect(compararVistorias(r, saida)).toEqual([{ comodo: 'Sala', item: 'Piso', antes: 'Bom', depois: 'Ruim' }, { comodo: 'Banheiro', item: 'Chuveiro', antes: 'Bom', depois: 'Regular' }])
    expect(compararVistorias(saida, r)).toEqual([])
  })

  it('prestação de contas e laudo em PDF: título, resumo e base legal', () => {
    const p = prestacaoContas([l('aluguel', 3500), l('despesa', 450), l('taxa_administracao', 350)], C)
    const t = linhasPrestacao(p, { imovel: 'Rua A, 10', proprietario: 'Dona Clara', inquilino: 'João' }, 10).map(x => x.texto).join('\n').replace(/\u00a0/g, ' ')
    expect(t).toContain('Prestação de contas — novembro de 2026')
    expect(t).toContain('= Repasse ao proprietário: R$ 2.700,00')
    expect(t).toContain('Lei 8.245/91')
    const pdf = pdfPrestacao(p, { imovel: 'Rua A, 10', proprietario: 'Dona Clara', inquilino: 'João' }, 10)
    expect(new TextDecoder('latin1').decode(pdf.slice(0, 8))).toBe('%PDF-1.4')
    const laudo = linhasLaudo({ imovel_id: 'i', contrato_id: null, tipo: 'entrada', data: '2026-11-06', estado_geral: 'regular', itens: [{ comodo: 'Sala', item: 'Piso', estado: 'regular', obs: 'risco no canto' }], fotos: [{ caminho: 'vistorias/i/1.jpg', legenda: 'Sala' }], observacoes: 'Chaves: 3', responsavel: 'Fátima' }, { imovel: 'Rua A, 10', inquilino: 'João' }).map(x => x.texto).join('\n').replace(/\u00a0/g, ' ')
    expect(laudo).toContain('Laudo de vistoria de entrada — 06/11/2026')
    expect(laudo).toContain('Piso: Regular — risco no canto')
    expect(laudo).toContain('Fotos (1)')
    expect(laudo).toContain('art. 22, V')
  })
})
