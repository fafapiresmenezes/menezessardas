// Passo D19 (Diamante): instalar o app no celular/computador e ligar os avisos de prazos críticos.
import { useEffect, useState } from 'react'
import { Smartphone } from 'lucide-react'
import { aoMudarInstalacao, ehIos, estadoAvisos, instaladoComoApp, instalarApp, mostrarAviso, pedirPermissaoAvisos, podeInstalar, type EstadoAvisos } from '@/lib/pwa'

export default function AvisosCelular() {
  const [estado, setEstado] = useState<EstadoAvisos>(estadoAvisos)
  const [instalavel, setInstalavel] = useState(podeInstalar)
  const [instalado, setInstalado] = useState(instaladoComoApp)
  const [msg, setMsg] = useState('')
  useEffect(() => aoMudarInstalacao(() => { setInstalavel(podeInstalar()); setInstalado(instaladoComoApp()) }), [])

  const ligar = async () => {
    const e = await pedirPermissaoAvisos()
    setEstado(e)
    setMsg(e === 'permitido' ? 'Avisos ligados neste aparelho. Prazos em até 2 dias, intimações vencidas e compromissos do dia aparecem como notificação.' : e === 'negado' ? 'O navegador bloqueou os avisos. Libere em Configurações do site > Notificações e tente de novo.' : 'Este navegador não mostra avisos.')
  }
  const testar = async () => {
    const ok = await mostrarAviso({ chave: 'teste-' + Date.now(), titulo: 'Aviso de teste · Instituto THEYE', corpo: 'Assim chegam os prazos críticos neste aparelho.', rota: '/meu-dia' })
    setMsg(ok ? 'Aviso de teste enviado.' : 'Não foi possível mostrar o aviso. Confira a permissão do navegador.')
  }
  const instalar = async () => {
    const r = await instalarApp()
    setMsg(r === 'aceito' ? 'Aplicativo instalado. Abra pelo ícone THEYE na tela inicial.' : r === 'recusado' ? 'Instalação cancelada. O botão continua aqui quando quiser.' : 'Use o menu do navegador: "Instalar aplicativo" ou "Adicionar à tela de início".')
    setInstalavel(podeInstalar()); setInstalado(instaladoComoApp())
  }
  const botao = 'min-h-[44px] px-4 text-sm border border-navy text-navy bg-white dark:bg-transparent dark:text-white dark:border-white/40'
  return (
    <section className="bg-white p-6 shadow-sm border-t-2 border-dourado mt-6" aria-labelledby="avisos-celular">
      <h2 id="avisos-celular" className="text-lg mb-1 flex items-center gap-2"><Smartphone size={18} className="text-dourado" aria-hidden="true" /> App no celular e avisos de prazo</h2>
      <p className="text-sm text-grafite-claro mb-4">Instale a plataforma como aplicativo e receba no aparelho os prazos processuais em até 2 dias, intimações vencidas e os compromissos do dia. Os avisos são gerados no próprio aparelho, sem enviar dados a terceiros.</p>
      <div className="flex flex-wrap gap-2 items-center">
        {instalado ? <span className="text-sm text-regular" data-testid="app-instalado">✓ Aberto como aplicativo</span>
          : instalavel ? <button type="button" onClick={instalar} data-testid="instalar-app" className={botao}>Instalar aplicativo</button>
          : <span className="text-sm text-grafite-claro" data-testid="instalar-manual">{ehIos() ? 'No iPhone: toque em Compartilhar e em "Adicionar à Tela de Início".' : 'No navegador: menu ⋮ > "Instalar aplicativo" (Chrome/Edge) ou "Adicionar à tela de início".'}</span>}
        {estado === 'pedir' && <button type="button" onClick={ligar} data-testid="ligar-avisos" className={botao}>Ligar avisos neste aparelho</button>}
        {estado === 'permitido' && <><span className="text-sm text-regular" data-testid="avisos-ligados">✓ Avisos ligados</span><button type="button" onClick={testar} data-testid="testar-aviso" className={botao}>Testar aviso</button></>}
        {estado === 'negado' && <span className="text-sm text-critico" data-testid="avisos-negados">Avisos bloqueados pelo navegador. Libere em Configurações do site &gt; Notificações.</span>}
        {estado === 'sem-suporte' && <span className="text-sm text-grafite-claro" data-testid="avisos-sem-suporte">Este navegador não mostra avisos; no iPhone, instale o app primeiro.</span>}
      </div>
      {msg && <p role="status" className="mt-3 text-sm text-grafite">{msg}</p>}
    </section>
  )
}
