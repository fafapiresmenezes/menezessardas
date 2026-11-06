// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'

const upsert = vi.fn(async (_r: object, _o?: object): Promise<{ error: { message: string } | null }> => ({ error: null }))
const updateUser = vi.fn(async (_a: object): Promise<{ error: { message: string } | null }> => ({ error: null }))
const rpc = vi.fn(async (f: string, p?: { p_chave?: string }): Promise<{ data?: unknown; error: { message: string } | null }> => {
  if (f === 'estado_configuracao') return { data: [p?.p_chave === 'email_remetente' ? { permitido: true, definida: true, sufixo: '@lsm.law' } : p?.p_chave === 'brevo_api_key' ? { permitido: true, definida: true, sufixo: null } : { permitido: true, definida: false }], error: null }
  if (f === 'ics_por_email') return { data: true, error: null }
  return { data: null, error: null }
})
const invoke = vi.fn(async (f: string, _o?: object): Promise<{ data?: unknown; error: { message: string } | null }> => f === 'agendar-notificacoes' ? { data: { enviado: true, para: ['fatima@gmenezes.com'] }, error: null } : { data: { ok: true }, error: null })
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { alertas_email: false, dias_antecedencia: 15 } }) }) }), upsert: (r: object, o?: object) => upsert(r, o) }),
    rpc: (f: string, p?: object) => rpc(f, p),
    functions: { invoke: (f: string, o?: object) => invoke(f, o) },
    auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'fatima@gmenezes.com', user_metadata: { nome: 'Fátima Menezes' } } } }), updateUser: (a: object) => updateUser(a) },
  },
}))
const salvarChaveIA = vi.fn(async (_v: string) => undefined)
const testarChaveIA = vi.fn(async () => ({ ok: true, modelo: 'claude-sonnet' }))
vi.mock('@/lib/ia', () => ({
  estadoChaveIA: async () => ({ permitido: true, definida: true, atualizadoEm: null, sufixo: 'x9Qz' }),
  salvarChaveIA: (v: string) => salvarChaveIA(v), testarChaveIA: () => testarChaveIA(), removerChaveIA: async () => undefined,
}))
vi.mock('@/lib/equipe', async (orig) => ({ ...(await orig() as object), perfilAtual: async () => 'admin' }))
vi.mock('@/components/DoisFatores', () => ({ default: () => <div data-testid="dois-fatores" /> }))
vi.mock('@/components/EstiloEscrita', () => ({ default: () => <div data-testid="estilo" /> }))
vi.mock('@/components/AvaliacaoSUS', () => ({ default: () => <div data-testid="sus" /> }))
vi.mock('@/components/SecaoPix', () => ({ default: () => <div data-testid="pix" /> }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: ConfiguracoesPage } = await import('./ConfiguraçõesPage')
const { rotuloFuncao } = await import('@/lib/equipe')

const secao = (id: string) => document.querySelector(`section[aria-labelledby="${id}"]`) as HTMLElement
const texto = (s: string | null | undefined) => (s ?? '').replace(/ /g, ' ')

describe('Configurações', () => {
  beforeEach(() => {
    cleanup(); localStorage.clear(); upsert.mockClear(); updateUser.mockClear(); rpc.mockClear(); invoke.mockClear(); salvarChaveIA.mockClear(); testarChaveIA.mockClear()
    window.print = vi.fn()
    Object.assign(navigator, { clipboard: { writeText: vi.fn(async (_t: string) => undefined) } })
  })

  it('preferências vêm do banco e do usuário; antecedência validada; salvar grava no banco e no navegador; resumo copiado', async () => {
    render(<ConfiguracoesPage />)
    await waitFor(() => expect((screen.getByLabelText('Nome completo') as HTMLInputElement).value).toBe('Fátima Menezes'))
    expect((screen.getByLabelText('E-mail') as HTMLInputElement).value).toBe('fatima@gmenezes.com')
    expect((screen.getByLabelText('Enviar alertas também por e-mail') as HTMLInputElement).checked).toBe(false)
    expect((screen.getByLabelText('Mostrar notificações dentro da plataforma') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText('Antecedência dos alertas (dias)') as HTMLInputElement).value).toBe('15')
    await waitFor(() => expect(screen.getByText(rotuloFuncao.admin)).toBeTruthy())
    fireEvent.change(screen.getByLabelText('Antecedência dos alertas (dias)'), { target: { value: '200' } })
    fireEvent.click(screen.getByText('Salvar preferências'))
    expect(screen.getByRole('alert').textContent).toContain('A antecedência deve ficar entre 1 e 180 dias.')
    expect(upsert).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Antecedência dos alertas (dias)'), { target: { value: '20' } })
    fireEvent.click(screen.getByLabelText('Enviar alertas também por e-mail'))
    fireEvent.click(screen.getByText('Salvar preferências'))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Preferências salvas. Os avisos por e-mail passam a respeitar estas escolhas.'))
    expect(upsert.mock.calls[0]![0]).toMatchObject({ usuario_id: 'u1', alertas_email: true, dias_antecedencia: 20 })
    expect(JSON.parse(localStorage.getItem('preferencias-usuario')!)).toMatchObject({ nomeCompleto: 'Fátima Menezes', alertasEmail: true, diasAntecedencia: 20 })
    fireEvent.click(screen.getByTestId('copiar-preferencias'))
    await waitFor(() => expect(screen.getByTestId('copiar-preferencias').textContent).toBe('Resumo copiado'))
    const copiado = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string
    expect(copiado).toContain('Nome: Fátima Menezes')
    expect(copiado).toContain('Alertas por e-mail: ligados')
    expect(copiado).toContain('Antecedência dos alertas: 20 dia(s)')
    expect(copiado).not.toMatch(/chave|senha/i)
    fireEvent.click(screen.getByTestId('imprimir-preferencias'))
    expect(window.print).toHaveBeenCalled()
  })

  it('senha: tamanho mínimo, confirmação igual, botão só com os dois campos, mostrar senhas, troca no Supabase', async () => {
    render(<ConfiguracoesPage />)
    const s = secao('senha')
    const nova = within(s).getByLabelText('Nova senha') as HTMLInputElement
    const confirma = within(s).getByLabelText('Repita a nova senha') as HTMLInputElement
    const botao = () => within(s).getByRole('button', { name: /Alterar senha|Alterando/ }) as HTMLButtonElement
    expect(botao().disabled).toBe(true)
    fireEvent.change(nova, { target: { value: 'curta' } }); fireEvent.change(confirma, { target: { value: 'curta' } })
    expect(botao().disabled).toBe(false)
    fireEvent.click(botao())
    expect(within(s).getByRole('alert').textContent).toBe('A nova senha precisa ter pelo menos 8 caracteres.')
    fireEvent.change(nova, { target: { value: 'segredo-forte-1' } }); fireEvent.change(confirma, { target: { value: 'segredo-forte-2' } })
    fireEvent.click(botao())
    expect(within(s).getByRole('alert').textContent).toBe('As duas senhas não são iguais.')
    expect(updateUser).not.toHaveBeenCalled()
    expect(nova.type).toBe('password')
    fireEvent.click(within(s).getByRole('button', { name: 'Mostrar senhas' }))
    expect(nova.type).toBe('text'); expect(confirma.type).toBe('text')
    fireEvent.change(confirma, { target: { value: 'segredo-forte-1' } })
    fireEvent.click(botao())
    await waitFor(() => expect(within(s).getByRole('status').textContent).toBe('Senha alterada. Use a nova senha no próximo acesso.'))
    expect(updateUser).toHaveBeenCalledWith({ password: 'segredo-forte-1' })
    expect(nova.value).toBe(''); expect(confirma.value).toBe('')
  })

  it('chave da IA (estado, salvar, testar), e-mail de avisos ativo com teste, Escavador e convite .ics por e-mail', async () => {
    render(<ConfiguracoesPage />)
    const ia = secao('ia')
    await waitFor(() => expect(texto(ia.textContent)).toContain('Chave configurada — termina em ····x9Qz.'))
    const testar = within(ia).getByRole('button', { name: /Testar a IA|Testando/ }) as HTMLButtonElement
    expect(testar.disabled).toBe(false)
    fireEvent.click(testar)
    await waitFor(() => expect(within(ia).getByRole('status').textContent).toBe('A IA respondeu. Tudo certo para analisar contratos (modelo claude-sonnet).'))
    const salvar = within(ia).getByRole('button', { name: /Salvar chave|Salvando/ }) as HTMLButtonElement
    expect(salvar.disabled).toBe(true)
    fireEvent.change(within(ia).getByLabelText('Chave da IA'), { target: { value: 'sk-ant-teste' } })
    expect(salvar.disabled).toBe(false)
    fireEvent.click(salvar)
    await waitFor(() => expect(within(ia).getByRole('status').textContent).toContain('Chave salva no servidor.'))
    expect(salvarChaveIA).toHaveBeenCalledWith('sk-ant-teste')
    expect((within(ia).getByLabelText('Chave da IA') as HTMLInputElement).value).toBe('')
    const notif = secao('notif')
    await waitFor(() => expect(texto(notif.textContent)).toContain('Por e-mail: ativo. Toda manhã, às 8h'))
    expect(rpc).toHaveBeenCalledWith('estado_configuracao', { p_chave: 'brevo_api_key' })
    fireEvent.click(within(notif).getByRole('button', { name: /Enviar e-mail de teste|Enviando/ }))
    await waitFor(() => expect(within(notif).getByRole('status').textContent).toBe('E-mail de teste enviado para fatima@gmenezes.com.'))
    expect(invoke).toHaveBeenCalledWith('agendar-notificacoes', { body: { teste: true } })
    await waitFor(() => expect(secao('escavador')).toBeTruthy())
    expect(within(secao('escavador')).getByRole('heading', { name: 'Escavador' })).toBeTruthy()
    const ics = screen.getByTestId('ics-por-email') as HTMLInputElement
    await waitFor(() => expect(ics.checked).toBe(true))
    fireEvent.click(ics)
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('definir_ics_por_email', { p_ligado: false }))
    expect(ics.checked).toBe(false)
    for (const t of ['dois-fatores', 'estilo', 'sus', 'pix']) expect(screen.getByTestId(t)).toBeTruthy()
  })

  it('D05: abas escondem as seções que não estão em uso, "Tudo" mostra todas e a aba escolhida fica lembrada', async () => {
    localStorage.removeItem('lsm-config-aba')
    render(<ConfiguracoesPage />)
    const form = screen.getByText('Salvar preferências').closest('form')!
    expect(form.className).not.toContain('hidden')
    expect(screen.getByTestId('dois-fatores').parentElement!.className).toContain('hidden')
    fireEvent.click(screen.getByTestId('aba-seguranca'))
    expect(form.className).toContain('hidden')
    expect(screen.getByTestId('dois-fatores').parentElement!.className).not.toContain('hidden')
    expect(localStorage.getItem('lsm-config-aba')).toBe('seguranca')
    fireEvent.click(screen.getByTestId('aba-tudo'))
    expect(form.className).not.toContain('hidden')
    for (const t of ['dois-fatores', 'estilo', 'sus', 'pix']) expect(screen.getByTestId(t).parentElement!.className).not.toContain('hidden')
  })
})
