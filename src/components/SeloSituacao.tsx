import { rotuloSituacao, type Situacao } from '@/lib/datas'

const estilos: Record<Situacao, string> = {
  vencido: 'bg-criticoFundo text-critico border-critico',
  critico: 'bg-criticoFundo text-critico border-critico',
  atencao: 'bg-atencaoFundo text-atencao border-atencao',
  regular: 'bg-regularFundo text-regular border-regular',
  sem_prazo: 'bg-grafite-claro/10 text-grafite border-grafite-claro',
}

/** O rótulo acompanha a cor: a situação nunca é comunicada só por cor (WCAG 1.4.1). */
export default function SeloSituacao({ situacao, texto }: { situacao: Situacao; texto?: string }) {
  return (
    <span
      className={`inline-block px-2.5 py-1 text-xs font-medium border-l-2 rounded-sm whitespace-nowrap ${estilos[situacao]}`}
    >
      {texto ?? rotuloSituacao[situacao]}
    </span>
  )
}
