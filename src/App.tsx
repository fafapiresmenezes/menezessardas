import { Suspense, lazy, useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { sessaoDemoAtiva } from '@/lib/authDemo'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
const ImovelListPage = lazy(() => import('@/pages/ImovelListPage'))
const NovoImovelPage = lazy(() => import('@/pages/NovoImovelPage'))
const ImovelDetailPage = lazy(() => import('@/pages/ImovelDetailPage'))
const ContratoPage = lazy(() => import('@/pages/ContratoPage'))
const NovoContratoPage = lazy(() => import('@/pages/NovoContratoPage'))
const VinculoPage = lazy(() => import('@/pages/VinculoPage'))
const AgendaPage = lazy(() => import('@/pages/AgendaPage'))
const AlertasPage = lazy(() => import('@/pages/AlertasPage'))
const RelatóriosPage = lazy(() => import('@/pages/RelatóriosPage'))
const IndicadoresPage = lazy(() => import('@/pages/IndicadoresPage'))
const TrilhaPage = lazy(() => import('@/pages/TrilhaPage'))
const ConsumoPage = lazy(() => import('@/pages/ConsumoPage'))
const AssistentePage = lazy(() => import('@/pages/AssistentePage'))
const ImportarImoveisPage = lazy(() => import('@/pages/ImportarImoveisPage'))
const PrevisoesPage = lazy(() => import('@/pages/PrevisoesPage'))
const InstitutoPage = lazy(() => import('@/pages/InstitutoPage'))
const LegislacaoPage = lazy(() => import('@/pages/LegislacaoPage'))
const FornecedoresPage = lazy(() => import('@/pages/FornecedoresPage'))
const FornecedorPage = lazy(() => import('@/pages/FornecedorPage'))
const ConfiguraçõesPage = lazy(() => import('@/pages/ConfiguraçõesPage'))
const EquipePage = lazy(() => import('@/pages/EquipePage'))
import InicioPage from '@/pages/InicioPage'
const FontesPage = lazy(() => import('@/pages/FontesPage'))
const KycPage = lazy(() => import('@/pages/KycPage'))
const MeuDiaPage = lazy(() => import('@/pages/MeuDiaPage'))
const ConsultoresPage = lazy(() => import('@/pages/ConsultoresPage'))
const NuvemPage = lazy(() => import('@/pages/NuvemPage'))
const PortalClientePage = lazy(() => import('@/pages/PortalClientePage'))
const ConviteParceiroPage = lazy(() => import('@/pages/ConviteParceiroPage'))
const HonorariosPage = lazy(() => import('@/pages/HonorariosPage'))
const HorasPage = lazy(() => import('@/pages/HorasPage'))
const ModelosPage = lazy(() => import('@/pages/ModelosPage'))
const MonitoramentoPage = lazy(() => import('@/pages/MonitoramentoPage'))
const MercadoPage = lazy(() => import('@/pages/MercadoPage'))
const CompliancePage = lazy(() => import('@/pages/CompliancePage'))
const ProjetosPage = lazy(() => import('@/pages/ProjetosPage'))
const IntimacoesPage = lazy(() => import('@/pages/IntimacoesPage'))

// Com dois fatores ativos, a sessão só libera o sistema depois do código (nível aal2).
async function segundoFatorOk() {
  try {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    return !(data?.nextLevel === 'aal2' && data.currentLevel !== 'aal2')
  } catch { return true }
}

// Passo 57: telas pesadas carregam sob demanda (React.lazy); o pacote inicial fica menor e a primeira tela abre mais rápido.
function Carregando() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]" role="status" aria-live="polite">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-dourado mx-auto mb-3" aria-hidden="true"></div>
        <p className="text-sm text-grafite">Abrindo a tela…</p>
      </div>
    </div>
  )
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!supabaseConfigurado) {
      setIsAuthenticated(sessaoDemoAtiva())
      setIsLoading(false)
      return
    }

    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        setIsAuthenticated(!!data.session && await segundoFatorOk())
      } catch (error) {
        console.error('Auth check failed:', error)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setIsAuthenticated(false); return }
      segundoFatorOk().then(ok => setIsAuthenticated(ok))
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <HashRouter>
      <Suspense fallback={<Carregando />}>
      <Routes>
        <Route path="/portal/:token" element={<PortalClientePage />} />
        <Route path="/convite/:token" element={<ConviteParceiroPage />} />
        <Route
          path="/honorarios"
          element={isAuthenticated ? <HonorariosPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/inicio" /> : <LoginPage />}
        />
        <Route
          path="/inicio"
          element={isAuthenticated ? <InicioPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/dashboard"
          element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/imoveis"
          element={isAuthenticated ? <ImovelListPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/imoveis/novo"
          element={isAuthenticated ? <NovoImovelPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/imoveis/importar"
          element={isAuthenticated ? <ImportarImoveisPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/imoveis/:id"
          element={isAuthenticated ? <ImovelDetailPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/contrato/:id"
          element={isAuthenticated ? <ContratoPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/contrato/novo"
          element={isAuthenticated ? <NovoContratoPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/contrato/vinculo/:id"
          element={isAuthenticated ? <VinculoPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/agenda"
          element={isAuthenticated ? <AgendaPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/alertas"
          element={isAuthenticated ? <AlertasPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/relatorios"
          element={isAuthenticated ? <RelatóriosPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/indicadores"
          element={isAuthenticated ? <IndicadoresPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/fornecedores"
          element={isAuthenticated ? <FornecedoresPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/fornecedor/:id"
          element={isAuthenticated ? <FornecedorPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/assistente"
          element={isAuthenticated ? <AssistentePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/previsoes"
          element={isAuthenticated ? <PrevisoesPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/instituto"
          element={isAuthenticated ? <InstitutoPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/legislacao"
          element={isAuthenticated ? <LegislacaoPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/trilha"
          element={isAuthenticated ? <TrilhaPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/intimacoes"
          element={isAuthenticated ? <IntimacoesPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/projetos"
          element={isAuthenticated ? <ProjetosPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/compliance"
          element={isAuthenticated ? <CompliancePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/mercado"
          element={isAuthenticated ? <MercadoPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/monitoramento"
          element={isAuthenticated ? <MonitoramentoPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/modelos"
          element={isAuthenticated ? <ModelosPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/horas"
          element={isAuthenticated ? <HorasPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/nuvem"
          element={isAuthenticated ? <NuvemPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/consultores"
          element={isAuthenticated ? <ConsultoresPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/meu-dia"
          element={isAuthenticated ? <MeuDiaPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/kyc"
          element={isAuthenticated ? <KycPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/fontes"
          element={isAuthenticated ? <FontesPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/consumo"
          element={isAuthenticated ? <ConsumoPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/equipe"
          element={isAuthenticated ? <EquipePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/settings"
          element={isAuthenticated ? <ConfiguraçõesPage /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/inicio" : "/login"} />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
      </Suspense>
    </HashRouter>
  )
}

export default App
