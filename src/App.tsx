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
import LegislacaoPage from '@/pages/LegislacaoPage'
import FornecedoresPage from '@/pages/FornecedoresPage'
import FornecedorPage from '@/pages/FornecedorPage'
import ConfiguraçõesPage from '@/pages/ConfiguraçõesPage'
import EquipePage from '@/pages/EquipePage'

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
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />}
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
          path="/legislacao"
          element={isAuthenticated ? <LegislacaoPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/trilha"
          element={isAuthenticated ? <TrilhaPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/equipe"
          element={isAuthenticated ? <EquipePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/settings"
          element={isAuthenticated ? <ConfiguraçõesPage /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      </Routes>
    </HashRouter>
  )
}

export default App
