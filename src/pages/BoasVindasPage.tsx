import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { IDIOMAS, type Idioma } from '@/lib/idioma'
import { trocarIdioma, useTexto, textoEm, chaveIdioma } from '@/lib/i18n'
import { destinoSeguro, entradaPara } from '@/lib/destino'
import Marca from '@/components/Marca'
import Vertentes from '@/components/Vertentes'
import Produtos from '@/components/Produtos'
import Doacoes from '@/components/Doacoes'
import ProvaDaPorta from '@/components/ProvaDaPorta'

// Tela anterior ao login (pedido de M, 13/11/2026): o visitante escolhe o idioma e entra nele.
// A escolha vale de verdade: a tela de entrada, a criação de conta e a recuperação de senha
// passam a falar a língua escolhida (src/lib/i18n.ts), e dá para trocar lá mesmo.
//
// Revisão de 13/11/2026 22:47 (M: "cinza com letra branca, não dá para ler" e "só aparece a
// plataforma de suporte jurídico"): o título "Instituto THEYE" herdava a cor escura dos títulos
// do resto da plataforma e sumia no fundo preto; o subtítulo da marca dizia "Suporte Jurídico"
// para o Instituto inteiro; e o botão de língua, com o cursor em cima, ficava com letra apagada.
export default function BoasVindasPage() {
  const navigate = useNavigate()
  const [busca] = useSearchParams()
  const t = useTexto()
  const escolher = (codigo: Idioma) => {
    trocarIdioma(codigo)
    // Quem chegou por um quadradinho continua indo para a tela daquele quadradinho.
    const ir = busca.get('ir'); navigate(ir ? entradaPara(destinoSeguro(ir)) : '/login')
  }
  return (
    <div className="porta min-h-screen bg-black px-4 py-12 md:py-16">
      <div className="mx-auto w-full max-w-6xl text-center">
        <div className="flex justify-center mb-8"><Marca tamanho="grande" tipo="instituto" subtitulo={t('marca.instituto')} /></div>
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-neutral-300">{t('boasVindas.instituto')}</p>
        <h1 className="mt-4 text-5xl md:text-6xl font-serif leading-[1.05] max-w-4xl mx-auto">{t('porta.promessa')}</h1>
        <p className="text-lg text-neutral-100 mt-6 max-w-3xl mx-auto leading-relaxed">{t('porta.chamada')}</p>
        <p className="text-base text-neutral-300 mt-2 max-w-3xl mx-auto">{t('porta.apoio')}</p>

        {/* O convite aparece nas quatro línguas: quem chega lê na sua antes de escolher. */}
        <p className="text-base text-neutral-200 mt-10 mb-5">
          {IDIOMAS.map(id => textoEm(id.codigo, 'boasVindas.titulo')).join(' · ')}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto" data-testid="escolha-idioma" aria-label={t('boasVindas.lista')}>
          {IDIOMAS.map(id => (
            <button
              key={id.codigo}
              onClick={() => escolher(id.codigo)}
              title={`${textoEm(id.codigo, 'boasVindas.continuarEm')} ${textoEm(id.codigo, chaveIdioma(id.codigo))}`}
              data-testid={`idioma-${id.codigo}`}
              className="group min-h-[88px] border border-neutral-400 bg-neutral-950 px-5 py-4 text-[#fff] transition hover:border-[#fff] hover:bg-[#fff] hover:text-[#000]"
            >
              <span className="block text-2xl font-serif">{id.nativo}</span>
              <span className="mt-1 block text-sm text-neutral-300 group-hover:text-neutral-700">{t(chaveIdioma(id.codigo))}</span>
            </button>
          ))}
        </div>
        <p className="text-sm text-neutral-300 mt-6">{t('boasVindas.dica')}</p>
        <a
          href="#frentes"
          onClick={e => { e.preventDefault(); document.getElementById('frentes')?.scrollIntoView({ behavior: 'smooth' }) }}
          title={t('porta.verFrentesDica')}
          data-testid="porta-ver-frentes"
          className="inline-block mt-6 text-base text-[#fff] underline decoration-neutral-400 underline-offset-4 hover:decoration-[#fff]"
        >
          {t('porta.verFrentes')} <span aria-hidden="true">↓</span>
        </a>

        {/* Problema #1 do planejamento: quem não é membro não tinha como falar com o Instituto.
            Agora a porta tem um caminho de verdade, sem senha. */}
        <div className="mt-8">
          <Link
            to="/admissao"
            data-testid="porta-pedir-entrada"
            title="Deixe um pedido: uma pessoa do Instituto lê e responde"
            className="inline-block min-h-[48px] px-7 py-3 border border-[#fff] bg-[#fff] text-[#000] font-medium uppercase tracking-[0.15em] text-sm no-underline hover:bg-transparent hover:text-[#fff] transition"
          >
            Pedir entrada
          </Link>
        </div>

        {/* Ordem de quem compra (passo V13, 13/11/2026 23:04): o que é, a prova, as frentes, o
            caderno de produtos e o apoio. Às 21:35 os produtos vinham em cima; mudou com o pedido
            de pensar a página pela jornada de quem chega. */}
        <ProvaDaPorta centro />

        {/* Pedido de M (13/11/2026): todas as vertentes aparecem aqui, na língua escolhida, mesmo
            as que ainda estão em desenvolvimento. Nada abre sem senha. */}
        <Vertentes />

        <Produtos />

        <Doacoes />
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
