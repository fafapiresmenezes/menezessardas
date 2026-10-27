import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, CalendarDays, FileText, Bell, X } from 'lucide-react'

const CHAVE = 'lsm-boas-vindas-v1'

const PASSOS = [
  { icone: Building2, titulo: 'Boas-vindas à gestão de contratos', texto: 'Aqui ficam todos os imóveis do escritório, com seus contratos, documentos e prazos, num só lugar.', rota: '/dashboard', acao: 'Ver o painel' },
  { icone: FileText, titulo: 'Cadastre arrastando', texto: 'Em Imóveis, arraste o PDF do contrato para a tela. A plataforma lê o arquivo e preenche os campos para você conferir.', rota: '/imoveis', acao: 'Abrir Imóveis' },
  { icone: CalendarDays, titulo: 'Clique no dia para marcar', texto: 'Na Agenda, toque em "Novo" em qualquer dia para criar um compromisso e escolher com quantos dias de antecedência quer o aviso.', rota: '/agenda', acao: 'Abrir a Agenda' },
  { icone: Bell, titulo: 'Avisos no celular', texto: 'Na Agenda, "Conectar ao Google Agenda" leva todos os prazos para o seu celular, atualizados sozinhos.', rota: '/agenda', acao: 'Conectar agora' },
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
          <button onClick={() => { fechar(); navigate(p.rota) }} className="min-h-[44px] px-4 border border-navy text-navy hover:bg-pergaminho text-sm">
            {p.acao}
          </button>
          <div className="flex gap-2">
            {passo > 0 && (
              <button onClick={() => setPasso(passo - 1)} className="min-h-[44px] px-4 text-navy hover:bg-pergaminho text-sm">Voltar</button>
            )}
            <button onClick={() => (ultimo ? fechar() : setPasso(passo + 1))} className="min-h-[44px] px-5 bg-navy hover:bg-navy-700 text-white text-sm uppercase tracking-wider">
              {ultimo ? 'Começar' : 'Próximo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
