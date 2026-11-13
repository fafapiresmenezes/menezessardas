import { Suspense, lazy, useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { useIdiomaEscolhido } from '@/lib/i18n'
import LoginPage from '@/pages/LoginPage'
import BoasVindasPage from '@/pages/BoasVindasPage'
const StokasticosPage = lazy(() => import('@/pages/StokasticosPage'))
// Passo B7: as portas do Instituto que ainda estão em desenvolvimento, uma página por endereço.
// Os oito endereços estão escritos à mão aqui, e não lidos de src/data/portais-instituto.ts, de
// propósito: importar a lista no App.tsx puxaria o texto das oito páginas para o primeiro acesso.
const PortalInstitutoPage = lazy(() => import('@/pages/PortalInstitutoPage'))
const PortaisInstitutoPage = lazy(() => import('@/pages/PortaisInstitutoPage'))
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
const MeuEstiloPage = lazy(() => import('@/pages/MeuEstiloPage'))
const MeuJeitoPage = lazy(() => import('@/pages/MeuJeitoPage'))
const EquipePage = lazy(() => import('@/pages/EquipePage'))
const HierarquiaPage = lazy(() => import('@/pages/HierarquiaPage'))
import InicioPage from '@/pages/InicioPage'
import ErroTela from '@/components/ErroTela'
const FontesPage = lazy(() => import('@/pages/FontesPage'))
const KycPage = lazy(() => import('@/pages/KycPage'))
const PesquisaDiligenciaPage = lazy(() => import('@/pages/PesquisaDiligenciaPage'))
const LeituraCasoPage = lazy(() => import('@/pages/LeituraCasoPage'))
const PrazosPorCodigoPage = lazy(() => import('@/pages/PrazosPorCodigoPage'))
const AssumirProcessosPage = lazy(() => import('@/pages/AssumirProcessosPage'))
const MigracaoPage = lazy(() => import('@/pages/MigracaoPage'))
const PerfilClientePage = lazy(() => import('@/pages/PerfilClientePage'))
const ParteAdversaPage = lazy(() => import('@/pages/ParteAdversaPage'))
const BibliotecaPage = lazy(() => import('@/pages/BibliotecaPage'))
const LaboratorioAdminPage = lazy(() => import('@/pages/LaboratorioAdminPage'))
const EnquetesPage = lazy(() => import('@/pages/EnquetesPage'))
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
const AdministracaoPage = lazy(() => import('@/pages/AdministracaoPage'))
const FerramentasPage = lazy(() => import('@/pages/FerramentasPage'))
const SolucoesPage = lazy(() => import('@/pages/SolucoesPage'))
const CarteiraProcessosPage = lazy(() => import('@/pages/CarteiraProcessosPage'))
const ImportarProcessosPage = lazy(() => import('@/pages/ImportarProcessosPage'))
const FunilVendasPage = lazy(() => import('@/pages/FunilVendasPage'))
const FinanceiroPage = lazy(() => import('@/pages/FinanceiroPage'))
const EstudosPage = lazy(() => import('@/pages/EstudosPage'))
const ParametrosEscritaPage = lazy(() => import('@/pages/ParametrosEscritaPage'))

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
      // Sem Supabase configurado, ninguém entra. M (13/11/2026): "Não deixe ninguém sem senha acessar nada."
      setIsAuthenticated(false)
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
      <ProtecaoRotas>
      <Suspense fallback={<Carregando />}>
      <Routes>
        <Route path="/portal/:token" element={<PortalClientePage />} />
        <Route path="/convite/:token" element={<ConviteParceiroPage />} />
        <Route
          path="/administracao"
          element={isAuthenticated ? <AdministracaoPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/processos"
          element={isAuthenticated ? <CarteiraProcessosPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/processos/importar"
          element={isAuthenticated ? <ImportarProcessosPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/funil"
          element={isAuthenticated ? <FunilVendasPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/financeiro"
          element={isAuthenticated ? <FinanceiroPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/ferramentas"
          element={isAuthenticated ? <FerramentasPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/solucoes"
          element={isAuthenticated ? <SolucoesPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/estudos"
          element={isAuthenticated ? <EstudosPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/honorarios"
          element={isAuthenticated ? <HonorariosPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/boas-vindas"
          element={isAuthenticated ? <Navigate to="/inicio" /> : <BoasVindasPage />}
        />
        <Route path="/stokasticos" element={<StokasticosPage />} />
        <Route path="/stokasticos/biblioteca" element={<StokasticosPage />} />
        <Route path="/stokasticos/blog" element={<StokasticosPage />} />
        <Route path="/stokasticos/ciencia" element={<StokasticosPage />} />
        <Route path="/stokasticos/magia" element={<StokasticosPage />} />
        <Route path="/portais" element={<PortaisInstitutoPage />} />
        <Route path="/preditiva" element={<PortalInstitutoPage />} />
        <Route path="/geomapeamento" element={<PortalInstitutoPage />} />
        <Route path="/governo" element={<PortalInstitutoPage />} />
        <Route path="/educacao" element={<PortalInstitutoPage />} />
        <Route path="/civico" element={<PortalInstitutoPage />} />
        <Route path="/ciberseguranca" element={<PortalInstitutoPage />} />
        <Route path="/quantum" element={<PortalInstitutoPage />} />
        <Route path="/ia" element={<PortalInstitutoPage />} />
        <Route
          path="/login"
          element={<Entrada autenticado={isAuthenticated} />}
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
          path="/perfil-cliente"
          element={isAuthenticated ? <PerfilClientePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/parte-adversa"
          element={isAuthenticated ? <ParteAdversaPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/biblioteca"
          element={isAuthenticated ? <BibliotecaPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/laboratorio-admin"
          element={isAuthenticated ? <LaboratorioAdminPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/enquetes"
          element={isAuthenticated ? <EnquetesPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/fontes"
          element={isAuthenticated ? <FontesPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/pesquisa"
          element={isAuthenticated ? <PesquisaDiligenciaPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/leitura-do-caso"
          element={isAuthenticated ? <LeituraCasoPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/prazos"
          element={isAuthenticated ? <PrazosPorCodigoPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/processos-antigos"
          element={isAuthenticated ? <AssumirProcessosPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/migracao"
          element={isAuthenticated ? <MigracaoPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/consumo"
          element={isAuthenticated ? <ConsumoPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/hierarquia"
          element={isAuthenticated ? <HierarquiaPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/equipe"
          element={isAuthenticated ? <EquipePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/meu-estilo"
          element={isAuthenticated ? <MeuEstiloPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/meu-jeito"
          element={isAuthenticated ? <MeuJeitoPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/parametros-escrita"
          element={isAuthenticated ? <ParametrosEscritaPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/settings"
          element={isAuthenticated ? <ConfiguraçõesPage /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<ParaOnde autenticado={isAuthenticated} logado="/inicio" />} />
        <Route path="*" element={<ParaOnde autenticado={isAuthenticated} logado="/dashboard" substituir />} />
      </Routes>
      </Suspense>
      </ProtecaoRotas>
    </HashRouter>
  )
}

// Erro no corpo de uma tela (fora do Layout) derrubava o app inteiro: todas as telas seguintes ficavam em branco
// até recarregar. Esta proteção mostra o aviso só naquela tela e se desarma ao mudar de endereço.
/**
 * Quem entra na plataforma sem estar logado: a tela de entrada, se já escolheu o idioma; a tela de
 * idiomas, se ainda não.
 *
 * Por que isto é um componente, e não um `?:` escrito dentro do `element` da rota: o `element` é
 * montado quando o App se desenha, e o App não se desenha de novo a cada navegação — o roteador vive
 * dentro dele. Uma pergunta feita ali fica congelada na resposta da primeira vez. Era o que
 * acontecia: a pessoa escolhia a língua, a tela de idiomas falava a língua nova, mas a entrada ainda
 * achava que ninguém tinha escolhido e a mandava de volta. Ela ficava presa até recarregar a página.
 * Dentro de um componente a pergunta é feita na hora de desenhar a rota, e o hook ainda avisa quando
 * a escolha muda.
 */
function Entrada({ autenticado }: { autenticado: boolean }) {
  const idioma = useIdiomaEscolhido()
  if (autenticado) return <Navigate to="/inicio" />
  return idioma ? <LoginPage /> : <Navigate to="/boas-vindas" />
}

/** Para onde manda quem chega na raiz ou num endereço que não existe. Mesmo motivo acima. */
function ParaOnde({ autenticado, logado, substituir }: { autenticado: boolean; logado: string; substituir?: boolean }) {
  const idioma = useIdiomaEscolhido()
  const destino = autenticado ? logado : (idioma ? '/login' : '/boas-vindas')
  return <Navigate to={destino} replace={substituir} />
}

function ProtecaoRotas({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  return <ErroTela chave={pathname} topo>{children}</ErroTela>
}

export default App
