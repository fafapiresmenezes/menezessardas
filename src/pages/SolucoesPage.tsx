// Theye.club — Soluções jurídicas: a oferta comercial que leva a plataforma a outros escritórios.
// Passo 18 (ajustado por M em 12/11/2026): sem preço público — o interessado se inscreve por e-mail,
// pede o preço, e o preço vai numa proposta feita sob consultoria.
import { useState } from 'react'
import Layout from '@/components/Layout'
import { Link } from 'react-router-dom'
import { Building2, Rocket, LineChart, Check, Mail, PlayCircle, MousePointerClick } from 'lucide-react'

/** Vídeo-tour gravado da plataforma (passo 19) e ambiente de teste limitado, com dados fictícios. */
export const VIDEO_TOUR = 'https://cdn.jsdelivr.net/gh/fafapiresmenezes/menezessardas@fa9195bc20b6db7d3dd5b494b6be57840d1f88f6/tour-theye.mp4'
export const AMBIENTE_TESTE = '/demo/'

const BLOCOS = [
  {
    icon: Building2,
    titulo: 'Para escritórios de advocacia',
    texto: 'A mesma plataforma que o Instituto usa, entregue pronta para outro escritório: carteira de processos, prazos automáticos, peças com revisão, agenda e portal do cliente.',
  },
  {
    icon: Rocket,
    titulo: 'Implantação por consultoria',
    texto: 'Cada escritório é diferente. A implantação começa com uma conversa: entendemos o tamanho da equipe, o sistema atual e as necessidades, e montamos a proposta sob medida.',
  },
  {
    icon: LineChart,
    titulo: 'Acompanhamento',
    texto: 'Cada escritório parceiro entra como um escritório próprio, com seus dados separados dos demais. A sede acompanha adesão, consumo e resultados pela administração do Instituto.',
  },
]

/** E-mail comercial do Instituto que recebe os pedidos de proposta. */
export const EMAIL_COMERCIAL = 'contato@theye.club'

const INCLUI = [
  'Carteira de processos com robô de prazos (consulta o CNJ a cada 4 horas)',
  'Peças com banca de 10 redatores, rotação de estilo e tom ajustado ao julgador',
  '500 consultores especialistas com ementas acadêmicas (USP, UFMG, UnB, UFBA, Harvard, MIT)',
  'Agenda, intimações, financeiro, horas e portal do cliente',
  'Migração dos dados do sistema antigo, em qualquer formato, com desfazer',
  'Hierarquia de acesso: cada advogado vê o seu; sócios e gestor veem tudo',
  'Relatórios mensais e resumos semanais automáticos por e-mail',
  'Dados do escritório separados dos demais, com trilha de auditoria',
]

export default function SolucoesPage() {
  const [nome, setNome] = useState('')
  const [escritorio, setEscritorio] = useState('')
  const [usuarios, setUsuarios] = useState('')
  const [aberto, setAberto] = useState(false)
  const pedirProposta = () => {
    const assunto = 'Pedido de proposta — Soluções jurídicas Theye.club'
    const corpo = [
      `Nome: ${nome || '[seu nome]'}`,
      `Escritório: ${escritorio || '[nome do escritório]'}`,
      `Número de usuários: ${usuarios || '[quantas pessoas vão usar]'}`,
      '',
      'Gostaria de receber a proposta comercial da plataforma Theye.club.',
    ].join('\n')
    window.location.href = `mailto:${EMAIL_COMERCIAL}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`
    setAberto(true)
  }
  return (
    <Layout title="Soluções jurídicas">
      <p className="text-sm text-grafite-claro mb-6 max-w-3xl">
        <strong>Soluções para escritórios jurídicos</strong> é a frente que leva o Theye.club a
        outros escritórios de advocacia. É o produto comercial: o mesmo sistema do Instituto,
        oferecido como serviço para quem quer modernizar a gestão e a rotina jurídica.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl">
        {BLOCOS.map(b => (
          <div key={b.titulo} className="rounded-sm border border-navy/15 p-4 bg-white">
            <b.icon className="w-5 h-5 text-dourado mb-2" aria-hidden />
            <h3 className="font-medium text-navy mb-1">{b.titulo}</h3>
            <p className="text-sm text-grafite-claro">{b.texto}</p>
          </div>
        ))}
      </div>

      <section className="mt-8 max-w-4xl bg-white border border-navy/15 p-6" data-testid="video-tour">
        <h3 className="font-serif text-2xl text-navy inline-flex items-center gap-2"><PlayCircle className="text-dourado" size={22} aria-hidden="true" /> Veja a plataforma funcionando</h3>
        <p className="text-sm text-grafite-claro mt-1">Um minuto, tela a tela: Meu dia, prazos, processos, intimações, peças, agenda, financeiro, indicadores e o Instituto.</p>
        <video controls preload="metadata" className="mt-3 w-full border border-navy/10" title="Vídeo-tour da plataforma Theye.club, tela a tela" src={VIDEO_TOUR} />
        <div className="mt-4 border-t border-navy/10 pt-4" data-testid="ambiente-teste">
          <h4 className="font-medium text-navy inline-flex items-center gap-2"><MousePointerClick className="text-dourado" size={18} aria-hidden="true" /> Experimente você mesmo</h4>
          <p className="text-sm text-grafite-claro mt-1">Ambiente de teste com dados fictícios: navegue por todas as telas e sinta como é o dia a dia na plataforma. Nada do que você fizer lá é salvo, e os recursos de inteligência artificial ficam reservados aos assinantes.</p>
          <a href={AMBIENTE_TESTE} target="_blank" rel="noreferrer" data-testid="abrir-teste"
            title="Abre em nova aba o ambiente de teste da plataforma, com dados fictícios e sem compromisso"
            className="mt-3 inline-flex items-center gap-2 border border-navy text-navy min-h-[44px] px-5 uppercase tracking-wider text-sm">Testar agora, sem cadastro</a>
        </div>
      </section>

      <section className="mt-6 max-w-4xl bg-white border border-navy/15 p-6" data-testid="oferta-solucoes">
        <h3 className="font-serif text-2xl text-navy">Tudo o que está incluído</h3>
        <ul className="mt-3 grid gap-1 sm:grid-cols-2">
          {INCLUI.map(i => (
            <li key={i} className="flex items-start gap-2 text-sm text-grafite"><Check size={15} className="text-regular mt-0.5 shrink-0" aria-hidden="true" />{i}</li>
          ))}
        </ul>
      </section>

      <section className="mt-6 max-w-4xl bg-navy text-white p-6" data-testid="pedir-proposta">
        <h3 className="font-serif text-2xl">Peça a sua proposta</h3>
        <p className="text-sm text-white/80 mt-1 max-w-2xl">
          O preço é definido por consultoria, conforme o tamanho e as necessidades do escritório.
          Preencha os campos e envie o pedido por e-mail: a proposta chega com o valor da implantação e da mensalidade.
        </p>
        <div className="grid gap-3 sm:grid-cols-3 mt-4">
          <label className="text-xs uppercase tracking-wide">Seu nome
            <input value={nome} onChange={e => setNome(e.target.value)} title="Seu nome, para a proposta ir endereçada a você" className="mt-1 w-full min-h-[44px] px-3 text-sm text-grafite bg-white border border-white/20" /></label>
          <label className="text-xs uppercase tracking-wide">Escritório
            <input value={escritorio} onChange={e => setEscritorio(e.target.value)} title="Nome do escritório de advocacia interessado" className="mt-1 w-full min-h-[44px] px-3 text-sm text-grafite bg-white border border-white/20" /></label>
          <label className="text-xs uppercase tracking-wide">Nº de usuários
            <input value={usuarios} onChange={e => setUsuarios(e.target.value)} inputMode="numeric" title="Quantas pessoas do escritório vão usar a plataforma" className="mt-1 w-full min-h-[44px] px-3 text-sm text-grafite bg-white border border-white/20" /></label>
        </div>
        <button type="button" onClick={pedirProposta} data-testid="pedir-proposta-email"
          title="Abre o seu e-mail com o pedido de proposta já preenchido, endereçado ao Instituto"
          className="mt-4 inline-flex items-center gap-2 bg-dourado text-navy min-h-[44px] px-5 uppercase tracking-wider text-sm font-medium">
          <Mail size={16} aria-hidden="true" /> {aberto ? 'E-mail aberto — é só enviar' : 'Pedir proposta por e-mail'}
        </button>
        <p className="text-xs text-white/70 mt-3">Ou escreva direto para <a href={`mailto:${EMAIL_COMERCIAL}`} className="underline" title="Abre o seu e-mail endereçado ao Instituto">{EMAIL_COMERCIAL}</a>. A proposta é enviada por e-mail, sem compromisso.</p>
      </section>

      <p className="text-xs text-grafite-claro mt-6 max-w-3xl">
        A proposta comercial e o contrato de cada escritório são tratados fora da plataforma. Para a
        parte de administração e parceiros, veja{' '}
        <Link to="/instituto" title="Abre a tela do THEYE Institute, com a administração e os parceiros" className="underline decoration-dourado">THEYE Institute</Link>.
      </p>
    </Layout>
  )
}
