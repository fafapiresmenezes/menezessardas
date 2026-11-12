// Theye.club — Soluções jurídicas: a vertente comercial que leva a plataforma a outros escritórios.
import Layout from '@/components/Layout'
import { Link } from 'react-router-dom'
import { Building2, Rocket, LineChart } from 'lucide-react'

const BLOCOS = [
  {
    icon: Building2,
    titulo: 'Para escritórios de advocacia',
    texto: 'A mesma plataforma que o Instituto usa, entregue pronta para outro escritório: carteira de processos, prazos automáticos, peças com revisão, agenda e portal do cliente.',
  },
  {
    icon: Rocket,
    titulo: 'Implantação e mensalidade',
    texto: 'Instalação única com a base de dados do escritório migrada do sistema antigo, e depois uma mensalidade por usuário. O custo de inteligência artificial é medido por pessoa e aparece na tela de Consumo.',
  },
  {
    icon: LineChart,
    titulo: 'Acompanhamento',
    texto: 'Cada escritório parceiro entra como um escritório próprio, com seus dados separados dos demais. A sede acompanha adesão, consumo e resultados pela administração do Instituto.',
  },
]

export default function SolucoesPage() {
  return (
    <Layout title="Soluções jurídicas">
      <p className="text-sm text-grafite-claro mb-6 max-w-3xl">
        <strong>Soluções para escritórios jurídicos</strong> é a vertente que leva o Theye.club a
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
      <p className="text-xs text-grafite-claro mt-6 max-w-3xl">
        A proposta comercial e o contrato de cada escritório são tratados fora da plataforma. Para a
        parte de administração e parceiros, veja{' '}
        <Link to="/instituto" className="underline decoration-dourado">THEYE Institute</Link>.
      </p>
    </Layout>
  )
}
