/**
 * Ecrã C11 — Estudos para o governo (DEMONSTRAÇÃO, dados inventados).
 * Molde fixo: pergunta, método, contas abertas, limites, fontes. Estudo gerado por robô
 * só aparece aqui depois de aprovação humana. Predição fechada até calibração provada.
 */
import { useMemo, useState } from 'react'
import LayoutFundos from '@/components/LayoutFundos'
import VerComoFundos, { SoParaNiveis, usePessoaFundos } from '@/components/VerComoFundos'
import SaberDaMateria from '@/components/SaberDaMateria'
import { recorte } from '@/lib/visaoFundos'
import { TIPOS_ESTUDO, ESTUDOS_DEMO, FONTES_VIVAS } from '@/data/estudosGovernoDemo'

export default function EstudosGovernoPage() {
  const quem = usePessoaFundos()
  const estudos = useMemo(() => recorte(quem, ESTUDOS_DEMO), [quem])
  const [aberto, setAberto] = useState<string | null>(null)
  return (
    <LayoutFundos title="Estudos para o governo">
      <SoParaNiveis rota="/estudos-governo">
      <div className="max-w-3xl mx-auto space-y-6">
        <VerComoFundos />
        <SaberDaMateria rota="/estudos-governo" />
        <p className="text-sm text-grafite-claro">
          Demonstração com dados inventados. Aqui a casa prepara estudos para apresentar ao governo,
          num molde fixo: pergunta, método, contas abertas, limites e fontes. Um estudo preparado pelo
          robô só aparece nesta aba depois de uma pessoa o rever e aprovar.
        </p>

        <section>
          <h2 className="font-semibold text-navy mb-2">Os tipos de estudo</h2>
          <ul className="space-y-2" data-testid="tipos-estudo">
            {TIPOS_ESTUDO.map(t => (
              <li key={t.id} className="border border-navy/15 rounded-sm p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-navy">{t.nome}</span>
                  {t.fechado && (
                    <span className="text-xs bg-amber-100 text-amber-900 rounded-sm px-2 py-0.5" data-testid="tipo-fechado">
                      ainda fechado
                    </span>
                  )}
                </div>
                <p className="text-sm text-grafite mt-1">{t.paraQue}</p>
                {t.fechado && <p className="text-sm text-amber-900 mt-1">{t.fechado}</p>}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-navy mb-2">Fontes vivas: satélites e eventos públicos</h2>
          <p className="text-sm text-grafite-claro mb-2">
            Dados abertos que vão alimentar os estudos na versão real, sempre citados. Servem para observar e registar,
            nunca para prever: a predição continua fechada até calibração provada.
          </p>
          <ul className="space-y-2" data-testid="fontes-vivas">
            {FONTES_VIVAS.map(f => (
              <li key={f.id} className="border border-navy/15 rounded-sm p-3">
                <p className="font-medium text-navy">{f.nome}</p>
                <p className="text-sm text-grafite mt-1">{f.oQueDa}</p>
                <p className="text-xs text-grafite-claro mt-1">Onde entra: {f.ondeEntra}</p>
                <p className="text-xs text-grafite-claro">Licença: {f.licenca}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-navy mb-2">Estudos de exemplo</h2>
          {estudos.length === 0 && <p className="text-sm text-grafite-claro" data-testid="vazio">Nada no seu recorte.</p>}
          <ul className="space-y-2" data-testid="estudos">
            {estudos.map(e => (
              <li key={e.id} className="border border-navy/15 rounded-sm">
                <button
                  type="button"
                  onClick={() => setAberto(aberto === e.id ? null : e.id)}
                  className="w-full text-left p-3"
                  title={`Abrir ou fechar o estudo: ${e.titulo}`}
                  aria-label={`Abrir ou fechar o estudo: ${e.titulo}`}
                  aria-expanded={aberto === e.id}
                >
                  <span className="font-medium text-navy">{e.titulo}</span>
                  <span className="block text-xs text-grafite-claro mt-0.5">{e.data} · exemplo</span>
                </button>
                {aberto === e.id && (
                  <div className="px-3 pb-3 space-y-2 text-sm text-grafite">
                    <p>{e.resumo}</p>
                    {e.seccoes.map(s => (
                      <div key={s.titulo}>
                        <h3 className="font-medium text-navy">{s.titulo}</h3>
                        <p>{s.corpo}</p>
                      </div>
                    ))}
                    <div>
                      <h3 className="font-medium text-navy">Fontes</h3>
                      <ul className="list-disc pl-5">
                        {e.fontes.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
      </SoParaNiveis>
    </LayoutFundos>
  )
}
