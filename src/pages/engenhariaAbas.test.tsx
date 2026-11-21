// @vitest-environment jsdom
// Abas novas do quadradinho Engenharia (19/11/2026): "Agentes" e "Águas". Nada do que existia foi apagado.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AGENTES_ENGENHARIA, ATLAS_RESUMO, CLASSIFICACAO_ATLAS, FONTES_ATLAS, REGRAS_AGENTES, RESULTADO_PROVAS, RESULTADO_PROVAS_DURAS, RESULTADO_PROVAS_JULGAMENTO, RESULTADO_PROVAS_DESCONFIANCA, RESULTADO_PROVAS_INVARIANTES, RESULTADO_PROVAS_INTERFACES, RESULTADO_PROVAS_ERRO_FINO, RESULTADO_PROVAS_REVISAO } from '@/data/agentesEngenharia'

vi.mock('@/lib/supabase', () => ({ supabase: { functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) } }, supabaseConfigurado: true }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const EngenhariaPage = (await import('./EngenhariaPage')).default

afterEach(cleanup)

const PROIBIDAS = [/imbono/i, /gemcorp/i, /\busu[aá]rio/i, /\btela\b/i, /\bprojetos?\b/, /\bsetor\b/]

describe('fichas dos agentes de engenharia', () => {
  it('tem 46 fichas, todas com id único, nome, resumo e prompt completo', () => {
    expect(AGENTES_ENGENHARIA).toHaveLength(46)
    expect(new Set(AGENTES_ENGENHARIA.map(a => a.id)).size).toBe(46)
    for (const a of AGENTES_ENGENHARIA) {
      expect(a.nome.length).toBeGreaterThan(3)
      expect(a.resumo.length).toBeGreaterThan(20)
      expect(a.prompt.length).toBeGreaterThan(400)
      expect(a.prompt).toContain('Restrições invioláveis')
    }
    expect(AGENTES_ENGENHARIA.filter(a => a.matriz === 'especialidade')).toHaveLength(14)
    expect(AGENTES_ENGENHARIA.filter(a => a.matriz === 'posicao')).toHaveLength(14)
    expect(AGENTES_ENGENHARIA.filter(a => a.matriz === 'produto')).toHaveLength(14)
    expect(AGENTES_ENGENHARIA.filter(a => a.matriz === 'mestre')).toHaveLength(4)
  })

  it('nunca escreve o nome do cliente nem palavras da plataforma de direito', () => {
    const blob = JSON.stringify({ AGENTES_ENGENHARIA, ATLAS_RESUMO, CLASSIFICACAO_ATLAS, FONTES_ATLAS, REGRAS_AGENTES, RESULTADO_PROVAS, RESULTADO_PROVAS_DURAS, RESULTADO_PROVAS_JULGAMENTO, RESULTADO_PROVAS_DESCONFIANCA, RESULTADO_PROVAS_INVARIANTES, RESULTADO_PROVAS_INTERFACES, RESULTADO_PROVAS_ERRO_FINO, RESULTADO_PROVAS_REVISAO })
    for (const re of PROIBIDAS) expect(blob).not.toMatch(re)
  })

  it('os números do Atlas são coerentes e medidos', () => {
    expect(ATLAS_RESUMO.medidoEm).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(ATLAS_RESUMO.total).toBe(ATLAS_RESUMO.externos + ATLAS_RESUMO.internos)
    expect(ATLAS_RESUMO.guardaveis + ATLAS_RESUMO.soReferencia).toBe(ATLAS_RESUMO.externos)
    expect(ATLAS_RESUMO.programasVerificados).toBeLessThanOrEqual(ATLAS_RESUMO.programasMapeados)
    expect(ATLAS_RESUMO.porEspecialidade).toHaveLength(14)
    for (const e of ATLAS_RESUMO.porEspecialidade) {
      expect(e.guardaveis).toBeLessThanOrEqual(e.itens)
      expect(e.universidades).toBeLessThanOrEqual(ATLAS_RESUMO.universidades)
    }
  })

  it('o corpus do mundo soma por região e não inventa origem onde a fonte não diz', () => {
    expect(ATLAS_RESUMO.porRegiao.reduce((s, r) => s + r.n, 0)).toBe(ATLAS_RESUMO.externos)
    const nomes = ATLAS_RESUMO.porRegiao.map(r => r.nome)
    expect(nomes).toContain('não determinada')
    for (const r of ['Ásia', 'Europa Oriental', 'Rússia', 'América Latina', 'América do Norte', 'Europa Ocidental', 'África']) {
      expect(nomes).toContain(r)
      expect(ATLAS_RESUMO.porRegiao.find(x => x.nome === r)!.n).toBeGreaterThan(0)
    }
    expect(ATLAS_RESUMO.porPais.length).toBeGreaterThanOrEqual(10)
    for (const p of ATLAS_RESUMO.porPais) expect(p.nome).toMatch(/^[A-Z]{2}$/)
    expect(ATLAS_RESUMO.universidades).toBeGreaterThanOrEqual(190)
    expect(ATLAS_RESUMO.programasComEndereco).toBeGreaterThanOrEqual(ATLAS_RESUMO.programasVerificados)
    expect(ATLAS_RESUMO.programasComEndereco).toBeLessThanOrEqual(ATLAS_RESUMO.programasMapeados)
  })

  it('a porta de qualidade da biblioteca é mais estreita que o corpus', () => {
    expect(CLASSIFICACAO_ATLAS.passaramPortaDeQualidade).toBeLessThan(CLASSIFICACAO_ATLAS.classificados)
    expect(CLASSIFICACAO_ATLAS.naBiblioteca).toBeLessThanOrEqual(CLASSIFICACAO_ATLAS.passaramPortaDeQualidade)
    expect(CLASSIFICACAO_ATLAS.naBiblioteca).toBe(
      readFileSync('public/atlas-biblioteca-v1.jsonl', 'utf8').split('\n').filter(l => l.trim()).length,
    )
  })

  it('a classificação do corpus bate com o corpus e aponta para agentes que existem', () => {
    expect(CLASSIFICACAO_ATLAS.medidoEm).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(CLASSIFICACAO_ATLAS.classificados).toBe(ATLAS_RESUMO.externos)
    expect(CLASSIFICACAO_ATLAS.comContextoAfricano).toBeLessThanOrEqual(CLASSIFICACAO_ATLAS.classificados)
    expect(CLASSIFICACAO_ATLAS.tipos.reduce((s, t) => s + t.n, 0)).toBe(CLASSIFICACAO_ATLAS.classificados)
    expect(CLASSIFICACAO_ATLAS.estantes.length).toBeGreaterThanOrEqual(14)
    const ids = new Set(AGENTES_ENGENHARIA.map(a => a.id))
    for (const e of CLASSIFICACAO_ATLAS.estantes) {
      expect(ids.has(e.agente)).toBe(true)
      expect(e.guardaveis).toBeLessThanOrEqual(e.itens)
      expect(e.itens).toBeLessThanOrEqual(CLASSIFICACAO_ATLAS.classificados)
    }
    // todo especialista tem estante própria
    for (const a of AGENTES_ENGENHARIA.filter(x => x.matriz === 'especialidade')) {
      expect(CLASSIFICACAO_ATLAS.estantes.some(e => e.agente === a.id)).toBe(true)
    }
  })

  it('as notas da 1.ª volta são coerentes, só dos 12 especialistas, e dizem o seu limite', () => {
    expect(RESULTADO_PROVAS.aplicadoEm).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(RESULTADO_PROVAS.notas).toHaveLength(12)
    expect(RESULTADO_PROVAS.limite).toMatch(/engenheiro habilitado/)
    const ids = new Set(AGENTES_ENGENHARIA.filter(a => a.matriz === 'especialidade').map(a => a.id))
    let soma = 0
    for (const n of RESULTADO_PROVAS.notas) {
      expect(ids.has(n.agente)).toBe(true)
      expect(n.certos).toBeLessThanOrEqual(n.questoes)
      expect(n.nota).toBeCloseTo(10 * n.certos / n.questoes, 2)
      expect(n.veredito).toMatch(/^(aprovado|com supervisão|reprovado)$/)
      soma += n.questoes
    }
    expect(soma).toBeLessThanOrEqual(RESULTADO_PROVAS.questoesTotais)
  })

  it('a 2.ª volta é mais dura, cobre os 12 especialistas e diz o que ainda não mede', () => {
    expect(RESULTADO_PROVAS_DURAS.volta).toBe(2)
    expect(RESULTADO_PROVAS_DURAS.notas).toHaveLength(12)
    expect(RESULTADO_PROVAS_DURAS.questoesTotais).toBe(
      RESULTADO_PROVAS_DURAS.notas.reduce((s, n) => s + n.questoes, 0),
    )
    const ids = new Set(AGENTES_ENGENHARIA.map(a => a.id))
    for (const n of RESULTADO_PROVAS_DURAS.notas) {
      expect(ids.has(n.agente)).toBe(true)
      expect(n.certos).toBeLessThanOrEqual(n.questoes)
      expect(n.nota).toBeCloseTo(10 * n.certos / n.questoes, 2)
      expect(['aprovado', 'com supervisão', 'reprovado']).toContain(n.veredito)
    }
    expect(RESULTADO_PROVAS_DURAS.limite).toMatch(/engenheiro habilitado/)
    expect(RESULTADO_PROVAS_DURAS.limite).toMatch(/julgamento de engenharia/)
  })

  it('a 3.ª volta mede recusa e critério que governa, e diz o que ainda não mede', () => {
    expect(RESULTADO_PROVAS_JULGAMENTO.volta).toBe(3)
    expect(RESULTADO_PROVAS_JULGAMENTO.notas).toHaveLength(12)
    expect(RESULTADO_PROVAS_JULGAMENTO.questoesTotais).toBe(
      RESULTADO_PROVAS_JULGAMENTO.notas.reduce((s, n) => s + n.questoes, 0),
    )
    const ids = new Set(AGENTES_ENGENHARIA.map(a => a.id))
    for (const n of RESULTADO_PROVAS_JULGAMENTO.notas) {
      expect(ids.has(n.agente)).toBe(true)
      expect(n.nota).toBeCloseTo(10 * n.certos / n.questoes, 2)
    }
    expect(RESULTADO_PROVAS_JULGAMENTO.regra).toMatch(/recusar/)
    expect(RESULTADO_PROVAS_JULGAMENTO.limite).toMatch(/engenheiro habilitado/)
    expect(RESULTADO_PROVAS_JULGAMENTO.limite).toMatch(/não prova/)
  })

  it('a 4.ª volta mede postura, cobre os 12 e não esconde que foi corrigida à mão', () => {
    expect(RESULTADO_PROVAS_DESCONFIANCA.volta).toBe(4)
    expect(RESULTADO_PROVAS_DESCONFIANCA.estados).toHaveLength(12)
    expect(RESULTADO_PROVAS_DESCONFIANCA.questoes).toBe(RESULTADO_PROVAS_DESCONFIANCA.estados.length)
    const ids = new Set(AGENTES_ENGENHARIA.map(a => a.id))
    for (const e of RESULTADO_PROVAS_DESCONFIANCA.estados) {
      expect(ids.has(e.agente)).toBe(true)
      expect(['recusou', 'faixa_sinalizada', 'numero_mudo']).toContain(e.estado)
      expect(e.rotulo.length).toBeGreaterThan(0)
      expect(e.nota.length).toBeGreaterThan(20)
    }
    expect(RESULTADO_PROVAS_DESCONFIANCA.limite).toMatch(/à mão/)
    expect(RESULTADO_PROVAS_DESCONFIANCA.limite).toMatch(/ainda não prova/)
  })

  it('a 5.ª volta mede as regras invioláveis, cobre os 12 e diz o que ficou em falta', () => {
    expect(RESULTADO_PROVAS_INVARIANTES.volta).toBe(5)
    expect(RESULTADO_PROVAS_INVARIANTES.estados).toHaveLength(12)
    expect(RESULTADO_PROVAS_INVARIANTES.questoes).toBe(3 * RESULTADO_PROVAS_INVARIANTES.estados.length)
    const ids = new Set(AGENTES_ENGENHARIA.map(a => a.id))
    const porEstado = new Map<string, number>()
    for (const e of RESULTADO_PROVAS_INVARIANTES.estados) {
      expect(ids.has(e.agente)).toBe(true)
      expect(['invariantes_com_citacao', 'invariantes_sem_citacao', 'invariante_quebrada']).toContain(e.estado)
      expect(e.rotulo.length).toBeGreaterThan(0)
      expect(e.nota.length).toBeGreaterThan(20)
      porEstado.set(e.estado, (porEstado.get(e.estado) ?? 0) + 1)
    }
    expect(porEstado.get('invariante_quebrada') ?? 0).toBe(0)
    expect(porEstado.get('invariantes_com_citacao')).toBeGreaterThan(0)
    expect(porEstado.get('invariantes_sem_citacao')).toBeGreaterThan(0)
    expect(RESULTADO_PROVAS_INVARIANTES.limite).toMatch(/à mão/)
    expect(RESULTADO_PROVAS_INVARIANTES.limite).toMatch(/ainda não prova/)
  })

  it('a 6.ª volta mede interfaces, cobre os 12 e não esconde que os erros foram plantados', () => {
    expect(RESULTADO_PROVAS_INTERFACES.volta).toBe(6)
    expect(RESULTADO_PROVAS_INTERFACES.estados).toHaveLength(12)
    expect(RESULTADO_PROVAS_INTERFACES.questoes).toBe(RESULTADO_PROVAS_INTERFACES.estados.length)
    const ids = new Set(AGENTES_ENGENHARIA.map(a => a.id))
    const porEstado = new Map<string, number>()
    for (const e of RESULTADO_PROVAS_INTERFACES.estados) {
      expect(ids.has(e.agente)).toBe(true)
      expect(['viu_e_parou', 'viu_e_avancou', 'nao_viu']).toContain(e.estado)
      expect(e.rotulo.length).toBeGreaterThan(0)
      expect(e.nota.length).toBeGreaterThan(20)
      porEstado.set(e.estado, (porEstado.get(e.estado) ?? 0) + 1)
    }
    expect(porEstado.get('nao_viu') ?? 0).toBe(0)
    expect(porEstado.get('viu_e_parou')).toBeGreaterThan(0)
    expect(RESULTADO_PROVAS_INTERFACES.limite).toMatch(/à mão/)
    expect(RESULTADO_PROVAS_INTERFACES.limite).toMatch(/ainda não prova/)
    expect(RESULTADO_PROVAS_INTERFACES.limite).toMatch(/plantados/)
  })

  it('a 7.ª volta separa os agentes e assume os defeitos das nossas perguntas', () => {
    expect(RESULTADO_PROVAS_ERRO_FINO.volta).toBe(7)
    expect(RESULTADO_PROVAS_ERRO_FINO.estados).toHaveLength(12)
    expect(RESULTADO_PROVAS_ERRO_FINO.questoes).toBe(RESULTADO_PROVAS_ERRO_FINO.estados.length)
    const ids = new Set(AGENTES_ENGENHARIA.map(a => a.id))
    const porEstado = new Map<string, number>()
    for (const e of RESULTADO_PROVAS_ERRO_FINO.estados) {
      expect(ids.has(e.agente)).toBe(true)
      expect(['nomeou_o_erro', 'objeccao_mais_funda', 'recusou_sem_nomear', 'pergunta_defeituosa', 'disse_que_pode_fechar']).toContain(e.estado)
      expect(e.rotulo.length).toBeGreaterThan(0)
      expect(e.nota.length).toBeGreaterThan(20)
      porEstado.set(e.estado, (porEstado.get(e.estado) ?? 0) + 1)
    }
    expect(porEstado.get('disse_que_pode_fechar') ?? 0).toBe(0)
    expect(porEstado.get('nomeou_o_erro')).toBeGreaterThan(0)
    expect(porEstado.get('recusou_sem_nomear')).toBeGreaterThan(0)
    expect(RESULTADO_PROVAS_ERRO_FINO.limite).toMatch(/à mão/)
    expect(RESULTADO_PROVAS_ERRO_FINO.limite).toMatch(/defeito é nosso/)
  })

  it('a 8.ª volta conta defeitos por entregável e diz que a densidade não é a de uma obra real', () => {
    expect(RESULTADO_PROVAS_REVISAO.volta).toBe(8)
    expect(RESULTADO_PROVAS_REVISAO.estados).toHaveLength(12)
    expect(RESULTADO_PROVAS_REVISAO.questoes).toBe(RESULTADO_PROVAS_REVISAO.estados.length * RESULTADO_PROVAS_REVISAO.defeitosPorEntregavel)
    const ids = new Set(AGENTES_ENGENHARIA.map(a => a.id))
    for (const e of RESULTADO_PROVAS_REVISAO.estados) {
      expect(ids.has(e.agente)).toBe(true)
      expect(e.encontrados).toBeGreaterThanOrEqual(0)
      expect(e.encontrados).toBeLessThanOrEqual(RESULTADO_PROVAS_REVISAO.defeitosPorEntregavel)
      expect(e.nota.length).toBeGreaterThan(20)
    }
    expect(RESULTADO_PROVAS_REVISAO.limite).toMatch(/à mão/)
    expect(RESULTADO_PROVAS_REVISAO.limite).toMatch(/ainda não prova/)
    expect(RESULTADO_PROVAS_REVISAO.limite).toMatch(/quarenta páginas/)
  })

  it('toda posição tem nível N1 a N6', () => {
    for (const a of AGENTES_ENGENHARIA.filter(x => x.matriz === 'posicao')) expect(a.nivel).toMatch(/^N[1-6]$/)
  })
})

describe('abas novas do quadradinho Engenharia', () => {
  it('mantém as quatro abas antigas e junta Agentes e Águas', () => {
    render(<MemoryRouter initialEntries={['/engenharia']}><EngenhariaPage /></MemoryRouter>)
    for (const nome of ['Cálculo estrutural', 'Medição de obra', 'Matérias e consultores', 'Estudos para órgãos públicos', 'Agentes', 'Águas']) {
      expect(screen.getByRole('tab', { name: nome })).toBeTruthy()
    }
    expect(screen.getByRole('tab', { name: 'Cálculo estrutural' }).getAttribute('aria-selected')).toBe('true')
  })

  it('abre a aba Agentes pelo endereço e mostra as 14 especialidades, o Atlas e as provas', () => {
    render(<MemoryRouter initialEntries={['/engenharia?aba=agentes']}><EngenhariaPage /></MemoryRouter>)
    expect(screen.getByRole('tab', { name: 'Agentes' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getAllByTestId('ficha-agente')).toHaveLength(14)
    expect(screen.getAllByTestId('estante-agente')[0].textContent).toMatch(/Estante no Atlas:.*peças/)
    expect(screen.getAllByTestId('estado-agente')[0].textContent).toMatch(/nota 10,?\.?0 no cálculo|por provar/)
    fireEvent.click(screen.getByTestId('subaba-agentes-posicao'))
    expect(screen.getAllByTestId('ficha-agente')).toHaveLength(14)
    fireEvent.click(screen.getByTestId('subaba-agentes-mestre'))
    expect(screen.getAllByTestId('ficha-agente')).toHaveLength(4)
    fireEvent.click(screen.getAllByRole('button', { name: 'Ver o prompt completo' })[0])
    expect(screen.getByTestId('prompt-agente').textContent).toContain('Restrições invioláveis')
    fireEvent.click(screen.getByTestId('subaba-agentes-atlas'))
    expect(screen.getByTestId('atlas-fontes').textContent).toContain('216')
    expect(screen.getByTestId('atlas-numeros')).toBeTruthy()
    expect(screen.getByTestId('atlas-por-especialidade').querySelectorAll('tbody tr')).toHaveLength(14)
    expect(screen.getByTestId('atlas-classificacao').querySelectorAll('tbody tr')).toHaveLength(CLASSIFICACAO_ATLAS.estantes.length)
    expect(screen.getByTestId('atlas-por-regiao').querySelectorAll('tbody tr')).toHaveLength(ATLAS_RESUMO.porRegiao.length)
    expect(screen.getByTestId('atlas-por-regiao').textContent).toContain('Rússia')
    fireEvent.click(screen.getByTestId('subaba-agentes-biblioteca'))
    expect(screen.getByTestId('biblioteca-atlas').textContent).toMatch(/peças escolhidas do corpus/)
    fireEvent.click(screen.getByTestId('subaba-agentes-provas'))
    expect(screen.getByTestId('provas-volta2').textContent).toContain('2.ª volta')
    expect(screen.getByTestId('provas-volta3').textContent).toContain('3.ª volta')
    expect(screen.getByTestId('provas-volta4').textContent).toContain('4.ª volta')
    expect(screen.getByTestId('provas-volta5').textContent).toContain('5.ª volta')
    expect(screen.getByTestId('provas-volta6').textContent).toContain('6.ª volta')
    expect(screen.getByTestId('provas-volta7').textContent).toContain('7.ª volta')
    expect(screen.getByTestId('provas-volta8').textContent).toContain('8.ª volta')
    expect(screen.getByTestId('tabela-provas').querySelectorAll('tbody tr')).toHaveLength(46)
    expect(screen.getByTestId('provas-agentes').textContent).toMatch(/engenheiro habilitado/)
  })

  it('a aba Águas monta a casa de Águas inteira sem tirar a página /aguas', () => {
    render(<MemoryRouter initialEntries={['/engenharia?aba=aguas']}><EngenhariaPage /></MemoryRouter>)
    expect(screen.getByTestId('engenharia-aguas')).toBeTruthy()
    expect(screen.getByText('A casa de Águas do Instituto')).toBeTruthy()
    expect(screen.getByTestId('aguas-abrir-reservatorios').getAttribute('href')).toBe('/agua')
  })

  it('clicar numa aba muda o endereço e um endereço inválido cai no cálculo', () => {
    render(<MemoryRouter initialEntries={['/engenharia?aba=nada']}><EngenhariaPage /></MemoryRouter>)
    expect(screen.getByRole('tab', { name: 'Cálculo estrutural' }).getAttribute('aria-selected')).toBe('true')
    fireEvent.click(screen.getByRole('tab', { name: 'Agentes' }))
    expect(screen.getByTestId('agentes-engenharia')).toBeTruthy()
  })
})
