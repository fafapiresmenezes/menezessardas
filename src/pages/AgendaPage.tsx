import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import SeloSituacao from '@/components/SeloSituacao'
import { useAlertas } from '@/hooks/useAlertas'
import { baixarICS } from '@/lib/ics'
import { formatarData, situacaoPorPrazo, textoPrazo } from '@/lib/datas'
import { CalendarDays, ChevronLeft, ChevronRight, Download, Mail } from 'lucide-react'

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

const corPonto: Record<string, string> = {
  vencido: 'bg-critico',
  critico: 'bg-critico',
  atencao: 'bg-atencao',
  regular: 'bg-regular',
  sem_prazo: 'bg-grafite-claro',
}

export default function AgendaPage() {
  const { alertas, loading } = useAlertas()
  const navigate = useNavigate()
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth())

  // Agrupa os compromissos por dia (chave aaaa-mm-dd).
  const porDia = useMemo(() => {
    const mapa = new Map<string, typeof alertas>()
    alertas.forEach(a => {
      const lista = mapa.get(a.dataEvento) ?? []
      lista.push(a)
      mapa.set(a.dataEvento, lista)
    })
    return mapa
  }, [alertas])

  if (loading) {
    return (
      <Layout title="Agenda">
        <p className="text-grafite-claro">Carregando agenda…</p>
      </Layout>
    )
  }

  const primeiro = new Date(ano, mes, 1)
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const deslocamento = primeiro.getDay()
  const celulas: (number | null)[] = [
    ...Array(deslocamento).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ]
  const iso = (dia: number) => `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`

  const mudarMes = (delta: number) => {
    const d = new Date(ano, mes + delta, 1)
    setAno(d.getFullYear())
    setMes(d.getMonth())
  }

  const doMes = alertas
    .filter(a => {
      const d = new Date(a.dataEvento + 'T00:00:00')
      return d.getFullYear() === ano && d.getMonth() === mes
    })
    .sort((a, b) => a.diasRestantes - b.diasRestantes)

  // Lembrete por e-mail: abre o cliente de e-mail com os próximos compromissos.
  const proximos = [...alertas].filter(a => a.diasRestantes >= 0).sort((a, b) => a.diasRestantes - b.diasRestantes).slice(0, 15)
  const corpoEmail = proximos
    .map(a => `• ${formatarData(a.dataEvento)} — ${a.titulo} (${a.imovel})`)
    .join('\n')
  const mailto = `mailto:?subject=${encodeURIComponent('Próximos compromissos contratuais')}&body=${encodeURIComponent('Próximos compromissos:\n\n' + corpoEmail)}`

  return (
    <Layout title="Agenda">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => mudarMes(-1)} className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-sm hover:bg-white" aria-label="Mês anterior">
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <h2 className="font-serif text-2xl text-navy capitalize min-w-[11rem] text-center">
              {MESES[mes]} de {ano}
            </h2>
            <button onClick={() => mudarMes(1)} className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-sm hover:bg-white" aria-label="Próximo mês">
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={mailto}
              className="inline-flex items-center gap-2 border border-navy/20 text-navy px-4 py-2 rounded-sm text-sm hover:bg-white"
            >
              <Mail size={16} aria-hidden="true" /> Enviar por e-mail
            </a>
            <button
              onClick={() => baixarICS(alertas)}
              className="inline-flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-sm text-sm"
            >
              <Download size={16} aria-hidden="true" /> Exportar para o calendário
            </button>
          </div>
        </div>

        <div className="bg-white shadow-sm p-4">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="text-center text-xs uppercase tracking-wider text-grafite-claro py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {celulas.map((dia, i) => {
              if (dia === null) return <div key={`v-${i}`} className="min-h-[72px]" />
              const eventos = porDia.get(iso(dia)) ?? []
              const ehHoje = ano === hoje.getFullYear() && mes === hoje.getMonth() && dia === hoje.getDate()
              return (
                <div
                  key={dia}
                  className={`min-h-[72px] border p-1.5 ${ehHoje ? 'border-dourado bg-pergaminho' : 'border-navy/5'}`}
                >
                  <span className={`text-xs ${ehHoje ? 'font-bold text-dourado-escuro' : 'text-grafite-claro'}`}>
                    {dia}
                  </span>
                  <div className="mt-1 space-y-1">
                    {eventos.slice(0, 3).map(e => {
                      const sit = situacaoPorPrazo(e.diasRestantes)
                      return (
                        <button
                          key={e.id}
                          onClick={() => navigate(`/contrato/${e.imovelId}`)}
                          className="w-full flex items-center gap-1 text-left min-h-[24px] py-0.5 rounded-sm hover:bg-pergaminho"
                          title={`${e.titulo} — ${e.imovel}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${corPonto[sit]}`} aria-hidden="true" />
                          <span className="text-[11px] text-grafite truncate">{e.titulo}</span>
                        </button>
                      )
                    })}
                    {eventos.length > 3 && (
                      <span className="text-[11px] text-grafite-claro">+{eventos.length - 3}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <section className="bg-white shadow-sm" aria-labelledby="titulo-mes">
          <h3 id="titulo-mes" className="text-lg px-5 pt-5 flex items-center gap-2">
            <CalendarDays size={18} className="text-dourado" aria-hidden="true" />
            Compromissos de {MESES[mes]}
          </h3>
          {doMes.length === 0 ? (
            <p className="text-sm text-grafite-claro p-5">Nenhum compromisso neste mês.</p>
          ) : (
            <ul className="divide-y divide-navy/10 mt-3">
              {doMes.map(a => (
                <li key={a.id}>
                  <button
                    onClick={() => navigate(`/contrato/${a.imovelId}`)}
                    className="w-full text-left px-5 py-3 hover:bg-pergaminho flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-navy">{a.titulo}</p>
                      <p className="text-sm text-grafite-claro truncate">{a.imovel}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <SeloSituacao situacao={situacaoPorPrazo(a.diasRestantes)} texto={textoPrazo(a.diasRestantes)} />
                      <p className="text-xs text-grafite-claro mt-1">{formatarData(a.dataEvento)}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Layout>
  )
}
