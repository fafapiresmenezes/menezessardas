import { useNavigate } from 'react-router-dom'
import { IDIOMAS, definirIdioma, type Idioma } from '@/lib/idioma'
import Marca from '@/components/Marca'

// Tela anterior ao login (pedido de M, 13/11/2026): visitante escolhe o idioma antes de entrar.
// Hoje a plataforma fala português; a escolha fica guardada e serve para a tradução das próximas telas.
const TITULO: Record<Idioma, string> = {
  pt: 'Escolha o seu idioma',
  en: 'Choose your language',
  zh: '请选择语言',
  es: 'Elija su idioma',
}

const DICA: Record<Idioma, string> = {
  pt: 'A plataforma fala português agora; as outras línguas chegam em breve.',
  en: 'The platform is currently in Portuguese; other languages are coming soon.',
  zh: '平台目前以葡萄牙语运行；其他语言即将推出。',
  es: 'La plataforma funciona en portugués por ahora; otros idiomas llegarán pronto.',
}

export default function BoasVindasPage() {
  const navigate = useNavigate()
  const escolher = (codigo: Idioma) => {
    definirIdioma(codigo)
    navigate('/login')
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-6 py-10">
      <div className="w-full max-w-xl text-center">
        <div className="flex justify-center mb-8"><Marca /></div>
        <h1 className="text-2xl font-serif mb-2">THEYE Institute</h1>
        <p className="text-sm text-white/70 mb-8">{TITULO.pt} · {TITULO.en} · {TITULO.es} · {TITULO.zh}</p>
        <div className="grid grid-cols-2 gap-4" data-testid="escolha-idioma">
          {IDIOMAS.map(id => (
            <button
              key={id.codigo}
              onClick={() => escolher(id.codigo)}
              title={`Continuar em ${id.nome}`}
              data-testid={`idioma-${id.codigo}`}
              className="min-h-[72px] border border-white/30 hover:border-white hover:bg-white hover:text-black transition px-5 py-4 uppercase tracking-wider text-sm"
            >
              <div className="text-lg font-serif normal-case tracking-normal">{id.nativo}</div>
              <div className="text-xs text-white/60 mt-1 normal-case">{id.nome}</div>
            </button>
          ))}
        </div>
        <p className="text-xs text-white/40 mt-8">{DICA.pt}</p>
      </div>
      <button
        type="button"
        aria-label="Escola de magia do caos dedicada a Peter Carroll"
        title="Escola de magia do caos dedicada a Peter Carroll"
        className="fixed right-2 bottom-2 text-white/10 hover:text-white/70 transition text-[11px] tracking-widest font-serif cursor-default select-none"
      >
        ☉ → ∞ +
      </button>
    </div>
  )
}
