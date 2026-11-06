// Passo D19 (Diamante): service worker do app instalável.
// Guarda a casca do app e os arquivos estáticos para abrir mais rápido e funcionar sem rede na tela já vista;
// nunca guarda dados do banco (Supabase) nem funções de servidor. Mostra avisos no celular quando a página pede.
const VERSAO = 'gmenezes-v1'
const NUNCA_GUARDAR = ['supabase.co', '/functions/', 'brevo', 'api.']

self.addEventListener('install', () => { self.skipWaiting() })
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()))
})

const estatico = (url) => url.pathname.includes('/assets/') || url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com' || /\.(png|svg|webmanifest|woff2?)$/.test(url.pathname)

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (NUNCA_GUARDAR.some(p => req.url.includes(p))) return
  if (estatico(url)) {
    e.respondWith(caches.open(VERSAO).then(async (c) => {
      const guardado = await c.match(req)
      if (guardado) return guardado
      const r = await fetch(req)
      if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone())
      return r
    }))
    return
  }
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => {
      const copia = r.clone()
      caches.open(VERSAO).then(c => c.put(req, copia))
      return r
    }).catch(async () => (await caches.match(req)) || (await caches.match('./')) || Response.error()))
  }
})

self.addEventListener('message', (e) => {
  const m = e.data || {}
  if (m.tipo !== 'aviso') return
  self.registration.showNotification(m.titulo, { body: m.corpo, icon: m.icone, badge: m.icone, tag: m.chave, data: { rota: m.rota }, renotify: false })
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const rota = (e.notification.data && e.notification.data.rota) || '/inicio'
  const alvo = new URL('./#' + rota, self.registration.scope).href
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
    for (const j of janelas) { if ('focus' in j) { if (j.navigate) j.navigate(alvo); return j.focus() } }
    return self.clients.openWindow(alvo)
  }))
})
