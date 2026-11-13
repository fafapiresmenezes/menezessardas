import { useState } from 'react'
import Layout from '@/components/Layout'
import { EIXOS, PRODUTOS, porEixo, CADERNO_EM, type Eixo } from '@/data/produtos'

/**
 * O caderno de produtos do Instituto por dentro: preço médio, entregas, chancela sugerida.
 *
 * Pedido de M em 13/11/2026 21:35: usar "aquele cardápio que a gente fez" (o caderno comercial de
 * 12/11/2026, 21 produtos em 11 eixos) na plataforma. A vitrine da porta mostra o que existe; esta
 * tela, que só abre depois da senha, mostra o preço.
 *
 * Preço aqui é o PREÇO MÉDIO de referência do caderno, não proposta fechada: quem fecha preço é M.
 */
export default function CadernoDeProdutosPage() {
  const [eixo, setEixo] = useState<Eixo | 'todos'>('todos')
  const lista = eixo === 'todos' ? PRODUTOS : porEixo(eixo)
  const ROTULO: Record<Eixo, string> = {
    'lgpd': 'Proteção de dados',
    'regulacao-financeira': 'Regulação financeira',
    'compliance': 'Integridade e compliance',
    'inteligencia-artificial': 'Inteligência artificial',
    'ensino-doutrina': 'Ensino e doutrina',
    'legislativo': 'Legislativo',
    'metodos-adequados': 'Mediação e arbitragem',
    'clima-esg': 'Clima e ESG',
    'litigancia-estrategica': 'Litigância estratégica',
    'ciberseguranca': 'Cibersegurança',
    'quantica': 'Pós-quântica',
  }
  return (
    <Layout title="Caderno de produtos">
      <div className="max-w-5xl space-y-6">
        <p className="text-sm text-grafite" data-testid="aviso-preco">
          São {PRODUTOS.length} produtos em {EIXOS.length} eixos, do caderno comercial de {CADERNO_EM}.
          O valor de cada linha é <strong>preço médio de referência</strong>, para orientar a conversa:
          proposta fechada sai com escopo, chancela e prazo acertados caso a caso. Preço não aparece
          na porta de entrada do site, só aqui dentro.
        </p>

        <div className="flex flex-wrap gap-2" data-testid="filtro-eixo">
          <button
            onClick={() => setEixo('todos')}
            title="Mostrar os produtos de todos os eixos"
            className={`px-3 py-1 text-xs border ${eixo === 'todos' ? 'bg-navy text-white' : 'border-grafite-claro'}`}
          >
            Todos ({PRODUTOS.length})
          </button>
          {EIXOS.map(e => (
            <button
              key={e}
              onClick={() => setEixo(e)}
              title={`Mostrar só os produtos do eixo ${ROTULO[e]}`}
              data-testid={`filtro-${e}`}
              className={`px-3 py-1 text-xs border ${eixo === e ? 'bg-navy text-white' : 'border-grafite-claro'}`}
            >
              {ROTULO[e]} ({porEixo(e).length})
            </button>
          ))}
        </div>

        <ul className="space-y-4" data-testid="caderno">
          {lista.map(p => (
            <li key={p.numero} className="border border-grafite-claro p-4" data-testid={`caderno-produto-${p.numero}`}>
              <div className="flex justify-between gap-3 items-start flex-wrap">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-grafite">
                    {String(p.numero).padStart(2, '0')} · {ROTULO[p.eixo]}
                  </div>
                  <h2 className="font-serif text-lg">{p.titulo}</h2>
                </div>
                <div className="text-right">
                  <div className="font-serif text-lg tabular-nums">{p.preco}</div>
                  <div className="text-xs text-grafite">{p.prazo}</div>
                </div>
              </div>
              <p className="text-sm mt-2">{p.oQueE}</p>
              <p className="text-xs text-grafite mt-2"><strong>Para quem:</strong> {p.paraQuem}</p>
              <h3 className="text-xs uppercase tracking-wider text-grafite mt-3">Entregas</h3>
              <ul className="text-sm list-disc pl-5">
                {p.entregas.map(e => <li key={e}>{e}</li>)}
              </ul>
              {p.chancela && (
                <p className="text-xs text-grafite mt-2"><strong>Chancela sugerida:</strong> {p.chancela}</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  )
}
