// @vitest-environment jsdom
// Prova dos 100% (plano v5, fase Q): os 10 ecrãs da casa de fundos, provados em máquina.
// Cada ecrã: monta, botões com dica, sem texto proibido (jurídico, marca do cliente, grafia do Brasil),
// e os números recalculados a partir dos próprios dados de exemplo.
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))

import VisaoPresidentePage from './VisaoPresidentePage'
import CarteiraProjectosPage from './CarteiraProjectosPage'
import ContratosPage from './ContratosPage'
import PagamentosPage from './PagamentosPage'
import FornecedoresFundosPage from './FornecedoresFundosPage'
import GarantiasLicencasPage from './GarantiasLicencasPage'
import RiscosLitigiosPage from './RiscosLitigiosPage'
import DocumentosFundosPage from './DocumentosFundosPage'
import AssistenteFundosPage from './AssistenteFundosPage'

import { PROJETOS_DEMO } from '@/data/demoObraAngola'
import { CONTRATOS_DEMO } from '@/data/contratosDemo'
import { PAGAMENTOS_DEMO } from '@/data/pagamentosDemo'
import { FORNECEDORES_DEMO, GARANTIAS_DEMO, RISCOS_DEMO } from '@/data/operacaoDemo'
import { DOCUMENTOS_DEMO, AUDITORIA_DEMO } from '@/data/documentosDemo'
import { calcularBoletim } from '@/lib/medicaoObra'
import { diasAte } from '@/data/referenciaDemo'

const fmt = (v: number) => new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 0 }).format(v)
const montar = (el: React.ReactElement) => render(<MemoryRouter>{el}</MemoryRouter>)
const texto = () => document.body.textContent ?? ''

// Palavras que nunca podem aparecer num ecrã da casa de fundos.
// Os cargos legítimos da casa (Director jurídico) não contam; advocacia e marca do cliente contam sempre.
const CARGOS_OK = /Director jur[ií]dico|Jur[ií]dico e conformidade/g
const PROIBIDAS = [/jur[ií]dic/i, /imbono/i, /gemcorp/i, /advoga/i, /\busu[aá]rio/i, /\btela\b/i, /\bprojetos?\b/, /\bsetor\b/]

const provaComum = () => {
  const t = texto().replace(CARGOS_OK, '')
  for (const re of PROIBIDAS) expect(t).not.toMatch(re)
  expect(t.toLowerCase()).toMatch(/demonstraç|exemplo|inventad/)
  for (const b of screen.queryAllByRole('button')) {
    expect(b.getAttribute('title') || b.getAttribute('aria-label'), `botão sem dica: ${b.textContent}`).toBeTruthy()
  }
}

afterEach(cleanup)

describe('prova dos ecrãs da casa de fundos', () => {
  it('Q02 Visão do presidente: totais e avisos batem com os dados', () => {
    montar(<VisaoPresidentePage />)
    const contratado = PROJETOS_DEMO.reduce((s, p) => s + p.itens.reduce((a, i) => a + i.quantidade * i.precoUnitario, 0), 0)
    const aPagar = PROJETOS_DEMO.reduce((s, p) => s + calcularBoletim(p.itens, p.medidos, p.parametros).liquidoAPagar, 0)
    expect(texto()).toContain(`${fmt(contratado)} Kz`)
    expect(texto()).toContain(`${fmt(aPagar)} Kz`)
    expect(screen.getByTestId('lista-projectos').children.length).toBe(PROJETOS_DEMO.length)
    provaComum()
  })

  it('Q03 Carteira: filtros funcionam e contam certo', () => {
    montar(<CarteiraProjectosPage />)
    expect(screen.getByTestId('carteira').querySelectorAll('[data-cor]').length).toBe(PROJETOS_DEMO.length)
    const pais = screen.getByTitle('Filtrar os projectos por país') as HTMLSelectElement
    fireEvent.change(pais, { target: { value: 'NA' } })
    const esperadoNA = PROJETOS_DEMO.filter(p => p.pais === 'NA').length
    expect(screen.getByTestId('carteira').querySelectorAll('[data-cor]').length).toBe(esperadoNA)
    provaComum()
  })

  it('Q04 Contratos: valores, prazos e donos batem', () => {
    montar(<ContratosPage />)
    for (const c of CONTRATOS_DEMO) {
      expect(texto()).toContain(`${fmt(c.valor)} ${c.moeda}`)
      for (const o of c.obrigacoes) {
        expect(texto()).toContain(o.texto)
        if (diasAte(o.prazo) < 45) expect(texto()).toContain(`${diasAte(o.prazo)} dias`)
      }
    }
    provaComum()
  })

  it('Q05 Pagamentos: somas por estado e por moeda batem', () => {
    montar(<PagamentosPage />)
    for (const e of ['pago', 'aprovado', 'em-analise', 'retido'] as const) {
      for (const m of ['Kz', 'US$'] as const) {
        const soma = PAGAMENTOS_DEMO.filter(p => p.estado === e && p.moeda === m).reduce((s, p) => s + p.valor, 0)
        expect(texto()).toContain(`${fmt(soma)} ${m}`)
      }
    }
    expect(texto()).toContain('Falta confirmar o título de concessão do terreno')
    provaComum()
  })

  it('Q06 Fornecedores: notas em percentagem batem', () => {
    montar(<FornecedoresFundosPage />)
    for (const f of FORNECEDORES_DEMO) expect(texto()).toContain(`Nota ${(f.nota * 100).toFixed(0)}%`)
    expect(screen.getByTestId('fornecedores').children.length).toBe(FORNECEDORES_DEMO.length)
    provaComum()
  })

  it('Q07 Garantias e licenças: ordenadas por validade, dias certos', () => {
    montar(<GarantiasLicencasPage />)
    const itens = Array.from(screen.getByTestId('garantias').children).map(li => li.textContent ?? '')
    const ordenado = [...GARANTIAS_DEMO].sort((a, b) => a.validade.localeCompare(b.validade))
    ordenado.forEach((g, i) => {
      expect(itens[i]).toContain(g.descricao)
      if (diasAte(g.validade) < 45) expect(itens[i]).toContain(`${diasAte(g.validade)} dias`)
    })
    provaComum()
  })

  it('Q08 Riscos e litígios: por nível, do alto ao baixo, com a medida', () => {
    montar(<RiscosLitigiosPage />)
    const itens = Array.from(screen.getByTestId('riscos').children).map(li => li.textContent ?? '')
    const ordem = { alto: 0, medio: 1, baixo: 2 } as const
    const esperado = [...RISCOS_DEMO].sort((a, b) => ordem[a.nivel] - ordem[b.nivel])
    esperado.forEach((r, i) => {
      expect(itens[i]).toContain(r.titulo)
      expect(itens[i]).toContain(r.medida)
    })
    provaComum()
  })

  it('Q09 Documentos e auditoria: listas completas', () => {
    montar(<DocumentosFundosPage />)
    expect(screen.getByTestId('documentos').children.length).toBe(DOCUMENTOS_DEMO.length)
    expect(screen.getByTestId('auditoria').children.length).toBe(AUDITORIA_DEMO.length)
    for (const ev of AUDITORIA_DEMO) expect(texto()).toContain(ev.alvo)
    provaComum()
  })

  it('Q10 Assistente: perguntas abrem e fecham, respostas coerentes com os dados', () => {
    montar(<AssistenteFundosPage />)
    // Só os botões das perguntas (dentro do conteúdo), fora o menu e o Sair da moldura da casa.
    const botoes = screen.getAllByRole('button').filter(b => b.hasAttribute('aria-expanded'))
    expect(botoes.length).toBe(4)
    fireEvent.click(botoes[0])
    expect(texto()).toContain('Estrada do Planalto')
    expect(botoes[0].getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(botoes[0])
    expect(botoes[0].getAttribute('aria-expanded')).toBe('false')
    provaComum()
  })
})
