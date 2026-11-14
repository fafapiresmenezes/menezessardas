import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { capturarInstalacao, registrarServiceWorker } from './lib/pwa'
import { aplicarLetra, lerMeuJeito } from './lib/meuJeito'

// Passo D19: app instalável. O service worker e o evento de instalação são ligados antes do login, em qualquer tela.
// Meu jeito de trabalhar: o tamanho de letra escolhido vale desde a primeira tela.
aplicarLetra(lerMeuJeito().letra)
capturarInstalacao()
registrarServiceWorker().catch(() => undefined)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
