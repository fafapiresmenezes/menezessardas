// Instituto THEYE · medição de campo própria (passos C10/C11 do plano I-03).
// Sem cookies e sem identificar ninguém: envia só página, LCP, INP, CLS, TTFB e se a tela é pequena.
(function () {
  if (!('PerformanceObserver' in window) || navigator.doNotTrack === '1') return;
  var URL_RPC = 'https://hlraekzvgxdpiiigdxdo.supabase.co/rest/v1/rpc/instituto_vitais';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscmFla3p2Z3hkcGlpaWdkeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODEzOTksImV4cCI6MjEwODQ1NzM5OX0.yCNPEGDb7tdf1JIY30WKUbE-xZwjQFwygJFJnvBeyrs';
  var m = {}, enviado = false, cls = 0, sessao = 0, ultimo = 0, inter = {};
  function obs(tipo, fn, extra) { try { new PerformanceObserver(function (l) { l.getEntries().forEach(fn); }).observe(Object.assign({ type: tipo, buffered: true }, extra || {})); } catch (e) {} }
  obs('largest-contentful-paint', function (e) { m.LCP = Math.round(e.startTime); });
  obs('layout-shift', function (e) {
    if (e.hadRecentInput) return;
    if (e.startTime - ultimo > 1000 || e.startTime - sessao > 5000) { sessao = e.startTime; cls = 0; }
    ultimo = e.startTime; cls += e.value; m.CLS = Math.max(m.CLS || 0, Math.round(cls * 1000) / 1000);
  });
  obs('event', function (e) {
    if (!e.interactionId) return;
    inter[e.interactionId] = Math.max(inter[e.interactionId] || 0, e.duration);
    var v = Object.keys(inter).map(function (k) { return inter[k]; }).sort(function (a, b) { return b - a; });
    m.INP = Math.round(v[Math.min(v.length - 1, Math.floor(v.length / 50))]);
  }, { durationThreshold: 16 });
  try { var nav = performance.getEntriesByType('navigation')[0]; if (nav) m.TTFB = Math.round(nav.responseStart); } catch (e) {}
  function enviar(forcar) {
    if (enviado || (!forcar && document.visibilityState !== 'hidden')) return; enviado = true;
    var p = { pagina: location.pathname.replace(/\/o\/.+/, '/o/'), movel: innerWidth < 760 };
    ['LCP', 'INP', 'CLS', 'TTFB'].forEach(function (k) { if (typeof m[k] === 'number') p[k] = m[k]; });
    try { fetch(URL_RPC, { method: 'POST', keepalive: true, headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p: p }) }); } catch (e) {}
  }
  document.addEventListener('visibilitychange', function () { enviar(false); }); addEventListener('pagehide', function () { enviar(true); });
})();
