// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
vi.mock('@/components/PerfilJulgador', () => ({ default: () => <div>Perfil do julgador</div> }))
vi.mock('@/lib/supabase', () => ({ supabase: {}, supabaseConfigurado: false }))
vi.mock('@/lib/predicao', async (orig) => ({ ...(await orig<typeof import('@/lib/predicao')>()), registrarPrevisoes: vi.fn() }))
const { default: LeituraCasoPage } = await import('./LeituraCasoPage')

describe('Leitura do caso e predição', () => {
  beforeEach(() => { cleanup(); localStorage.clear() })
  const abrir = () => render(<MemoryRouter><LeituraCasoPage /></MemoryRouter>)

  it('monta a linha do tempo, mostra valores e pontos do despejo a partir do relato, e lembra no aparelho', () => {
    abrir()
    fireEvent.change(screen.getByLabelText('Relato dos fatos'), { target: { value: 'Contrato de locação assinado em 01/02/2022 com fiador. O inquilino deixou de pagar R$ 2.400,00 desde 05/03/2024.' } })
    expect(screen.getByTestId('linha-tempo').textContent).toMatch(/01\/02\/2022.*05\/03\/2024/)
    expect(screen.getByTestId('valores').textContent).toContain('2.400,00')
    expect(screen.getByTestId('ponto-contrato').dataset.mencionado).toBe('true')
    expect(screen.getByTestId('ponto-purgacao').dataset.mencionado).toBe('false')
    cleanup(); abrir()
    expect((screen.getByLabelText('Relato dos fatos') as HTMLTextAreaElement).value).toContain('fiador')
  })

  it('consulta a jurimetria (demonstração) e calcula se o acordo compensa', async () => {
    abrir()
    fireEvent.click(screen.getByTestId('aba-predicao'))
    fireEvent.click(screen.getByTestId('consultar-juri'))
    expect((await screen.findByTestId('resultado-juri')).textContent).toContain('81%')
    fireEvent.change(screen.getByLabelText('Valor em discussão (R$)'), { target: { value: '10000' } })
    fireEvent.change(screen.getByLabelText('Meses até o fim'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Sucumbência (CPC, art. 85, §2º)'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Proposta de acordo (R$)'), { target: { value: '9000' } })
    expect(screen.getByTestId('recomendacao').textContent).toMatch(/R\$\s8\.100,00.*compensa/)
    expect(screen.getByTestId('sensibilidade')).toBeTruthy()
  })

  it('confronta depoimentos e aponta a divergência com a pergunta', () => {
    abrir()
    fireEvent.click(screen.getByTestId('aba-depoimentos'))
    fireEvent.change(screen.getByLabelText('Depoente 1'), { target: { value: 'Autor' } })
    fireEvent.change(screen.getByLabelText('Transcrição do depoente 1'), { target: { value: 'Entreguei as chaves do apartamento ao porteiro em 10/05/2024.' } })
    fireEvent.change(screen.getByLabelText('Depoente 2'), { target: { value: 'Porteiro' } })
    fireEvent.change(screen.getByLabelText('Transcrição do depoente 2'), { target: { value: 'Recebi as chaves do apartamento em 20/05/2024.' } })
    const d = screen.getByTestId('div-data')
    expect(d.textContent).toContain('Autor'); expect(d.textContent).toContain('Porteiro'); expect(d.textContent).toMatch(/Pergunta sugerida/)
  })

  it('roteiro de audiência marca itens com base no CPC e abre espaço para anotar', () => {
    abrir()
    fireEvent.click(screen.getByTestId('aba-audiencia'))
    expect(screen.getByText(/CPC, art\. 461, II/)).toBeTruthy()
    fireEvent.click(screen.getByTestId('rot-acareacao'))
    expect(screen.getByLabelText(/Anotação: Requerer acareação/)).toBeTruthy()
  })

  it('não usa câmera nem dado biométrico e diz isso na tela', () => {
    abrir()
    expect(screen.getByText(/não usa câmera, voz, rosto nem nenhum dado biométrico/)).toBeTruthy()
  })

  it('com a vara informada, puxa a chance para a do tribunal e ajusta pelo caso', async () => {
    abrir()
    fireEvent.change(screen.getByLabelText('Vara ou câmara (opcional)'), { target: { value: '10ª Vara Cível' } })
    fireEvent.click(screen.getByTestId('aba-predicao'))
    fireEvent.click(screen.getByTestId('consultar-juri'))
    // vara 75% com 20 sentenças, tribunal 81%: (15 + 50 × 0,81) / 70 = 79%
    expect((await screen.findByTestId('encolhida')).textContent).toContain('79%')
    fireEvent.change(screen.getByLabelText('Prova documental do nosso lado'), { target: { value: '2' } })
    expect(screen.getByTestId('ajustada').textContent).toMatch(/79% → 89%/)
  })

  it('mostra a zona de acordo com a visão da outra parte', async () => {
    abrir()
    fireEvent.click(screen.getByTestId('aba-predicao'))
    fireEvent.change(screen.getByLabelText('Chance de o autor vencer (%)'), { target: { value: '50' } })
    fireEvent.change(screen.getByLabelText('Valor em discussão (R$)'), { target: { value: '100000' } })
    fireEvent.change(screen.getByLabelText('Meses até o fim'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Sucumbência (CPC, art. 85, §2º)'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Chance do autor, na visão da outra parte (%)'), { target: { value: '70' } })
    expect(screen.getByTestId('zona').textContent).toMatch(/entre R\$\s50\.000,00.*R\$\s70\.000,00/)
  })

  it('lista as referências e filtra por tema', () => {
    abrir()
    fireEvent.click(screen.getByTestId('aba-ciencia'))
    expect(screen.getByTestId('referencias').querySelectorAll('li').length).toBe(56)
    fireEvent.click(screen.getByTestId('tema-depoimentos'))
    expect(screen.getByTestId('referencias').textContent).toContain('Emotional Expressions Reconsidered')
    expect(screen.getByTestId('referencias').querySelectorAll('li').length).toBe(4)
  })

  it('registra a previsão, o desfecho e calcula a nota de Brier', async () => {
    abrir()
    fireEvent.click(screen.getByTestId('aba-predicao'))
    fireEvent.change(screen.getByLabelText('Chance de o autor vencer (%)'), { target: { value: '80' } })
    fireEvent.click(screen.getByTestId('registrar-previsao'))
    fireEvent.change(screen.getByLabelText('Desfecho real'), { target: { value: 'improcedente' } })
    const p = screen.getByTestId('placar').textContent ?? ''
    expect(p).toContain('0,640')
    cleanup(); abrir(); fireEvent.click(screen.getByTestId('aba-predicao'))
    expect(screen.getByTestId('placar').textContent).toContain('0,640')
  })
})
