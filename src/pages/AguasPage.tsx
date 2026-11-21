import Layout from '@/components/Layout'
import CasaAguas from '@/components/aguas/CasaAguas'

/**
 * Casa de Águas: a porta da frente de Águas dentro da plataforma (19/11/2026).
 * O conteúdo vive em CasaAguas, partilhado com a aba "Águas" de /engenharia.
 */
export default function AguasPage() {
  return (
    <Layout title="Águas">
      <CasaAguas />
    </Layout>
  )
}
