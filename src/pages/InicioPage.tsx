import { useNavigate } from 'react-router-dom'
import { Building2, Users, Briefcase, Landmark, Factory, ShoppingCart, HeartPulse, Gavel, FileSignature, ShieldCheck } from 'lucide-react'

// Tela de entrada: o escritório escolhe a área de trabalho antes de entrar na plataforma.
const agente = (a: string) => `?agente=${a}#/assistente`
const AREAS = [
  { chave: 'imobiliario', titulo: 'Imobiliário', texto: 'Imóveis, contratos, prazos, reajustes, fornecedores e agenda.', icone: Building2, destino: '/dashboard' },
  { chave: 'civel', titulo: 'Cível e contratos', texto: 'Contratos, cobranças e responsabilidade civil.', icone: FileSignature, destino: agente('civel') },
  { chave: 'trabalhista', titulo: 'Trabalhista', texto: 'Contratação, rescisão, verbas, FGTS e reclamações.', icone: Briefcase, destino: agente('trabalhista') },
  { chave: 'familia', titulo: 'Família e sucessões', texto: 'Divórcio, partilha, alimentos, guarda e inventário.', icone: Users, destino: agente('familia') },
  { chave: 'tributario', titulo: 'Tributário', texto: 'Impostos, reforma tributária, defesas e planejamento.', icone: Landmark, destino: agente('tributario') },
  { chave: 'empresarial', titulo: 'Empresarial', texto: 'Sociedades, contratos empresariais e recuperação judicial.', icone: Factory, destino: agente('empresarial') },
  { chave: 'consumidor', titulo: 'Consumidor', texto: 'Relações de consumo, cláusulas abusivas e indenizações.', icone: ShoppingCart, destino: agente('consumidor') },
  { chave: 'previdenciario', titulo: 'Previdenciário', texto: 'Aposentadorias, benefícios do INSS e revisões.', icone: HeartPulse, destino: agente('previdenciario') },
  { chave: 'penal', titulo: 'Penal', texto: 'Defesa, inquérito, crimes e execução penal.', icone: Gavel, destino: agente('penal') },
  { chave: 'compliance', titulo: 'Compliance e LGPD', texto: 'Integridade, proteção de dados, ESG e due diligence.', icone: ShieldCheck, destino: '/compliance' },
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
      <div className="grid gap-4 w-full max-w-6xl sm:grid-cols-2 lg:grid-cols-5">
        {AREAS.map(a => (
          <button
            key={a.chave}
            data-testid={`area-${a.chave}`}
            onClick={() => abrir(a.destino)}
            className="bg-white text-left p-5 shadow-lg border-t-4 border-dourado hover:-translate-y-1 hover:shadow-xl transition focus:outline-none focus:ring-4 focus:ring-dourado/50"
          >
            <a.icone className="w-8 h-8 text-dourado mb-3" aria-hidden />
            <span className="block font-serif text-xl text-navy mb-1">{a.titulo}</span>
            <span className="block text-sm text-gray-600">{a.texto}</span>
          </button>
        ))}
      </div>
      <p className="text-white/50 text-xs mt-12">Desenvolvido pelo Instituto THEYE</p>
    </main>
  )
}
