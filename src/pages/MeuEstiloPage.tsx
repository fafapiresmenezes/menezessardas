import Layout from '@/components/Layout'
import EstiloEscrita from '@/components/EstiloEscrita'

/** Atalho do menu simples: cada advogado sobe as próprias peças e o robô escreve os rascunhos no jeito dele. */
export default function MeuEstiloPage() {
  return (
    <Layout title="Meu jeito de escrever">
      <p className="max-w-2xl text-grafite mb-4">
        Envie de 3 a 10 peças suas (Word, PDF ou texto). As peças automáticas dos seus processos passam a sair no seu jeito de escrever,
        variando a formatação a cada uma. Elas sempre chegam como rascunho para você revisar e assinar.
      </p>
      <EstiloEscrita />
    </Layout>
  )
}
