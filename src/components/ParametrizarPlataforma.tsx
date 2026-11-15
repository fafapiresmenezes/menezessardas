import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Network, Users, PenLine, Check } from 'lucide-react'
import { perfilAtual } from '@/lib/equipe'
import { estadoParametrizacao, marcarParametrizada } from '@/lib/parametrizacao'

// Tela grande do primeiro acesso de quem administra o escritório (pedido de M, 13/11/2026).
// Só aparece para a administração, só enquanto o escritório não foi parametrizado, e some para
// sempre quando a administração diz que terminou. "Depois" fecha só nesta visita: a tela volta no
// próximo acesso enquanto a hierarquia não estiver definida, porque sem ela a privacidade por
// advogado fica desligada e todo mundo do escritório vê tudo.

const PASSOS = [
  { icone: Network, rota: '/hierarquia', titulo: 'Defina a hierarquia', texto: 'Diga quem é sócio, quem é gestor e quem é pleno ou júnior. É isto que faz cada advogado ver só os seus processos, e sócios e gestor verem os do escritório inteiro.' },
  { icone: Users, rota: '/equipe', titulo: 'Libere quem vai usar', texto: 'Quem pediu para entrar fica numa fila esperando. Aqui você libera cada pessoa e diz o que ela pode fazer.' },
  { icone: PenLine, rota: '/parametros-escrita', titulo: 'Ajuste as peças ao escritório', texto: 'Tom, tamanho e estrutura das peças que o robô escreve. Tudo o que ele escrever continua sendo rascunho que o advogado revisa e assina.' },
]

export default function ParametrizarPlataforma() {
  const [aberto, setAberto] = useState(false)
  const [gravando, setGravando] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let vivo = true
    const adiado = (() => { try { return sessionStorage.getItem('theye-parametrizar-depois') === '1' } catch { return false } })()
    if (adiado) return
    Promise.all([perfilAtual(), estadoParametrizacao()])
      .then(([funcao, est]) => { if (vivo && funcao === 'admin' && !est.feita) setAberto(true) })
      .catch(() => undefined)
    return () => { vivo = false }
  }, [])

  const depois = () => {
    try { sessionStorage.setItem('theye-parametrizar-depois', '1') } catch { /* sem armazenamento */ }
    setAberto(false)
  }

  const terminei = async () => {
    setGravando(true)
    try { await marcarParametrizada() } catch { /* se não gravar, a tela volta no próximo acesso */ }
    setGravando(false)
    setAberto(false)
  }

  if (!aberto) return null

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="parametrizar-titulo" data-testid="parametrizar-plataforma"
      className="fixed inset-0 z-50 bg-navy text-white overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="max-w-3xl w-full">
          <p className="uppercase tracking-[0.2em] text-xs text-white/60">Primeiro acesso</p>
          <h1 id="parametrizar-titulo" className="font-serif text-4xl sm:text-5xl mt-3 leading-tight">
            Parametrize a plataforma e defina a hierarquia
          </h1>
          <p className="text-white/80 mt-4 text-lg">
            Isto se faz uma vez só. Depois a plataforma segue sozinha, e esta tela não aparece mais.
          </p>

          <ol className="mt-8 space-y-4">
            {PASSOS.map((p, i) => (
              <li key={p.rota}>
                <button type="button" onClick={() => navigate(p.rota)} data-testid={`parametrizar-${i + 1}`}
                  title={`Abre a tela "${p.titulo}" para fazer este passo agora`}
                  className="w-full text-left flex gap-4 items-start p-5 border border-white/20 hover:bg-white/5 min-h-[44px]">
                  <span className="shrink-0 mt-1"><p.icone size={24} aria-hidden="true" /></span>
                  <span>
                    <span className="block text-xl font-serif">{i + 1}. {p.titulo}</span>
                    <span className="block text-white/70 text-sm mt-1">{p.texto}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-3 mt-8">
            <button type="button" onClick={terminei} disabled={gravando} data-testid="parametrizar-terminei"
              title="Guarda que este escritório já foi parametrizado; esta tela não aparece mais para ninguém daqui"
              className="min-h-[44px] px-6 bg-white text-navy text-sm uppercase tracking-wider inline-flex items-center gap-2">
              <Check size={16} aria-hidden="true" />{gravando ? 'Guardando…' : 'Já parametrizei'}
            </button>
            <button type="button" onClick={depois} data-testid="parametrizar-depois"
              title="Fecha só por agora; a tela volta no próximo acesso enquanto a hierarquia não estiver definida"
              className="min-h-[44px] px-6 border border-white/40 text-sm uppercase tracking-wider">
              Agora não
            </button>
          </div>
          <p className="text-white/50 text-xs mt-4">
            Enquanto a hierarquia não estiver definida, todas as pessoas liberadas do escritório veem todos os processos.
          </p>
        </div>
      </div>
    </div>
  )
}
