import { Link } from 'react-router-dom'
import Marca from '@/components/Marca'
import {
  PLANOS, USOS, NAO_FAZ, RECARGAS, FONTE_PRECO, CONSULTADO_EM, ACRESCIMO, precoFinalUSD,
} from '@/data/cotas-quanticas'

/**
 * Passo D6: revenda de cotas de computação quântica da IBM, com 30% de acréscimo.
 *
 * Esta tela é de leitura, aberta, e não vende nada por aqui: quem quiser uma cota fala com o
 * Instituto. Ela existe para que ninguém compre sem entender o que está comprando, e por isso
 * carrega, lado a lado, três coisas que normalmente não aparecem juntas: o preço da IBM com a
 * data em que foi lido, o nosso preço, e a lista do que a máquina quântica de hoje NÃO faz
 * melhor que um computador comum.
 */
const dinheiro = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function CotasQuanticasPage() {
  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-center mb-10"><Marca /></div>
        <p className="text-xs uppercase tracking-[0.2em] text-white/40">THEYE Institute</p>
        <h1 className="text-3xl font-serif mt-2 mb-4">Cotas e recargas</h1>

        <p className="text-base text-white/80">
          Tudo o que a plataforma consome de fora funciona por recarga: você põe crédito, usa, e vê
          no extrato quanto foi. Esta página explica, uma por uma, para que serve cada recarga, o
          que acontece quando ela acaba, e quanto custa. <strong>Todas levam o mesmo acréscimo de
          {Math.round(ACRESCIMO * 100)}% sobre o custo do fornecedor</strong>, que paga a operação,
          o acompanhamento e o suporte. O custo do fornecedor e o acréscimo aparecem em linhas
          separadas no extrato: nada vem embutido.
        </p>

        <h2 className="text-xl font-serif mt-10 mb-3">Todas as recargas, uma a uma</h2>
        <div className="space-y-4">
          {RECARGAS.map(r => (
            <div key={r.id} className="border border-white/15 p-4">
              <div className="flex justify-between gap-4 items-baseline flex-wrap">
                <h3 className="font-medium">{r.nome}</h3>
                <span className="text-xs text-white/50">fornecedor: {r.fornecedor}</span>
              </div>
              <p className="text-sm text-white/80 mt-2">{r.paraQueServe}</p>
              <p className="text-sm text-white/60 mt-2">
                <strong className="text-white/70">Se acabar:</strong> {r.seAcabar}
              </p>
              <p className="text-sm text-white/60 mt-1">
                <strong className="text-white/70">Medida:</strong> {r.comoEMedido}
              </p>
              <p className="text-sm text-white/60 mt-1">
                <strong className="text-white/70">Preço:</strong>{' '}
                {r.custoConhecido
                  ? `custo do fornecedor (${r.custoConhecido}) mais ${Math.round(ACRESCIMO * 100)}%.`
                  : `custo do fornecedor no mês mais ${Math.round(ACRESCIMO * 100)}%. O valor por unidade muda com o fornecedor, então ele sai no extrato do mês em vez de virar um número fixo aqui, que envelheceria sem ninguém notar.`}
              </p>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-serif mt-12 mb-3">Computação quântica da IBM</h2>
        <p className="text-base text-white/80">
          Esta é a única recarga em que o preço do fornecedor é público, então ela tem tabela. Você
          compra minutos, roda o seu problema na máquina de verdade e recebe o resultado junto com o
          mesmo problema rodado num computador comum, para poder comparar. Quem opera é o Instituto:
          você não precisa de conta na IBM nem saber programar o circuito.
        </p>

        <h2 className="text-xl font-serif mt-10 mb-3">Quanto custa</h2>
        <p className="text-sm text-white/60 mb-4">
          Preços da IBM lidos em {CONSULTADO_EM} em{' '}
          <a className="underline" href={FONTE_PRECO} target="_blank" rel="noreferrer" title="Abre a página de preços da IBM, em inglês, numa aba nova. É de lá que saem os valores desta tabela.">ibm.com/quantum/pricing</a>.
          O nosso preço é o da IBM mais {Math.round(ACRESCIMO * 100)}%, o mesmo acréscimo de todas
          as recargas. Os valores são em dólar, como a IBM
          publica; a conversão para real é feita na fatura, pelo câmbio do dia.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-white/15">
            <thead className="bg-white/5 text-white/70">
              <tr>
                <th className="text-left p-2 border-b border-white/15">Plano</th>
                <th className="text-left p-2 border-b border-white/15">Como a IBM cobra</th>
                <th className="text-right p-2 border-b border-white/15">IBM, por minuto</th>
                <th className="text-right p-2 border-b border-white/15">Nosso preço, por minuto</th>
                <th className="text-left p-2 border-b border-white/15">Mínimo</th>
              </tr>
            </thead>
            <tbody>
              {PLANOS.map(p => (
                <tr key={p.id} className="align-top">
                  <td className="p-2 border-b border-white/10 font-medium">{p.nome}</td>
                  <td className="p-2 border-b border-white/10 text-white/70">{p.comoCobra}</td>
                  <td className="p-2 border-b border-white/10 text-right">
                    {p.custoMinutoUSD === null ? '—' : `US$ ${dinheiro(p.custoMinutoUSD)}`}
                  </td>
                  <td className="p-2 border-b border-white/10 text-right">
                    {p.custoMinutoUSD === null ? 'sem custo' : `US$ ${dinheiro(precoFinalUSD(p.custoMinutoUSD))}`}
                  </td>
                  <td className="p-2 border-b border-white/10 text-white/70">{p.minimo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-white/60">
          {PLANOS.map(p => <li key={p.id}><strong className="text-white/80">{p.nome}:</strong> {p.paraQueServe}</li>)}
        </ul>
        <p className="text-sm text-white/60 mt-4">
          A IBM diz &quot;a partir de&quot; nesses valores, então um processador mais novo pode custar
          mais. O orçamento que o Instituto manda sempre traz o preço do dia e o processador que vai
          ser usado, e o consumo é medido minuto a minuto, com corte automático quando a cota acaba:
          não existe conta surpresa.
        </p>

        <h2 className="text-xl font-serif mt-10 mb-3">Para que serve uma cota quântica</h2>
        <div className="space-y-4">
          {USOS.map(u => (
            <div key={u.titulo} className="border border-white/15 p-4">
              <div className="flex justify-between gap-4 items-baseline">
                <h3 className="font-medium">{u.titulo}</h3>
                <span className="text-xs text-white/50 whitespace-nowrap">{u.tamanho}</span>
              </div>
              <p className="text-sm text-white/70 mt-2">{u.paraQue}</p>
              <p className="text-sm text-white/50 mt-1">Exemplo: {u.exemplo}</p>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-serif mt-10 mb-3">O que a máquina quântica de hoje não faz</h2>
        <p className="text-sm text-white/60 mb-3">
          Esta lista está aqui de propósito. Quem vende cota prometendo o que a máquina não entrega
          perde o cliente na primeira fatura.
        </p>
        <ul className="space-y-2 text-sm text-white/80">
          {NAO_FAZ.map(t => <li key={t} className="border-l-2 border-white/20 pl-3">{t}</li>)}
        </ul>

        <p className="text-sm text-white/60 mt-10">
          Quer uma cota? Fale com o Instituto pela página de{' '}
          <Link className="underline" to="/portais" title="Abre a lista das frentes do Instituto, com o contato de cada uma.">frentes do Instituto</Link>. Antes do primeiro
          contrato de revenda o Instituto confirma com a IBM o que a licença permite, quem responde
          pelo resultado e o que acontece se a IBM mudar o preço no meio do ano.
        </p>
      </div>
    </div>
  )
}
