import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import {
  FORMAS, TIPOS, PERCENTUAL, lerVendas, lerContas, gravarConta, escolherConta,
  confirmarRecebimento, parteDoInstituto, parteDoEscritorio, podeEntregar, porQueTravado, dinheiro,
  type Conta, type Forma, type Venda, type Repasse,
} from '@/lib/royalties'

/**
 * Aba dos royalties do Instituto (pedido de M em 13/11/2026).
 *
 * Três coisas numa tela só, porque são a mesma história: em que conta o Instituto recebe, quais
 * vendas de serviço entraram, e quais entregas estão travadas esperando os 5%.
 *
 * O aviso fica no alto, visível, e é o que M pediu que não ficasse escondido em contrato.
 */
export default function RoyaltiesPage() {
  const [contas, setContas] = useState<Conta[]>([])
  const [vendas, setVendas] = useState<Venda[]>([])
  const [repasses, setRepasses] = useState<Repasse[]>([])
  const [semTabela, setSemTabela] = useState(false)
  const [forma, setForma] = useState<Forma>('pix')
  const [titular, setTitular] = useState('')
  const [destino, setDestino] = useState('')
  const [erro, setErro] = useState('')

  const carregar = async () => {
    const [c, v] = await Promise.all([lerContas(), lerVendas()])
    setContas(c.contas); setVendas(v.vendas); setRepasses(v.repasses)
    setSemTabela(c.semTabela || v.semTabela)
  }
  useEffect(() => { carregar().catch(e => setErro(String(e.message ?? e))) }, [])

  const repasseDa = (venda: Venda) => repasses.find(r => r.venda_id === venda.id) ?? null
  const pedido = FORMAS.find(f => f.id === forma)!

  const salvar = async () => {
    setErro('')
    if (!titular.trim() || !destino.trim()) { setErro('Preencha o titular e o destino antes de salvar.'); return }
    try {
      await gravarConta({ titular: titular.trim(), forma, destino: destino.trim(), ativa: contas.length === 0 })
      setTitular(''); setDestino(''); await carregar()
    } catch (e) { setErro(String((e as Error).message)) }
  }

  return (
    <Layout title="Royalties">
      <div className="p-6 max-w-4xl">

      <div className="border border-grafite/30 p-4 mb-6 text-sm" data-testid="aviso-royalties">
        <p>
          <strong>Aviso.</strong> Toda venda feita pela plataforma que não seja trabalho de
          processo — estudo, consultoria, laudo, curso, dado, pesquisa — paga{' '}
          <strong>{Math.round(PERCENTUAL * 100)}% ao Instituto</strong>. A divisão é feita no mesmo
          instante em que a venda é registrada, o valor passa pelo Instituto, e{' '}
          <strong>a entrega não é liberada enquanto a parte do Instituto não estiver confirmada na
          conta</strong>, inclusive quando o cliente paga em dinheiro. Contrato e trabalho de
          processo não pagam nada.
        </p>
        <p className="mt-2 text-grafite-claro">
          O que o sistema faz sozinho: calcula, separa, cobra, trava a entrega e guarda a prova. A
          transferência em si ainda é confirmada por uma pessoa, porque nenhum provedor de pagamento
          está conectado à plataforma. Enquanto não estiver, dizer que o dinheiro se move sozinho
          seria falso.
        </p>
      </div>

      {semTabela && (
        <p className="text-sm text-grafite-claro mb-6" data-testid="royalties-sem-banco">
          As tabelas desta aba ainda não existem no banco: falta aplicar a migração 132. A tela já
          funciona, e os números aparecem assim que ela for aplicada.
        </p>
      )}
      {erro && <p className="text-sm text-vermelho mb-4">{erro}</p>}

      <h2 className="text-lg font-serif mt-8 mb-2">Em que conta o Instituto recebe</h2>
      <ul className="space-y-2 mb-4">
        {contas.map(c => (
          <li key={c.id} className="flex items-center gap-3 text-sm">
            <button
              type="button"
              title={c.ativa ? 'Esta é a conta que está recebendo hoje.' : 'Passa a receber nesta conta. A anterior deixa de receber na hora.'}
              onClick={() => escolherConta(c.id).then(carregar).catch(e => setErro(String(e.message)))}
              className={`border px-3 py-1 ${c.ativa ? 'border-white bg-white/10' : 'border-grafite/40'}`}
            >
              {c.ativa ? 'Recebendo aqui' : 'Receber aqui'}
            </button>
            <span>{FORMAS.find(f => f.id === c.forma)?.nome}: {c.destino} ({c.titular})</span>
          </li>
        ))}
        {!contas.length && <li className="text-sm text-grafite-claro">Nenhuma conta cadastrada ainda.</li>}
      </ul>

      <div className="border border-grafite/30 p-4 space-y-3 text-sm">
        <div>
          <label htmlFor="royalty-forma" className="block mb-1">Forma de recebimento</label>
          <select
            id="royalty-forma" value={forma}
            title="Como o Instituto quer receber esta parte: Pix, bitcoin ou transferência bancária."
            onChange={e => setForma(e.target.value as Forma)}
            className="bg-transparent border border-grafite/40 p-2 w-full"
          >
            {FORMAS.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="royalty-titular" className="block mb-1">Titular</label>
          <input
            id="royalty-titular" value={titular} onChange={e => setTitular(e.target.value)}
            title="Nome de quem é dono da conta. Aparece no comprovante."
            className="bg-transparent border border-grafite/40 p-2 w-full"
          />
        </div>
        <div>
          <label htmlFor="royalty-destino" className="block mb-1">{pedido.oQuePedir}</label>
          <input
            id="royalty-destino" value={destino} onChange={e => setDestino(e.target.value)}
            title="Para onde o dinheiro vai. Confira caractere por caractere: transferência enviada para o destino errado não volta."
            className="bg-transparent border border-grafite/40 p-2 w-full"
          />
        </div>
        <button
          type="button" onClick={salvar}
          title="Guarda esta conta na lista acima. Ela só passa a receber quando for escolhida."
          className="border border-white px-4 py-2"
        >
          Salvar conta
        </button>
      </div>

      <h2 className="text-lg font-serif mt-10 mb-2">Vendas de serviço</h2>
      <table className="w-full text-sm border border-grafite/30">
        <thead className="bg-white/5">
          <tr>
            <th className="text-left p-2">Venda</th>
            <th className="text-right p-2">Total</th>
            <th className="text-right p-2">Escritório</th>
            <th className="text-right p-2">Instituto ({Math.round(PERCENTUAL * 100)}%)</th>
            <th className="text-left p-2">Entrega</th>
          </tr>
        </thead>
        <tbody>
          {vendas.map(v => {
            const r = repasseDa(v)
            const liberada = podeEntregar(v, r)
            return (
              <tr key={v.id}>
                <td className="p-2">
                  {v.descricao}
                  <span className="text-grafite-claro"> · {TIPOS.find(t => t.id === v.tipo)?.nome}</span>
                  {v.processual && <span className="text-grafite-claro"> · processo, não paga royalty</span>}
                </td>
                <td className="p-2 text-right">{dinheiro(v.valor_total, v.moeda)}</td>
                <td className="p-2 text-right">{dinheiro(parteDoEscritorio(v.valor_total, v.processual), v.moeda)}</td>
                <td className="p-2 text-right">{dinheiro(parteDoInstituto(v.valor_total, v.processual), v.moeda)}</td>
                <td className="p-2">
                  {liberada ? 'Liberada' : <span title={porQueTravado(v, r)}>Travada</span>}
                  {!liberada && r && (
                    <button
                      type="button"
                      title="Só o Instituto usa este botão, e só depois de ver o dinheiro na conta. É isto que libera a entrega."
                      onClick={() => confirmarRecebimento(r.id, 'confirmado na tela').then(carregar).catch(e => setErro(String(e.message)))}
                      className="ml-2 border border-grafite/40 px-2 py-0.5"
                    >
                      Confirmar que caiu
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
          {!vendas.length && <tr><td className="p-2 text-grafite-claro" colSpan={5}>Nenhuma venda de serviço registrada ainda.</td></tr>}
        </tbody>
      </table>
      </div>
    </Layout>
  )
}
