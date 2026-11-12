// Theye.club — Soluções jurídicas: a oferta comercial que leva a plataforma a outros escritórios.
// Passo 18 do plano 0→100% (12/11/2026): página de oferta com preços e proposta pronta para contratar.
import { useState } from 'react'
import Layout from '@/components/Layout'
import { Link } from 'react-router-dom'
import { Building2, Rocket, LineChart, Check, FileDown } from 'lucide-react'
import { gerarPdfTexto, quebrar } from '@/lib/pdfSimples'

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

/** Preço padrão da oferta (aprovado por M em 10-11/11/2026). Propostas específicas podem variar. */
export const OFERTA = {
  instalacao: 'R$ 15.000,00, em até 3 parcelas',
  mensalidade: 'R$ 200,00 por usuário/mês',
  inclui: [
    'Carteira de processos com robô de prazos (consulta o CNJ a cada 4 horas)',
    'Peças com banca de 10 redatores, rotação de estilo e tom ajustado ao julgador',
    '500 consultores especialistas com ementas acadêmicas (USP, UFMG, UnB, UFBA, Harvard, MIT)',
    'Agenda, intimações, financeiro, horas e portal do cliente',
    'Migração dos dados do sistema antigo, em qualquer formato, com desfazer',
    'Hierarquia de acesso: cada advogado vê o seu; sócios e gestor veem tudo',
    'Relatórios mensais e resumos semanais automáticos por e-mail',
    'Dados do escritório separados dos demais, com trilha de auditoria',
  ],
}

const LINHAS_PROPOSTA = () => {
  const L: { texto: string; tamanho?: number; negrito?: boolean }[] = [
    { texto: 'Proposta comercial — Soluções jurídicas Theye.club', tamanho: 16, negrito: true },
    { texto: `Instituto THEYE · emitida em ${new Date().toLocaleDateString('pt-BR')} · validade: 30 dias`, tamanho: 9 }, { texto: ' ' },
    { texto: '1. O que está incluído', tamanho: 12, negrito: true },
  ]
  for (const i of OFERTA.inclui) for (const q of quebrar(`• ${i}`, 9)) L.push({ texto: q, tamanho: 9 })
  L.push({ texto: ' ' }, { texto: '2. Investimento', tamanho: 12, negrito: true },
    { texto: `Instalação (única, com migração dos dados): ${OFERTA.instalacao}.`, tamanho: 10 },
    { texto: `Mensalidade: ${OFERTA.mensalidade}, sem fidelidade.`, tamanho: 10 },
    { texto: 'O consumo de inteligência artificial de cada usuário é medido e informado todo mês.', tamanho: 9 },
    { texto: ' ' }, { texto: '3. Como contratar', tamanho: 12, negrito: true })
  for (const q of quebrar('Responda este documento ou escreva para o Instituto THEYE indicando o número de usuários e o sistema atual do escritório. A implantação leva até 15 dias a partir do aceite, com treinamento da equipe incluído. Condições específicas (número de usuários, módulos, integrações) podem ser ajustadas em proposta própria.', 9)) L.push({ texto: q, tamanho: 9 })
  L.push({ texto: ' ' }, { texto: 'Instituto THEYE · theye.club · Soluções para escritórios jurídicos', tamanho: 8 })
  return L
}

export default function SolucoesPage() {
  const [baixada, setBaixada] = useState(false)
  const propostaEmPdf = () => {
    const pdf = gerarPdfTexto('Proposta Soluções jurídicas Theye.club', LINHAS_PROPOSTA())
    const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }))
    const a = document.createElement('a'); a.href = url; a.download = 'proposta-solucoes-juridicas-theye.pdf'; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000); setBaixada(true)
  }
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

      <section className="mt-8 max-w-4xl bg-white border border-navy/15 p-6" data-testid="oferta-solucoes">
        <h3 className="font-serif text-2xl text-navy">Quanto custa</h3>
        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <div className="border border-navy/10 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-grafite-claro">Instalação (única)</p>
            <p className="text-xl text-navy mt-1 font-medium">{OFERTA.instalacao}</p>
            <p className="text-xs text-grafite-claro mt-1">Inclui a migração da base de dados do sistema antigo e o treinamento da equipe.</p>
          </div>
          <div className="border border-navy/10 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-grafite-claro">Mensalidade</p>
            <p className="text-xl text-navy mt-1 font-medium">{OFERTA.mensalidade}</p>
            <p className="text-xs text-grafite-claro mt-1">Sem fidelidade. O consumo de IA de cada usuário é medido e informado todo mês.</p>
          </div>
        </div>
        <p className="text-xs font-semibold text-navy uppercase tracking-wide mt-5">Tudo o que está incluído</p>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {OFERTA.inclui.map(i => (
            <li key={i} className="flex items-start gap-2 text-sm text-grafite"><Check size={15} className="text-regular mt-0.5 shrink-0" aria-hidden="true" />{i}</li>
          ))}
        </ul>
        <button type="button" onClick={propostaEmPdf} data-testid="proposta-pdf"
          title="Gera e baixa a proposta comercial em PDF, pronta para enviar a qualquer escritório"
          className="mt-5 inline-flex items-center gap-2 bg-navy text-white min-h-[44px] px-5 uppercase tracking-wider text-sm">
          <FileDown size={16} aria-hidden="true" /> {baixada ? 'Proposta baixada' : 'Baixar proposta em PDF'}
        </button>
        <p className="text-xs text-grafite-claro mt-3">Condições específicas (número de usuários, módulos, integrações) são ajustadas em proposta própria pela administração do Instituto.</p>
      </section>

      <p className="text-xs text-grafite-claro mt-6 max-w-3xl">
        A proposta comercial e o contrato de cada escritório são tratados fora da plataforma. Para a
        parte de administração e parceiros, veja{' '}
        <Link to="/instituto" title="Abre a tela do THEYE Institute, com a administração e os parceiros" className="underline decoration-dourado">THEYE Institute</Link>.
      </p>
    </Layout>
  )
}
