import { useNavigate } from 'react-router-dom'
import { Building2, Users, Briefcase } from 'lucide-react'

// Tela de entrada: o escritório escolhe a área de trabalho antes de entrar na plataforma.
const AREAS = [
  { chave: 'imobiliario', titulo: 'Imobiliário', texto: 'Imóveis, contratos, prazos, reajustes, fornecedores e agenda.', icone: Building2, destino: '/dashboard' },
  { chave: 'familia', titulo: 'Família', texto: 'Divórcio, partilha, alimentos, guarda e inventário com o agente especialista.', icone: Users, destino: '?agente=familia#/assistente' },
  { chave: 'trabalhista', titulo: 'Trabalhista', texto: 'Contratação, rescisão, verbas, FGTS e reclamações com o agente especialista.', icone: Briefcase, destino: '?agente=trabalhista#/assistente' },
]

export default function InicioPage() {
  const navigate = useNavigate()
  const abrir = (destino: string) => {
    if (destino.startsWith('?')) window.location.href = `${window.location.pathname}${destino}`
    else navigate(destino)
  }
  return (
    <main className="min-h-screen bg-navy flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center mb-10">
        <p className="font-serif text-dourado text-4xl tracking-widest">LSM</p>
        <h1 className="font-serif text-white text-3xl mt-2">Leticia Sardas &amp; Menezes</h1>
        <p className="text-white/70 mt-3">Escolha a área em que vai trabalhar agora</p>
      </div>
      <div className="grid gap-6 w-full max-w-5xl sm:grid-cols-3">
        {AREAS.map(a => (
          <button
            key={a.chave}
            data-testid={`area-${a.chave}`}
            onClick={() => abrir(a.destino)}
            className="bg-white text-left p-8 shadow-lg border-t-4 border-dourado hover:-translate-y-1 hover:shadow-xl transition focus:outline-none focus:ring-4 focus:ring-dourado/50"
          >
            <a.icone className="w-10 h-10 text-dourado mb-4" aria-hidden />
            <span className="block font-serif text-2xl text-navy mb-2">{a.titulo}</span>
            <span className="block text-sm text-gray-600">{a.texto}</span>
          </button>
        ))}
      </div>
      <p className="text-white/50 text-xs mt-12">Desenvolvido pelo Instituto THEYE</p>
    </main>
  )
}
