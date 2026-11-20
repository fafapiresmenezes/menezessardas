import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'

/**
 * Fila de aprovação das bancadas colaborativas (camada 1 do plano de 20/11/2026).
 *
 * Quem decide é só a sede: a RLS da tabela bancadas_inscritos deixa anon apenas GRAVAR, e
 * leitura/decisão passam por eh_sede() no banco — esta tela não é a tranca, é a mesa.
 * Aprovar aqui NÃO cria conta nenhuma: o acesso continua saindo só por convite do admin.
 */
interface Pedido {
  id: string
  nome_completo: string
  titulo_academico: string
  instituicao: string
  pais: string
  areas_interesse: string[]
  cv_linkedin: string | null
  email: string
  status: 'pendente' | 'aprovado' | 'recusado'
  criado_em: string
}

export default function BancadasFilaPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = async () => {
    setCarregando(true)
    const { data, error } = await supabase
      .from('bancadas_inscritos')
      .select('id, nome_completo, titulo_academico, instituicao, pais, areas_interesse, cv_linkedin, email, status, criado_em')
      .order('criado_em', { ascending: false })
    if (error) setErro('Não consegui ler a fila. A tabela pode ainda não existir no banco.')
    else setPedidos((data ?? []) as Pedido[])
    setCarregando(false)
  }

  useEffect(() => { void carregar() }, [])

  const decidir = async (id: string, status: 'aprovado' | 'recusado') => {
    const { error } = await supabase.from('bancadas_inscritos').update({ status }).eq('id', id)
    if (error) setErro('A decisão não foi gravada. Só a sede pode decidir.')
    else setPedidos(p => p.map(x => (x.id === id ? { ...x, status } : x)))
  }

  const rotulo: Record<Pedido['status'], string> = {
    pendente: 'Pendente', aprovado: 'Aprovado', recusado: 'Recusado',
  }

  return (
    <Layout title="Fila das bancadas">
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <p className="text-grafite mb-6">
        Pedidos de colaboração recebidos na página pública. Aprovar aqui não cria conta: é só o
        primeiro sim. Pendentes aparecem primeiro.
      </p>
      {erro && <p role="alert" className="mb-4 text-critico">{erro}</p>}
      {carregando ? (
        <p>Carregando…</p>
      ) : pedidos.length === 0 ? (
        <p data-testid="fila-vazia">Nenhum pedido por enquanto.</p>
      ) : (
        <ul className="space-y-4" data-testid="fila-bancadas">
          {[...pedidos].sort((a, b) => (a.status === 'pendente' ? -1 : 1) - (b.status === 'pendente' ? -1 : 1)).map(p => (
            <li key={p.id} className="border border-neutral-300 bg-white p-4">
              <div className="flex items-baseline justify-between gap-4">
                <strong>{p.nome_completo}</strong>
                <span data-testid={`status-${p.id}`}>{rotulo[p.status]}</span>
              </div>
              <p className="text-sm text-grafite mt-1">
                {p.titulo_academico} · {p.instituicao} · {p.pais}
              </p>
              <p className="text-sm text-grafite">Áreas: {p.areas_interesse.join(', ')}</p>
              <p className="text-sm text-grafite">Contato: {p.email}{p.cv_linkedin ? ` · ${p.cv_linkedin}` : ''}</p>
              {p.status === 'pendente' && (
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={() => void decidir(p.id, 'aprovado')}
                    title="Aprovar este pedido de colaboração"
                    className="bg-black px-4 py-2 text-sm text-white"
                  >
                    Aprovar
                  </button>
                  <button
                    onClick={() => void decidir(p.id, 'recusado')}
                    title="Recusar este pedido de colaboração"
                    className="border border-neutral-400 px-4 py-2 text-sm"
                  >
                    Recusar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
    </Layout>
  )
}
