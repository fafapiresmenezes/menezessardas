import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { sessaoDemoAtiva } from '@/lib/authDemo'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import ImovelListPage from '@/pages/ImovelListPage'
import NovoImovelPage from '@/pages/NovoImovelPage'
import ImovelDetailPage from '@/pages/ImovelDetailPage'
import ContratoPage from '@/pages/ContratoPage'
import NovoContratoPage from '@/pages/NovoContratoPage'
import VinculoPage from '@/pages/VinculoPage'
import AgendaPage from '@/pages/AgendaPage'
import AlertasPage from '@/pages/AlertasPage'
import RelatóriosPage from '@/pages/RelatóriosPage'
import IndicadoresPage from '@/pages/IndicadoresPage'
import TrilhaPage from '@/pages/TrilhaPage'
import ConsumoPage from '@/pages/ConsumoPage'
import AssistentePage from '@/pages/AssistentePage'
import PrevisoesPage from '@/pages/PrevisoesPage'
import InstitutoPage from '@/pages/InstitutoPage'
import LegislacaoPage from '@/pages/LegislacaoPage'
import FornecedoresPage from '@/pages/FornecedoresPage'
import FornecedorPage from '@/pages/FornecedorPage'
import ConfiguraçõesPage from '@/pages/ConfiguraçõesPage'
import EquipePage from '@/pages/EquipePage'
import InicioPage from '@/pages/InicioPage'
import FontesPage from '@/pages/FontesPage'
import KycPage from '@/pages/KycPage'
import MeuDiaPage from '@/pages/MeuDiaPage'
import ConsultoresPage from '@/pages/ConsultoresPage'
import NuvemPage from '@/pages/NuvemPage'
import PortalClientePage from '@/pages/PortalClientePage'
import HonorariosPage from '@/pages/HonorariosPage'
import HorasPage from '@/pages/HorasPage'
import ModelosPage from '@/pages/ModelosPage'
import MonitoramentoPage from '@/pages/MonitoramentoPage'
import MercadoPage from '@/pages/MercadoPage'
import CompliancePage from '@/pages/CompliancePage'
import ProjetosPage from '@/pages/ProjetosPage'
import IntimacoesPage from '@/pages/IntimacoesPage'

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
        setIsAuthenticated(!!data.session)
      } catch (error) {
        console.error('Auth check failed:', error)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
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
      <Routes>
        <Route path="/portal/:token" element={<PortalClientePage />} />
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
    </HashRouter>
  )
}

export default App
