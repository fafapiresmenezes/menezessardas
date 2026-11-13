import { useNavigate, Link } from 'react-router-dom'
import { IDIOMAS, type Idioma } from '@/lib/idioma'
import { trocarIdioma, useTexto, textoEm, chaveIdioma } from '@/lib/i18n'
import Marca from '@/components/Marca'

// Tela anterior ao login (pedido de M, 13/11/2026): o visitante escolhe o idioma e entra nele.
// A escolha vale de verdade: a tela de entrada, a criação de conta e a recuperação de senha
// passam a falar a língua escolhida (src/lib/i18n.ts), e dá para trocar lá mesmo.
export default function BoasVindasPage() {
  const navigate = useNavigate()
  const t = useTexto()
  const escolher = (codigo: Idioma) => {
    trocarIdioma(codigo)
    navigate('/login')
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4 py-10">
      <div className="w-full max-w-xl text-center">
        <div className="flex justify-center mb-8"><Marca /></div>
        <h1 className="text-2xl font-serif mb-2">{t('boasVindas.instituto')}</h1>
        {/* O convite aparece nas quatro línguas: quem chega lê na sua antes de escolher. */}
        <p className="text-sm text-white/70 mb-8">
          {IDIOMAS.map(id => textoEm(id.codigo, 'boasVindas.titulo')).join(' · ')}
        </p>
        <div className="grid grid-cols-2 gap-4" data-testid="escolha-idioma" aria-label={t('boasVindas.lista')}>
          {IDIOMAS.map(id => (
            <button
              key={id.codigo}
              onClick={() => escolher(id.codigo)}
              title={`${textoEm(id.codigo, 'boasVindas.continuarEm')} ${textoEm(id.codigo, chaveIdioma(id.codigo))}`}
              data-testid={`idioma-${id.codigo}`}
              className="min-h-[72px] border border-white/30 hover:border-white hover:bg-white hover:text-black transition px-5 py-4 uppercase tracking-wider text-sm"
            >
              <div className="text-lg font-serif normal-case tracking-normal">{id.nativo}</div>
              <div className="text-xs text-white/60 mt-1 normal-case">{t(chaveIdioma(id.codigo))}</div>
            </button>
          ))}
        </div>
        <p className="text-xs text-white/40 mt-8">{t('boasVindas.dica')}</p>
      </div>
      <Link
        to="/stokasticos"
        aria-label="Stokasticos — escola de magia do caos dedicada a Peter J. Carroll"
        title="Stokasticos — escola de magia do caos dedicada a Peter J. Carroll"
        className="fixed right-2 bottom-2 text-white/10 hover:text-white/70 transition text-[11px] tracking-widest font-serif no-underline select-none"
      >
        ☉ → ∞ +
      </Link>
    </div>
  )
}
