// Bancada de medição da casa /geo. NÃO é parte do site: é uma página que existe só para o
// axe-core e o Lighthouse medirem as telas do geomapeamento por dentro.
//
// Por que ela existe: em 19/11/2026 as telas do Instituto passaram a exigir a tranca
// SoInstituto (pedido de M: o cliente não vê a parte do Instituto). Isso é certo, e não vamos
// afrouxar. Mas a auditoria rodava entrando em /#/geo como visitante, e passou a medir a porta
// do site em vez da casa do geo — ou seja, parou de medir o que diz medir.
//
// Esta bancada monta os MESMOS componentes, com o MESMO CSS, sem a tranca e sem login. O que ela
// mede é a casa do geo de verdade. O que ela NÃO mede é o caminho do visitante até lá, que
// depende do login: isso está dito na régua, na dimensão 3.
//
// Ela é montada por vite.auditoria.config.ts para dist-auditoria/, pasta que nunca é publicada.
import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import '../../src/index.css'
import GeolocalizacaoPage from '../../src/pages/GeolocalizacaoPage'
import NotaGeo from '../../src/pages/geo/NotaGeo'
import BibliotecaGeo from '../../src/pages/geo/BibliotecaGeo'
import PrecisaoGeo from '../../src/pages/geo/PrecisaoGeo'
import { aplicarLetra, lerMeuJeito } from '../../src/lib/meuJeito'

aplicarLetra(lerMeuJeito().letra)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/geo" element={<GeolocalizacaoPage />} />
        <Route path="/geo/nota" element={<NotaGeo />} />
        <Route path="/geo/biblioteca" element={<BibliotecaGeo />} />
        <Route path="/geo/precisao" element={<PrecisaoGeo />} />
        <Route path="*" element={<GeolocalizacaoPage />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>,
)
