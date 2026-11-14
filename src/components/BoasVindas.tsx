import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scale, CalendarDays, FileText, Bell, X } from 'lucide-react'

const CHAVE = 'lsm-boas-vindas-v1'

// Apresentação pensada para o advogado brasileiro: prazos, processos, peças e avisos (12/11/2026).
const PASSOS = [
  { icone: Scale, titulo: 'Boas-vindas à plataforma', texto: 'Comece pelo Meu dia: os prazos, as intimações e as tarefas de hoje, já em ordem de urgência, num só lugar.', rota: '/meu-dia', acao: 'Ver o Meu dia' },
  { icone: FileText, titulo: 'Seus processos, vigiados', texto: 'Na Carteira de processos, o robô consulta o CNJ a cada 4 horas, lê as publicações e já conta os prazos pelo código certo (CPC, CLT, CPP…).', rota: '/processos', acao: 'Abrir a Carteira de processos' },
  { icone: CalendarDays, titulo: 'Peças com o seu jeito', texto: 'No Assistente, cada peça sai com um estilo diferente, inspirado nos grandes juristas, ajustada a quem vai julgar — e sempre revisada e assinada por você.', rota: '/assistente', acao: 'Escrever uma peça' },
  { icone: Bell, titulo: 'Avisos no celular', texto: 'Na Agenda, "Conectar ao Outlook" ou "Conectar ao Google Agenda" leva todos os prazos para o seu computador e celular, atualizados sozinhos.', rota: '/agenda', acao: 'Conectar agora' },
]

export function reverBoasVindas() {
  try { localStorage.removeItem(CHAVE) } catch { /* sem armazenamento */ }
}

export default function BoasVindas() {
  const [aberto, setAberto] = useState(false)
  const [passo, setPasso] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    try { if (!localStorage.getItem(CHAVE)) setAberto(true) } catch { /* sem armazenamento */ }
  }, [])

  useEffect(() => {
    if (!aberto) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && fechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  })

  const fechar = () => {
    try { localStorage.setItem(CHAVE, new Date().toISOString()) } catch { /* sem armazenamento */ }
    setAberto(false)
  }

  if (!aberto) return null
  const p = PASSOS[passo]
  const ultimo = passo === PASSOS.length - 1

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="bv-titulo">
      <div className="bg-white w-full max-w-md p-6 shadow-sm border-t-2 border-dourado">
        <div className="flex justify-between items-start">
          <p.icone size={28} className="text-dourado" aria-hidden="true" />
          <button onClick={fechar} className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-grafite-claro hover:text-navy" aria-label="Fechar apresentação">
            <X size={20} />
          </button>
        </div>
        <h2 id="bv-titulo" className="text-2xl mt-2">{p.titulo}</h2>
        <p className="text-grafite mt-3">{p.texto}</p>
        <div className="flex gap-1.5 mt-5" aria-label={`Passo ${passo + 1} de ${PASSOS.length}`}>
          {PASSOS.map((_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= passo ? 'bg-dourado' : 'bg-grafite-claro/20'}`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-6 justify-between">
          <button title="Fecha esta apresentação e abre a tela de que este passo fala" onClick={() => { fechar(); navigate(p.rota) }} className="min-h-[44px] px-4 border border-navy text-navy hover:bg-pergaminho text-sm">
            {p.acao}
          </button>
          <div className="flex gap-2">
            {passo > 0 && (
              <button title="Volta ao passo anterior da apresentação" onClick={() => setPasso(passo - 1)} className="min-h-[44px] px-4 text-navy hover:bg-pergaminho text-sm">Voltar</button>
            )}
            <button title="Segue para o próximo passo da apresentação" onClick={() => (ultimo ? fechar() : setPasso(passo + 1))} className="min-h-[44px] px-5 bg-navy hover:bg-navy-700 text-white text-sm uppercase tracking-wider">
              {ultimo ? 'Começar' : 'Próximo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
