import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'
import { ouvirRede } from '@/lib/rede'

// Passo 63: faixa fixa "Sem conexão" quando o aparelho fica offline ou as chamadas falham.
export default function FaixaConexao() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const [chamadas, setChamadas] = useState(true)
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    const sair = ouvirRede(setChamadas)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); sair() }
  }, [])
  if (online && chamadas) return null
  return (
    <div role="alert" data-testid="sem-conexao" className="flex items-center gap-2 px-4 py-2 bg-atencaoFundo border-b-2 border-atencao text-atencao text-sm">
      <WifiOff size={16} aria-hidden="true" />
      <span><strong>Sem conexão.</strong> O que está na tela continua visível; assim que a internet voltar, as informações se atualizam sozinhas. Evite salvar até lá.</span>
    </div>
  )
}
