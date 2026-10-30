import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { gravarAreaAtual } from '@/lib/assistente'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { Building2, Users, Briefcase, Landmark, Factory, ShoppingCart, HeartPulse, Gavel, FileSignature, ShieldCheck } from 'lucide-react'
import AceiteTermos from '@/components/AceiteTermos'

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
  // Passo 24: lembra a última área por usuário (preferencias_usuario.area) e permite fixar uma como padrão
  // (area_fixa): com área fixa, a entrada vai direto para ela após 4 s, a não ser que a pessoa escolha outra.
  const [ultima, setUltima] = useState<string | null>(() => { try { return localStorage.getItem('lsm-area') } catch { return null } })
  const [fixa, setFixa] = useState<string | null>(null)
  const [contagem, setContagem] = useState<number | null>(null)
  const [carregado, setCarregado] = useState(false)
  useEffect(() => {
    if (!supabaseConfigurado) { setCarregado(true); return }
    supabase.from('preferencias_usuario').select('area,area_fixa').maybeSingle().then(r => {
      if (r.data?.area) setUltima(r.data.area)
      if (r.data?.area_fixa) { setFixa(r.data.area_fixa); if (!window.location.href.includes('escolher')) setContagem(4) }
      setCarregado(true)
    })
  }, [])
  useEffect(() => {
    if (contagem === null) return
    if (contagem <= 0) { const a = AREAS.find(x => x.chave === fixa); if (a) abrir(a.destino, a.chave); return }
    const t = setTimeout(() => setContagem(c => (c ?? 1) - 1), 1000); return () => clearTimeout(t)
  }, [contagem]) // eslint-disable-line react-hooks/exhaustive-deps
  const fixar = async (chave: string | null) => {
    setFixa(chave); setContagem(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('preferencias_usuario').upsert({ usuario_id: user.id, area_fixa: chave, atualizado_em: new Date().toISOString() })
  }
  const abrir = (destino: string, chave?: string) => {
    if (chave) gravarAreaAtual(chave).catch(() => undefined)
    if (destino.startsWith('?')) window.location.href = `${window.location.pathname}${destino}`
    else navigate(destino)
  }
  const areaUltima = AREAS.find(a => a.chave === ultima)
  const areaFixa = AREAS.find(a => a.chave === fixa)
  return (
    <main className="min-h-screen bg-navy flex flex-col items-center justify-center px-4 py-12">
      <AceiteTermos />
      <div className="text-center mb-10">
        <p className="font-serif text-dourado text-4xl tracking-widest">GM</p>
        <h1 className="font-serif text-white text-3xl mt-2">GMenezes Advogados Associados</h1>
        <p className="text-white/70 mt-3">Escolha a área em que vai trabalhar agora</p>
        <button type="button" data-testid="ir-meu-dia" onClick={() => navigate('/meu-dia')} className="mt-4 min-h-[44px] px-5 border border-dourado text-dourado text-sm uppercase tracking-wider">Ver meu dia: prazos, tarefas e intimações</button>
        <button type="button" data-testid="ir-consultores" onClick={() => navigate('/consultores')} className="mt-4 ml-3 min-h-[44px] px-5 bg-dourado text-navy text-sm uppercase tracking-wider">Consultores do escritório</button>
      </div>
      {carregado && (areaFixa || areaUltima) && (
        <div className="w-full max-w-6xl mb-5 bg-white/10 border border-dourado/50 text-white p-4 flex flex-wrap items-center gap-3 text-sm" data-testid="area-lembrada">
          {areaFixa ? (
            <>
              <span>Sua área padrão é <strong data-testid="area-fixa-nome">{areaFixa.titulo}</strong>{contagem !== null && contagem > 0 ? ` · entrando em ${contagem} s` : ''}.</span>
              <button type="button" onClick={() => abrir(areaFixa.destino, areaFixa.chave)} className="min-h-[44px] px-4 bg-dourado text-navy uppercase tracking-wider text-xs" data-testid="entrar-fixa">Entrar agora</button>
              <button type="button" onClick={() => setContagem(null)} className="min-h-[44px] px-4 border border-white/60 uppercase tracking-wider text-xs" data-testid="escolher-outra">Escolher outra área</button>
              <button type="button" onClick={() => fixar(null)} className="min-h-[44px] px-4 underline text-xs" data-testid="desfixar">Deixar de ser padrão</button>
            </>
          ) : areaUltima && (
            <>
              <span>Da última vez você trabalhou em <strong data-testid="area-ultima-nome">{areaUltima.titulo}</strong>.</span>
              <button type="button" onClick={() => abrir(areaUltima.destino, areaUltima.chave)} className="min-h-[44px] px-4 bg-dourado text-navy uppercase tracking-wider text-xs" data-testid="entrar-ultima">Continuar nela</button>
              <button type="button" onClick={() => fixar(areaUltima.chave)} className="min-h-[44px] px-4 border border-white/60 uppercase tracking-wider text-xs" data-testid="fixar-padrao">Fixar como padrão</button>
            </>
          )}
        </div>
      )}
      <div className="grid gap-4 w-full max-w-6xl sm:grid-cols-2 lg:grid-cols-5">
        {AREAS.map(a => (
          <button
            key={a.chave}
            data-testid={`area-${a.chave}`}
            onClick={() => abrir(a.destino, a.chave)}
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
