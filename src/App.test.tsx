// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'

// O defeito que este teste tranca: a pessoa chegava em theye.club, escolhia a língua e NÃO SAÍA DA
// TELA DE IDIOMAS. A tela passava a falar a língua escolhida, mas a entrada continuava achando que
// ninguém havia escolhido e a mandava de volta. Só recarregando a página ela conseguia entrar.
//
// A causa: a pergunta "já escolheu idioma?" estava escrita dentro do `element` da rota, no App. O
// `element` é montado quando o App se desenha, e o App não se desenha de novo a cada navegação,
// porque o roteador vive dentro dele. A resposta da primeira vez ficava congelada.
//
// Achado rodando o pacote de produção num navegador de verdade, não nos testes: nenhum teste olhava
// a travessia inteira, da tela de idiomas até a entrada.

const semSessao = { data: { session: null }, error: null }
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    auth: {
      getSession: async () => semSessao,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null }),
        listFactors: async () => ({ data: { all: [], totp: [] }, error: null }),
      },
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
  },
}))
vi.mock('@/lib/doisFatores', () => ({ segundoFatorOk: async () => false }))

const { default: App } = await import('@/App')
const { reiniciarIdioma } = await import('@/lib/i18n')

describe('a travessia da primeira tela até a entrada', () => {
  beforeEach(() => { cleanup(); localStorage.clear(); reiniciarIdioma(); window.location.hash = '' })

  it('quem nunca escolheu idioma cai na tela de idiomas', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('escolha-idioma')).toBeTruthy())
    expect(window.location.hash).toBe('#/boas-vindas')
  })

  it('escolher a língua leva para a entrada, sem recarregar a página', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('idioma-en')).toBeTruthy())
    fireEvent.click(screen.getByTestId('idioma-en'))
    await waitFor(() => expect(window.location.hash).toBe('#/login'))
    expect(localStorage.getItem('theye-idioma')).toBe('en')
    // e a entrada fala a língua escolhida
    await waitFor(() => expect(screen.getByText('Sign in with your email and password')).toBeTruthy())
  })

  it('quem já escolheu antes vai direto para a entrada', async () => {
    localStorage.setItem('theye-idioma', 'es')
    render(<App />)
    await waitFor(() => expect(window.location.hash).toBe('#/login'))
  })
})
