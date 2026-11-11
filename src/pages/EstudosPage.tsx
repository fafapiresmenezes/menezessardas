// Theye Suporte Jurídico — braço de serviços do Instituto THEYE: estudos para entidades do direito.
import Layout from '@/components/Layout'
import CaixaFerramentas from '@/components/CaixaFerramentas'
import { CATALOGO, TEMAS } from '@/lib/ferramentas/estudos'

export default function EstudosPage() {
  return (
    <Layout title="Estudos para entidades">
      <section className="bg-white p-6 shadow-sm mb-6">
        <h2 className="text-lg text-navy mb-1">THEYE Institute: estudos para entidades do direito</h2>
        <p className="text-sm text-grafite-claro max-w-3xl">Estudos sob encomenda para OAB, associações, casas legislativas, defensorias, universidades e o setor imobiliário, para fazer a legislação brasileira avançar com evidências. Use o recomendador para montar o pacote certo (estudo principal, complementares e monitoramento), o orçamento para a proposta e as ferramentas de método para executar o estudo.</p>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Temas do Instituto">
          {Object.values(TEMAS).map(t => <span key={t} className="text-xs border border-dourado/60 text-navy px-2 py-1">{t}</span>)}
        </div>
      </section>
      <section className="bg-white p-6 shadow-sm mb-6">
        <h2 className="text-lg text-navy mb-3">Catálogo de estudos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="catalogo-estudos">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-grafite-claro"><th className="py-2 pr-3">Estudo</th><th className="pr-3">O que a entidade recebe</th><th className="pr-3">Prazo</th><th>Horas</th></tr></thead>
            <tbody>
              {CATALOGO.map(e => (
                <tr key={e.id} className="border-t border-navy/10 align-top">
                  <td className="py-2 pr-3 font-medium text-navy">{e.nome}</td><td className="py-2 pr-3">{e.entregaveis}</td><td className="py-2 pr-3 whitespace-nowrap">{e.id === 'monitoramento' ? 'mensal' : `${e.semanas} sem.`}</td><td className="py-2">{e.horas}{e.id === 'monitoramento' ? '/mês' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <CaixaFerramentas categorias={['Estudos para entidades']} />
    </Layout>
  )
}
