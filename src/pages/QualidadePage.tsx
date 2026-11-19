/**
 * Régua de qualidade (trilho v2, P14) — só membros do Instituto.
 * Mostra os 11 parâmetros do sistema de avaliação com o valor MEDIDO de verdade,
 * a data e o método. O que ainda não foi medido aparece como «por medir», nunca como nota inventada.
 */
import Layout from '@/components/Layout'
import SoInstituto from '@/components/SoInstituto'
import { REGUA_QUALIDADE, MEDICAO_DE, type ParametroQualidade } from '@/data/reguaQualidade'

const COR: Record<ParametroQualidade['nota'], string> = {
  verde: 'bg-emerald-600',
  amarelo: 'bg-amber-500',
  vermelho: 'bg-red-600',
  'por-medir': 'bg-neutral-400',
}
const ROTULO: Record<ParametroQualidade['nota'], string> = {
  verde: 'Na meta',
  amarelo: 'Perto da meta',
  vermelho: 'Fora da meta',
  'por-medir': 'Por medir',
}

export default function QualidadePage() {
  const medidos = REGUA_QUALIDADE.filter(p => p.valor !== null)
  return (
    <SoInstituto>
    <Layout title="Régua de qualidade">
      <div className="max-w-5xl mx-auto space-y-4">
        <p className="text-sm text-grafite-claro">
          Só para membros do Instituto. A meta da casa é nota 10 em todos os parâmetros do sistema de avaliação global.
          Cada linha mostra o que foi medido de verdade, quando e como — {medidos.length} de {REGUA_QUALIDADE.length} parâmetros já têm medição ({MEDICAO_DE.split('-').reverse().join('/')}).
          O que ainda não foi medido aparece como «por medir»: a casa não inventa nota.
        </p>
        <ul className="space-y-3" data-testid="regua-qualidade">
          {REGUA_QUALIDADE.map(p => (
            <li key={p.id} className="border border-navy/15 rounded-sm p-4" data-nota={p.nota}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-block w-3 h-3 rounded-full shrink-0 ${COR[p.nota]}`} title={ROTULO[p.nota]} aria-label={ROTULO[p.nota]} />
                <p className="font-medium text-navy">{p.nome}</p>
                <span className="text-xs text-grafite-claro">· meta: {p.meta}</span>
              </div>
              <p className="text-sm text-grafite mt-1">
                {p.valor ?? 'Por medir — ainda sem valor, de propósito.'}
                {p.dataMedicao && <span className="text-xs text-grafite-claro"> (medido em {p.dataMedicao.split('-').reverse().join('/')})</span>}
              </p>
              <p className="text-xs text-grafite-claro mt-1">
                Como se mede: {p.metodo}{' '}
                <a href={p.fonte.url} target="_blank" rel="noreferrer" className="underline text-navy whitespace-nowrap" title={`Abre a fonte do método: ${p.fonte.nome}`}>({p.fonte.nome})</a>
              </p>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-grafite-claro">
          Régua definida a partir do sistema de avaliação global do replaneamento de 19/11/2026. As medições automáticas
          (velocidade, acessibilidade, segurança dos pacotes) correm de novo a cada ronda; as que dependem de pessoas
          (facilidade de uso, revisão por heurísticas) entram quando houver quem responda.
        </p>
      </div>
    </Layout>
    </SoInstituto>
  )
}
