// Theye Suporte Jurídico — caixa de ferramentas do dia a dia do advogado.
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import CaixaFerramentas from '@/components/CaixaFerramentas'
import { CATEGORIAS, FERRAMENTAS, type Categoria } from '@/lib/ferramentas/catalogo'

const CATS: Categoria[] = CATEGORIAS.filter(c => c !== 'Estudos para entidades')

export default function FerramentasPage() {
  const total = FERRAMENTAS.filter(f => CATS.includes(f.categoria)).length
  return (
    <Layout title="Ferramentas do dia a dia">
      <p className="text-sm text-grafite-claro mb-4 max-w-3xl">
        {total} ferramentas para a rotina do advogado: prazos, cálculos, Lei do Inquilinato, validação de documentos, redação em linguagem simples, modelos prontos, listas de verificação e gestão do tempo e do bem-estar. Cada uma é testada automaticamente. Para estudos para entidades, veja <Link to="/estudos" title="Abre a página de Estudos para entidades, com o catálogo e as ferramentas de estudos" className="underline decoration-dourado">Estudos para entidades</Link>.
      </p>
      <CaixaFerramentas categorias={CATS} />
    </Layout>
  )
}
