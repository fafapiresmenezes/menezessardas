// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

let caso: object | null = null
let resumo: object | null = null
let marca: object | null = null
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: { rpc: async (n: string) => ({ data: n === 'portal_caso' ? caso : n === 'portal_cliente' ? resumo : marca }) },
}))
vi.mock('@/components/Marca', () => ({ default: () => <div data-testid="marca-sede" /> }))
vi.mock('@/components/AssinarPortal', () => ({ default: () => <div data-testid="assinar" /> }))
vi.mock('@/components/PortalMensagens', () => ({ default: ({ caso }: { caso: string }) => <div data-testid="portal-conversa-stub">{caso}</div> }))
const { default: PortalClientePage } = await import('./PortalClientePage')
const montar = () => render(<MemoryRouter initialEntries={['/portal/tok1']}><Routes><Route path="/portal/:token" element={<PortalClientePage />} /></Routes></MemoryRouter>)
const casoBase = { titulo: 'Despejo Rua A', cliente: 'Ana', area: 'Imobiliário', numero_processo: '0001-22', situacao: 'fazendo', atualizado_em: '2026-11-01T10:00:00Z', honorario_previsto: 3000, honorario_recebido: 1000, vencimento_honorario: '2026-12-10',
  etapas: [{ titulo: 'Notificação extrajudicial', situacao: 'feito', prazo: null }, { titulo: 'Petição inicial', situacao: 'fazendo', prazo: '2026-11-20' }, { titulo: 'Audiência', situacao: 'a_fazer', prazo: null }] }

describe('Portal do cliente (página pública por link secreto)', () => {
  beforeEach(() => { cleanup(); caso = null; resumo = null; marca = null })

  it('resposta incompleta do servidor (sem etapas, sem casos, marca sem nome) vira link indisponível, sem quebrar nem mostrar "undefined"', async () => {
    caso = { titulo: 'x' }; resumo = { cliente: 'Ana' }; marca = { cor: '#000000', sede: false }
    montar()
    expect(await screen.findByRole('heading', { level: 1, name: 'Link do Portal indisponível' })).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('Peça um link novo')
    expect(screen.getByTestId('portal-rodape').textContent).not.toContain('undefined')
  })

  it('link inválido avisa; caso válido mostra andamento, etapas com prazo, honorários, glossário e rodapé da sede', async () => {
    montar()
    expect(screen.getByText('Carregando…')).toBeTruthy()
    expect((await screen.findByRole('alert')).textContent).toContain('links do Portal valem 90 dias')
    cleanup(); caso = casoBase; marca = { nome: 'GMenezes', cor: '#14213D', logo_url: null, sede: true }
    montar()
    const art = await screen.findByTestId('portal-caso')
    expect(art.textContent).toContain('Despejo Rua A')
    expect(art.textContent).toContain('Imobiliário · Processo 0001-22')
    expect(art.textContent).toContain('1 de 3 etapas')
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('33')
    expect(art.textContent).toContain('Em andamento · previsto para 20/11/2026')
    expect(art.textContent!.replace(/ /g, ' ')).toContain('Combinado: R$ 3.000,00 · Pago: R$ 1.000,00 · Em aberto: R$ 2.000,00 · vencimento 10/12/2026')
    expect(screen.getByTestId('portal-glossario')).toBeTruthy()
    expect(screen.getByTestId('assinar')).toBeTruthy()
    expect(screen.getByTestId('marca-sede')).toBeTruthy()
    expect(screen.getByTestId('portal-rodape').textContent).toBe('THEYE Institute · Suporte Jurídico')
    expect(screen.queryByTestId('portal-resumo')).toBeNull()
  })

  it('painel do cliente soma etapas, próximo prazo e honorários em aberto dos casos; marca de parceiro troca cabeçalho e rodapé', async () => {
    caso = casoBase
    resumo = { cliente: 'Ana', casos: [
      { titulo: 'Despejo Rua A', area: null, numero_processo: null, situacao: 'fazendo', atualizado_em: '', token: 'tok1', etapas_total: 3, etapas_feitas: 1, proximo_prazo: '2026-11-20', honorario_previsto: 3000, honorario_recebido: 1000 },
      { titulo: 'Cobrança Rua B', area: null, numero_processo: null, situacao: 'a_fazer', atualizado_em: '', token: 'tok2', etapas_total: 2, etapas_feitas: 2, proximo_prazo: '2026-11-15', honorario_previsto: 500, honorario_recebido: 800 },
    ] }
    marca = { nome: 'Alfa Advocacia', cor: '#AA0000', logo_url: 'https://x/logo.png', sede: false }
    montar()
    const painel = await screen.findByTestId('portal-resumo')
    expect(painel.textContent).toContain('Ana: 2 casos no escritório')
    expect(painel.textContent).toContain('3 / 5')
    expect(painel.textContent).toContain('15/11/2026')
    expect(painel.textContent!.replace(/ /g, ' ')).toContain('R$ 2.000,00')
    expect(painel.textContent).toContain('este caso')
    const cab = screen.getByTestId('portal-marca-parceiro')
    expect(cab.textContent).toContain('Alfa Advocacia')
    expect(cab.querySelector('img')!.getAttribute('src')).toBe('https://x/logo.png')
    expect(screen.getByTestId('portal-rodape').textContent).toBe('Alfa Advocacia · THEYE Institute')
    const writeText = vi.fn(async (_t: string) => undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    fireEvent.click(screen.getByTestId('copiar-link-portal'))
    expect(await screen.findByText('link copiado')).toBeTruthy()
  })
})
