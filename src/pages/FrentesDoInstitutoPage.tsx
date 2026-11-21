/**
 * V5 · Dentro da plataforma, um lugar com todas as frentes do Instituto.
 *
 * Pedido de M em 13/11/2026: depois da senha, a pessoa cai na parte jurídica e não acha as outras
 * frentes. Esta tela traz os mesmos 12 quadradinhos da porta, agora abrindo direto no segmento,
 * sem passar pela senha de novo (quem está aqui já entrou).
 *
 * Quem é de escritório cliente NÃO vê este menu nem este caminho: a lista do Instituto é trancada
 * por `nivel: 'instituto'` em `src/components/menuTelas.ts` e, no banco, pelo papel do usuário.
 * Esta tela é só a prateleira; a regra de quem vê o quê continua onde sempre esteve.
 */
import { Link } from 'react-router-dom'
import { VERTENTES } from '@/data/vertentes'
import { useTexto, type Chave } from '@/lib/i18n'
import ProvaDaPorta from '@/components/ProvaDaPorta'
import Marca from '@/components/Marca'

const ROTULO_ESTADO: Record<string, string> = {
  'no-ar': 'No ar',
  'em-teste': 'Em teste',
  'em-desenvolvimento': 'Em desenvolvimento',
  'em-estudo': 'Em estudo',
}

export default function FrentesDoInstitutoPage() {
  const t = useTexto()
  return (
    <div className="min-h-screen bg-[#0B0B0C] text-neutral-100 pb-24">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-10 flex items-center justify-between">
          <Marca tamanho="pequena" tipo="instituto" />
          <Link
            to="/inicio"
            className="text-sm text-neutral-300 underline underline-offset-4 hover:text-neutral-100"
            title="Voltar para o Início da plataforma jurídica"
          >
            ← Início
          </Link>
        </div>

        <h1 className="text-3xl font-serif text-white mt-2 mb-3">Frentes do Instituto</h1>
        <p className="text-base text-neutral-300 max-w-2xl mb-10">
          Cada quadradinho abre a frente direto. Você já está dentro: não pede senha de novo.
        </p>

        {/* Pedido de M, 19/11/2026: o Instituto é um quadrado próprio, uma plataforma como a do direito,
            e não uma parte da plataforma jurídica. Só a administração do Instituto chega a esta tela. */}
        <Link
          to="/instituto"
          data-testid="quadrado-plataforma-instituto"
          title="Abre a Plataforma do Instituto: administração, caderno de produtos, royalties e medições, com menu próprio"
          className="group block bg-neutral-100 text-neutral-900 border border-neutral-100 hover:bg-white rounded-sm p-6 mb-6 no-underline transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-600">Só o Instituto</span>
            <span aria-hidden="true" className="text-neutral-500 group-hover:text-neutral-900">→</span>
          </div>
          <h2 className="text-xl font-serif mt-1 mb-2">Plataforma do Instituto</h2>
          <p className="text-sm text-neutral-700 leading-relaxed max-w-2xl">
            A casa do Instituto, separada da plataforma do direito: administração, caderno de produtos, enquetes, soluções, mapa de receita, royalties e medições. O escritório cliente não vê este quadrado nem o que está dentro dele.
          </p>
        </Link>

        <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" data-testid="frentes-instituto-grid">
          {VERTENTES.map(v => (
            <li key={v.id}>
              <Link
                to={v.rota}
                className="group block bg-neutral-950 border border-neutral-700 hover:border-neutral-400 rounded-sm p-6 no-underline transition"
                data-testid={`frente-${v.id}`}
                title={`Abre ${t(`vertente.${v.id}.nome` as Chave)} — ${ROTULO_ESTADO[v.estado]}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-400">{ROTULO_ESTADO[v.estado]}</span>
                  <span aria-hidden="true" className="text-neutral-500 group-hover:text-neutral-200">→</span>
                </div>
                <h2 className="text-lg font-serif text-white mt-1 mb-2">{t(`vertente.${v.id}.nome` as Chave)}</h2>
                <p className="text-sm text-neutral-300 leading-relaxed">{t(`vertente.${v.id}.resumo` as Chave)}</p>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-16 border-t border-neutral-800 pt-10">
          <ProvaDaPorta />
        </div>

        <p className="text-xs text-neutral-500 mt-10">
          Instituto THEYE · CNPJ 70.134.451/0001-05. A lista é a mesma da porta de fora: aqui, cada
          quadradinho leva direto para a frente, porque você já entrou.
        </p>
      </div>
    </div>
  )
}
