// Casa de perfil "projectos" (fundos internacionais, 18/11/2026): produto próprio. Estes testes falham se alguma palavra de
// advocacia aparecer no menu ou na moldura dessa casa, ou se as outras casas mudarem por causa dela.
import { describe, it, expect, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { render, cleanup } from '@testing-library/react'
import { gruposProjectos, gruposVisiveis, DICAS, nomeDaTela, type Visao } from './menuTelas'
import Marca from './Marca'
import { NOME_PRODUTO_PROJECTOS } from '@/lib/plataforma'

afterEach(cleanup)
const ADVOCACIA = /jur[ií]dic|advoga|processo|pe[çc]as|intima|escrit[óo]rio|honor[áa]rio/i
const operacao: Visao = { veTudo: false, admin: false, instituto: false, sede: false }
const direccao: Visao = { veTudo: true, admin: true, instituto: false, sede: false }

describe('menu da casa de projectos', () => {
  it('não tem nenhuma palavra de advocacia, e toda tela existe, tem dica e usa o nome único da tela', () => {
    const app = readFileSync('src/App.tsx', 'utf8')
    for (const g of gruposProjectos) {
      expect(`${g.titulo} ${g.bloco} ${g.dica}`).not.toMatch(ADVOCACIA)
      for (const t of g.itens) {
        expect(t.label, t.href).not.toMatch(ADVOCACIA)
        expect(app, t.href).toContain(`path="${t.href}"`)
        expect((DICAS[t.href] ?? '').length, t.href).toBeGreaterThan(15)
        expect(nomeDaTela(t.href), t.href).toBe(t.label)
      }
    }
  })

  it('quem é da casa de projectos vê só o menu do produto, e cada nível vê só o que é seu', () => {
    const telas = (v: Visao) => gruposVisiveis(v, 'projectos').flatMap(g => g.itens.map(i => i.href))
    expect(telas(operacao)).toEqual(['/visao-presidente', '/carteira-projectos', '/demonstracao-obra', '/settings'])
    expect(telas(direccao)).toEqual(['/visao-presidente', '/carteira-projectos', '/demonstracao-obra', '/trilha', '/hierarquia', '/settings'])
    for (const h of ['/processos', '/intimacoes', '/modelos', '/honorarios', '/imoveis', '/instituto']) expect(telas(direccao)).not.toContain(h)
  })

  it('as outras casas continuam com o menu de sempre', () => {
    expect(gruposVisiveis(operacao).map(g => g.id)).toEqual(['hoje', 'processos', 'pecas', 'escritorio', 'conta'])
    expect(gruposVisiveis(operacao, 'direito')).toEqual(gruposVisiveis(operacao))
  })
})

describe('moldura da casa de projectos', () => {
  it('mostra o nome da casa e o nome do produto, sem "jurídico"', () => {
    const { container, getByTestId } = render(<Marca marca={{ nome: 'THEYE', cor: '#0B0B0C', logo_url: null, sede: false, perfil: 'projectos' }} />)
    expect(getByTestId('marca-produto').textContent).toBe(NOME_PRODUTO_PROJECTOS)
    expect(container.textContent).toContain('THEYE')
    expect(container.textContent).not.toMatch(/imbono/i)
    expect(container.textContent).not.toMatch(/jur[ií]dic/i)
  })

  it('casa parceira de advocacia continua a ver o nome da plataforma', () => {
    const { getByTestId } = render(<Marca marca={{ nome: 'Parceiro', cor: '#0B0B0C', logo_url: null, sede: false }} />)
    expect(getByTestId('marca-produto').textContent).toBe('Theye.club')
  })
})

describe('moldura dentro de uma frente do Instituto', () => {
  it('a frente de fundos internacionais tem a medição de obra e não mostra "Suporte Jurídico" na moldura', async () => {
    const { frenteDe } = await import('./menuTelas')
    const f = frenteDe('/demonstracao-obra')
    expect(f?.id).toBe('fundos')
    const { container } = render(<Marca subtitulo={f!.nome} />)
    expect(container.textContent).toContain('Plataforma, Governança, Fundos Internacionais')
    expect(container.textContent).not.toMatch(/jur[ií]dic/i)
    expect(readFileSync('src/components/Layout.tsx', 'utf8')).toContain('subtitulo={frente ? frente.nome : undefined}')
  })
})
