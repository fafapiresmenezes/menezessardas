import { useState } from 'react'
import Layout from '@/components/Layout'
import { Save, User, Bell } from 'lucide-react'

const CHAVE = 'preferencias-usuario'

interface Preferencias {
  nomeCompleto: string
  email: string
  notificacoes: boolean
  alertasEmail: boolean
  diasAntecedencia: number
}

const padrao: Preferencias = {
  nomeCompleto: 'Leticia Sardas',
  email: 'leticia@sardasmenezes.adv.br',
  notificacoes: true,
  alertasEmail: true,
  diasAntecedencia: 30,
}

function carregar(): Preferencias {
  try {
    const salvo = localStorage.getItem(CHAVE)
    return salvo ? { ...padrao, ...JSON.parse(salvo) } : padrao
  } catch {
    return padrao
  }
}

export default function ConfiguraçõesPage() {
  const [prefs, setPrefs] = useState<Preferencias>(carregar)
  const [aviso, setAviso] = useState('')
  const [erro, setErro] = useState('')

  const salvar = (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (prefs.diasAntecedencia < 1 || prefs.diasAntecedencia > 180) {
      setErro('A antecedência deve ficar entre 1 e 180 dias.')
      return
    }
    try {
      // TODO: gravar em supabase.from('preferencias') quando houver banco
      localStorage.setItem(CHAVE, JSON.stringify(prefs))
      setAviso('Preferências salvas.')
      setTimeout(() => setAviso(''), 4000)
    } catch {
      setErro('Não foi possível salvar neste navegador.')
    }
  }

  const campo = 'w-full px-3 py-2.5 border border-grafite-claro/40 rounded-sm focus:border-dourado bg-white'
  const rotulo = 'block text-xs uppercase tracking-wider text-grafite mb-2'

  return (
    <Layout title="Configurações">
      <form onSubmit={salvar} className="max-w-2xl space-y-6" noValidate>
        {aviso && (
          <p role="status" className="p-3 bg-regularFundo border-l-2 border-regular text-regular text-sm">
            {aviso}
          </p>
        )}
        {erro && (
          <p role="alert" className="p-3 bg-criticoFundo border-l-2 border-critico text-critico text-sm">
            {erro}
          </p>
        )}

        <fieldset className="bg-white p-6 shadow-sm border-t-2 border-dourado">
          <legend className="sr-only">Perfil</legend>
          <h2 className="text-lg mb-5 flex items-center gap-2">
            <User size={18} className="text-dourado" aria-hidden="true" />
            Perfil
          </h2>
          <div className="space-y-5">
            <div>
              <label htmlFor="nome" className={rotulo}>Nome completo</label>
              <input
                id="nome"
                type="text"
                autoComplete="name"
                value={prefs.nomeCompleto}
                onChange={e => setPrefs({ ...prefs, nomeCompleto: e.target.value })}
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="email" className={rotulo}>E-mail</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={prefs.email}
                onChange={e => setPrefs({ ...prefs, email: e.target.value })}
                className={campo}
              />
            </div>
            <div>
              <span className={rotulo}>Perfil de acesso</span>
              <p className="px-3 py-2.5 bg-pergaminho border border-grafite-claro/30 rounded-sm text-grafite text-sm">
                Administrador
              </p>
            </div>
          </div>
        </fieldset>

        <fieldset className="bg-white p-6 shadow-sm border-t-2 border-dourado">
          <legend className="sr-only">Notificações</legend>
          <h2 className="text-lg mb-5 flex items-center gap-2">
            <Bell size={18} className="text-dourado" aria-hidden="true" />
            Notificações
          </h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-sm text-grafite">
              <input
                type="checkbox"
                checked={prefs.notificacoes}
                onChange={e => setPrefs({ ...prefs, notificacoes: e.target.checked })}
                className="h-4 w-4 accent-navy"
              />
              Receber notificações na plataforma
            </label>
            <label className="flex items-center gap-3 text-sm text-grafite">
              <input
                type="checkbox"
                checked={prefs.alertasEmail}
                onChange={e => setPrefs({ ...prefs, alertasEmail: e.target.checked })}
                className="h-4 w-4 accent-navy"
              />
              Receber alertas também por e-mail
            </label>
            <div className="pt-4 border-t border-navy/10">
              <label htmlFor="antecedencia" className={rotulo}>
                Antecedência dos alertas (dias)
              </label>
              <input
                id="antecedencia"
                type="number"
                inputMode="numeric"
                min={1}
                max={180}
                value={prefs.diasAntecedencia}
                onChange={e => setPrefs({ ...prefs, diasAntecedencia: Number(e.target.value) })}
                aria-describedby="ajuda-antecedencia"
                className="w-28 px-3 py-2.5 border border-grafite-claro/40 rounded-sm focus:border-dourado"
              />
              <p id="ajuda-antecedencia" className="text-xs text-grafite-claro mt-2">
                Você será avisada com esta antecedência antes de cada vencimento. Entre 1 e 180 dias.
              </p>
            </div>
          </div>
        </fieldset>

        <button
          type="submit"
          className="w-full bg-navy hover:bg-navy-700 text-white py-3 rounded-sm uppercase tracking-wider text-sm flex items-center justify-center gap-2"
        >
          <Save size={18} aria-hidden="true" />
          Salvar preferências
        </button>
      </form>
    </Layout>
  )
}
