import { Component, type ReactNode } from 'react'

// Passo 63: se uma tela quebrar, mostra uma explicação simples e "Tentar de novo" em vez de página branca.
export default class ErroTela extends Component<{ children: ReactNode; chave?: string }, { erro: Error | null }> {
  state = { erro: null as Error | null }
  static getDerivedStateFromError(erro: Error) { return { erro } }
  componentDidUpdate(prev: { chave?: string }) { if (prev.chave !== this.props.chave && this.state.erro) this.setState({ erro: null }) }
  componentDidCatch(erro: Error) { console.error('Tela com erro:', erro) }
  render() {
    if (!this.state.erro) return this.props.children
    const rede = /fetch|network|carregar|dynamically imported|chunk/i.test(this.state.erro.message)
    return (
      <div role="alert" data-testid="erro-tela" className="max-w-xl mx-auto mt-10 bg-white shadow-sm border-t-2 border-dourado p-6">
        <h2 className="font-serif text-2xl text-navy">Esta tela não abriu</h2>
        <p className="text-sm text-grafite mt-2">{rede ? 'Parece que a internet caiu ou ficou lenta no meio do carregamento.' : 'Algo inesperado aconteceu nesta tela. Nenhum dado foi perdido.'} Toque em “Tentar de novo”. Se continuar, volte ao Painel e avise o administrador.</p>
        <p className="text-xs text-grafite-claro mt-2">Detalhe técnico: {this.state.erro.message.slice(0, 160)}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <button type="button" onClick={() => (rede ? window.location.reload() : this.setState({ erro: null }))} className="min-h-[44px] px-5 bg-navy text-white text-sm uppercase tracking-wider">Tentar de novo</button>
          <a href="#/dashboard" onClick={() => this.setState({ erro: null })} className="min-h-[44px] px-5 inline-flex items-center border border-navy text-navy text-sm">Ir ao Painel</a>
        </div>
      </div>
    )
  }
}
