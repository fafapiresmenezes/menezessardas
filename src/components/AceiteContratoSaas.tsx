import { useEffect, useState } from 'react'
import { FileSignature } from 'lucide-react'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { CONTRATO_SAAS_TEXTO, CONTRATO_SAAS_VERSAO, hashContratoSaas } from '@/lib/contratoSaas'

// Passo 40: administrador de escritório parceiro precisa aceitar o contrato de adesão SaaS (Value Pas) no primeiro acesso.
export default function AceiteContratoSaas({ admin, sede }: { admin: boolean; sede: boolean }) {
  const [pendente, setPendente] = useState(false)
  const [lido, setLido] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  useEffect(() => {
    if (!supabaseConfigurado || !admin || sede) { setPendente(false); return }
    supabase.rpc('contrato_saas_pendente', { p_versao: CONTRATO_SAAS_VERSAO }).then(({ data }) => setPendente(data === true), () => undefined)
  }, [admin, sede])
  if (!pendente) return null
  async function aceitar() {
    setSalvando(true); setErro('')
    const { error } = await supabase.rpc('aceitar_contrato_saas', { p_versao: CONTRATO_SAAS_VERSAO, p_hash: await hashContratoSaas(), p_navegador: navigator.userAgent })
    setSalvando(false)
    if (error) setErro('Não deu para gravar o aceite: ' + error.message)
    else setPendente(false)
  }
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="t-saas" data-testid="aceite-contrato-saas" className="fixed inset-0 z-50 flex items-center justify-center bg-navy/80 p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-grafite shadow-xl p-6 md:p-8 max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-3 mb-3">
          <FileSignature className="text-dourado-escuro" size={28} aria-hidden="true" />
          <h2 id="t-saas" className="font-serif text-2xl">Contrato de adesão (Value Pas)</h2>
        </div>
        <p className="text-sm text-grafite-claro mb-3">Como administrador do seu escritório, leia e aceite o contrato de licença da plataforma. Versão {CONTRATO_SAAS_VERSAO}. O aceite fica registrado com data, hash do texto e navegador, e vale como assinatura eletrônica.</p>
        <pre className="flex-1 overflow-auto whitespace-pre-wrap text-xs leading-relaxed border border-navy/10 bg-pergaminho/60 p-4 font-sans" tabIndex={0}>{CONTRATO_SAAS_TEXTO}</pre>
        <label className="flex items-center gap-2 mt-4 text-sm">
          <input type="checkbox" checked={lido} onChange={e => setLido(e.target.checked)} data-testid="saas-lido" className="h-5 w-5" />
          Li e aceito o contrato de adesão em nome do meu escritório.
        </label>
        {erro && <p role="alert" className="text-sm text-critico mt-2">{erro}</p>}
        <div className="flex flex-wrap gap-3 mt-4">
          <button type="button" disabled={!lido || salvando} onClick={aceitar} data-testid="aceitar-saas" className="min-h-[44px] px-5 bg-navy text-white text-sm disabled:opacity-50">{salvando ? 'Gravando…' : 'Aceitar e continuar'}</button>
          <button type="button" onClick={() => supabase.auth.signOut().then(() => window.location.assign('#/'))} className="min-h-[44px] px-5 border border-navy/30 text-sm">Não aceito (sair)</button>
        </div>
      </div>
    </div>
  )
}
