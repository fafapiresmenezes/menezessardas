import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { capturarInstalacao, registrarServiceWorker } from './lib/pwa'

// Passo D19: app instalável. O service worker e o evento de instalação são ligados antes do login, em qualquer tela.
capturarInstalacao()
registrarServiceWorker().catch(() => undefined)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
