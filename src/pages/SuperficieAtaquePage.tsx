import { useState } from 'react'
import Layout from '@/components/Layout'
import {
  EXEMPLO, CONTROLES, achados, resumo, risco, alivio,
  type Ativo, type Gravidade,
} from '@/lib/ciber/superficie'

/**
 * Passo D3: protótipo navegável do mapa de superfície de ataque, sobre dados de exemplo.
 *
 * A tela diz, no alto e sem rodeio, que os dados são de um escritório fictício e que a plataforma
 * não varre nada de ninguém. Isso não é formalidade: um mapa de superfície de ataque que parece
 * ter saído de uma varredura real é exatamente o tipo de tela que se confunde com produto pronto.
 */
const COR: Record<Gravidade, string> = {
  alta: 'text-critico font-medium', media: 'text-atencao', baixa: 'text-grafite-claro',
}
const NOME_EXPOSICAO: Record<Ativo['exposicao'], string> = {
  internet: 'Alcançável pela internet', parceiro: 'Alcançável por parceiro', interno: 'Só dentro do escritório',
}

export default function SuperficieAtaquePage() {
  const [aberto, setAberto] = useState<string | null>(null)
  const r = resumo()
  const lista = achados()

  return (
    <Layout title="Superfície de ataque">
      <div className="p-6 max-w-4xl">
        <p className="text-sm text-grafite-claro mb-4">
          Mapa do que um invasor alcançaria, por onde, e o que já está protegido. Serve para
          <strong> defesa</strong>: cada achado vem com o que fazer.
        </p>
        <div className="border border-atencao/60 bg-atencaoFundo text-navy p-3 text-sm mb-6" data-testid="aviso-exemplo">
          <strong>Isto é um protótipo com dados de exemplo</strong>, de um escritório fictício. A
          plataforma não varre, não sonda e não testa sistema de ninguém. Quando isto virar serviço,
          o inventário vem de quem contrata, por escrito, e só sobre a casa dele.
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 text-sm">
          <div className="border border-grafite/30 p-3"><div className="text-2xl">{r.ativos}</div>coisas a proteger</div>
          <div className="border border-grafite/30 p-3"><div className="text-2xl">{r.expostos}</div>alcançáveis pela internet</div>
          <div className="border border-grafite/30 p-3"><div className="text-2xl">{r.achados}</div>achados</div>
          <div className="border border-grafite/30 p-3"><div className="text-2xl text-critico">{r.graves}</div>graves</div>
        </div>

        <h2 className="text-lg font-serif mb-2">O mapa</h2>
        <p className="text-sm text-grafite-claro mb-3">
          O risco de cada linha é a exposição multiplicada pela sensibilidade, menos o que os
          controles existentes seguram. É um modelo simples de propósito, para o escritório poder
          discordar de cada número: ele ordena a fila, não mede probabilidade de invasão.
        </p>
        <table className="w-full text-sm border border-grafite/30">
          <thead className="bg-white/5">
            <tr>
              <th className="text-left p-2">O que é</th>
              <th className="text-left p-2">De onde se alcança</th>
              <th className="text-right p-2">Risco</th>
              <th className="text-left p-2">Protegido por</th>
            </tr>
          </thead>
          <tbody>
            {[...EXEMPLO].sort((a, b) => risco(b) - risco(a)).map(a => (
              <tr key={a.id} className="align-top">
                <td className="p-2">
                  <button
                    type="button"
                    title="Mostra quem alcança este ativo e o que já está protegido"
                    onClick={() => setAberto(aberto === a.id ? null : a.id)}
                    className="underline text-left"
                  >
                    {a.nome}
                  </button>
                  <div className="text-grafite-claro">{a.o_que_guarda}</div>
                  {aberto === a.id && (
                    <ul className="mt-2 text-grafite-claro">
                      {a.alcancam.map(q => (
                        <li key={q.papel}>
                          {q.quantas} × {q.papel} · {q.segundo_fator ? 'com' : 'sem'} segundo fator ·
                          último uso há {q.ultimo_uso_dias} dias
                        </li>
                      ))}
                      <li>Controles seguram {Math.round(alivio(a.controles) * 100)}% do risco bruto.</li>
                    </ul>
                  )}
                </td>
                <td className="p-2">{NOME_EXPOSICAO[a.exposicao]}</td>
                <td className="p-2 text-right">{risco(a).toLocaleString('pt-BR')}</td>
                <td className="p-2 text-grafite-claro">
                  {a.controles.length ? a.controles.map(c => CONTROLES[c].nome).join('; ') : 'nada ainda'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="text-lg font-serif mt-10 mb-2">Achados, do mais grave ao menos</h2>
        <ul className="space-y-3 text-sm">
          {lista.map((a, i) => (
            <li key={i} className="border border-grafite/30 p-3">
              <div className="flex justify-between gap-3 flex-wrap">
                <strong>{a.o_que}</strong>
                <span className={COR[a.gravidade]}>{a.gravidade === 'media' ? 'média' : a.gravidade}</span>
              </div>
              <div className="text-grafite-claro">{a.ativo}</div>
              <p className="mt-1">{a.por_que}</p>
              <p className="mt-1"><strong>O que fazer:</strong> {a.o_que_fazer}</p>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  )
}
