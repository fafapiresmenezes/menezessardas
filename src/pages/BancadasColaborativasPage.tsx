import { useState, FormEvent } from 'react'
import { Mail, CheckCircle, AlertCircle } from 'lucide-react'
import {
  salvarInscricaoBancada,
  AREAS_BANCADAS,
  DESCRICOES_BANCADAS,
  STATUS_BANCADAS,
  InscricaoBancada
} from '@/lib/bancadas'

export default function BancadasColaborativasPage() {
  const [activeTab, setActiveTab] = useState<'inscricao' | 'bancadas'>('bancadas')
  const [formData, setFormData] = useState<InscricaoBancada>({
    nome_completo: '',
    titulo_academico: '',
    instituicao: '',
    pais: '',
    areas_interesse: [],
    cv_linkedin: '',
    email: '',
    concorda_termos: false
  })
  const [enviando, setEnviando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAreaChange = (area: string) => {
    setFormData(prev => ({
      ...prev,
      areas_interesse: prev.areas_interesse.includes(area)
        ? prev.areas_interesse.filter(a => a !== area)
        : [...prev.areas_interesse, area]
    }))
  }

  const handleTermosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      concorda_termos: e.target.checked
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!formData.nome_completo || !formData.email || formData.areas_interesse.length === 0) {
      setMensagem({ tipo: 'erro', texto: 'Por favor, preencha todos os campos obrigatórios.' })
      return
    }

    if (!formData.concorda_termos) {
      setMensagem({ tipo: 'erro', texto: 'Você deve concordar com os termos para se inscrever.' })
      return
    }

    setEnviando(true)
    const sucesso = await salvarInscricaoBancada(formData)
    setEnviando(false)

    if (sucesso) {
      setMensagem({ tipo: 'sucesso', texto: 'Inscrição enviada com sucesso! Em breve entraremos em contato.' })
      setFormData({
        nome_completo: '',
        titulo_academico: '',
        instituicao: '',
        pais: '',
        areas_interesse: [],
        cv_linkedin: '',
        email: '',
        concorda_termos: false
      })
      setTimeout(() => setMensagem(null), 5000)
    } else {
      setMensagem({ tipo: 'erro', texto: 'Erro ao enviar inscrição. Tente novamente.' })
    }
  }

  const statusColor: Record<string, string> = {
    'aceitando': 'bg-green-100 text-green-800',
    'preparacao': 'bg-yellow-100 text-yellow-800',
    'operacao': 'bg-blue-100 text-blue-800'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-dourado to-amber-600 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Bancadas Colaborativas THEYE</h1>
          <p className="text-lg opacity-90">Participe como especialista, doutorando ou researcher</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="container mx-auto px-4 mt-8">
        <div className="flex gap-4 mb-8 border-b border-slate-300">
          <button
            onClick={() => setActiveTab('bancadas')}
            title="Ver as bancadas colaborativas em formação"
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'bancadas'
                ? 'text-dourado border-b-2 border-dourado'
                : 'text-grafite hover:text-dourado'
            }`}
          >
            Bancadas em Formação
          </button>
          <button
            onClick={() => setActiveTab('inscricao')}
            title="Abrir o formulário para se inscrever em uma bancada"
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'inscricao'
                ? 'text-dourado border-b-2 border-dourado'
                : 'text-grafite hover:text-dourado'
            }`}
          >
            Inscrever-se
          </button>
        </div>

        {/* Bancadas em Formação */}
        {activeTab === 'bancadas' && (
          <div className="space-y-6 mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {AREAS_BANCADAS.map((area) => {
                const desc = DESCRICOES_BANCADAS[area]
                const statusKey = desc.status as keyof typeof STATUS_BANCADAS
                return (
                  <div key={area} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-dourado">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xl font-semibold text-grafite">{desc.titulo}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor[desc.status]}`}>
                        {STATUS_BANCADAS[statusKey]}
                      </span>
                    </div>
                    <p className="text-grafite mb-4">{desc.descricao}</p>
                    <div className="flex items-center gap-2 text-dourado font-semibold">
                      <Mail size={18} />
                      <a href="mailto:bancadas@theye.club" title="Enviar e-mail para a equipe de bancadas" className="hover:underline">
                        bancadas@theye.club
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Formulário de Inscrição */}
        {activeTab === 'inscricao' && (
          <div className="max-w-2xl mx-auto mb-12">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-grafite mb-6">Inscrição para Bancadas</h2>

              {mensagem && (
                <div className={`mb-6 p-4 rounded-lg flex items-gap-3 ${
                  mensagem.tipo === 'sucesso'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  {mensagem.tipo === 'sucesso' ? (
                    <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
                  ) : (
                    <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                  )}
                  <p className={mensagem.tipo === 'sucesso' ? 'text-green-700' : 'text-red-700'}>
                    {mensagem.texto}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nome completo */}
                <div>
                  <label className="block text-sm font-semibold text-grafite mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    name="nome_completo"
                    value={formData.nome_completo}
                    onChange={handleInputChange}
                    title="Digite seu nome completo"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dourado"
                    required
                  />
                </div>

                {/* Título acadêmico */}
                <div>
                  <label className="block text-sm font-semibold text-grafite mb-2">
                    Título Acadêmico/Profissional
                  </label>
                  <input
                    type="text"
                    name="titulo_academico"
                    value={formData.titulo_academico}
                    onChange={handleInputChange}
                    placeholder="ex: PhD em Engenharia, Doutor em Direito"
                    title="Informe seu título acadêmico ou profissional mais recente"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dourado"
                  />
                </div>

                {/* Instituição */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-grafite mb-2">
                      Instituição
                    </label>
                    <input
                      type="text"
                      name="instituicao"
                      value={formData.instituicao}
                      onChange={handleInputChange}
                      title="Nome da universidade, empresa ou organização à qual você está vinculado"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dourado"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-grafite mb-2">
                      País
                    </label>
                    <input
                      type="text"
                      name="pais"
                      value={formData.pais}
                      onChange={handleInputChange}
                      title="País onde você mora ou trabalha"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dourado"
                    />
                  </div>
                </div>

                {/* Áreas de interesse */}
                <div>
                  <label className="block text-sm font-semibold text-grafite mb-3">
                    Áreas de Interesse * (selecione pelo menos uma)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {AREAS_BANCADAS.map((area) => (
                      <label key={area} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.areas_interesse.includes(area)}
                          onChange={() => handleAreaChange(area)}
                          title={`Marcar área de interesse: ${DESCRICOES_BANCADAS[area].titulo}`}
                          className="w-4 h-4 accent-dourado"
                        />
                        <span className="text-grafite capitalize">
                          {DESCRICOES_BANCADAS[area].titulo.split(' de ')[1] || area}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* CV/LinkedIn */}
                <div>
                  <label className="block text-sm font-semibold text-grafite mb-2">
                    CV ou LinkedIn
                  </label>
                  <input
                    type="url"
                    name="cv_linkedin"
                    value={formData.cv_linkedin}
                    onChange={handleInputChange}
                    placeholder="https://linkedin.com/in/seu-perfil"
                    title="Cole aqui o link do seu currículo Lattes ou perfil LinkedIn"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dourado"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-grafite mb-2">
                    Email de Contato *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    title="Endereço de e-mail para a equipe de bancadas entrar em contato com você"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-dourado"
                    required
                  />
                </div>

                {/* Termos */}
                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="termos"
                    checked={formData.concorda_termos}
                    onChange={handleTermosChange}
                    className="w-4 h-4 accent-dourado mt-1 flex-shrink-0"
                    required
                  />
                  <label htmlFor="termos" className="text-sm text-grafite">
                    Concordo em participar das bancadas colaborativas, assinando contratos específicos por projeto e aceitando rastreamento por smart contract para transparência total.
                  </label>
                </div>

                {/* Botão enviar */}
                <button
                  type="submit"
                  disabled={enviando}
                  title="Enviar sua inscrição para participar da bancada colaborativa"
                  className="w-full bg-gradient-to-r from-dourado to-amber-600 text-white font-semibold py-3 rounded-lg hover:from-amber-700 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {enviando ? 'Enviando...' : 'Inscrever-se'}
                </button>
              </form>

              <p className="text-center text-sm text-grafite mt-6">
                Dúvidas? Contate-nos em <a href="mailto:bancadas@theye.club" title="Enviar e-mail de dúvidas para a equipe de bancadas" className="text-dourado font-semibold hover:underline">bancadas@theye.club</a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
